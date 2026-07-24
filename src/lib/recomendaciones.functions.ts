import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const actSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  descripcion: z.string(),
  monto: z.number(),
  tipo_actividad: z.enum(["ingreso", "gasto", "tarea", "cliente"]),
});

const schema = z.object({
  emprendimientoId: z.string(),
  acts: z.array(actSchema),
});

export const generarRecomendacionesIA = createServerFn({ method: "POST" })
  .validator(schema)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Falta LOVABLE_API_KEY. Contacta al administrador.");

    const { acts } = data;

    const ingresos = acts.filter((a) => a.tipo_actividad === "ingreso").reduce((s, a) => s + Number(a.monto), 0);
    const gastos = acts.filter((a) => a.tipo_actividad === "gasto").reduce((s, a) => s + Number(a.monto), 0);
    const margen = ingresos - gastos;
    const total = acts.length;

    const prompt = `Eres un asesor financiero experto para emprendedores latinoamericanos.

Analiza los siguientes datos del negocio y genera recomendaciones concretas:

MÉTRICAS:
- Ingresos totales: $${ingresos.toLocaleString("es-CO")}
- Gastos totales: $${gastos.toLocaleString("es-CO")}
- Margen neto: $${margen.toLocaleString("es-CO")}
- Total de actividades: ${total}

ÚLTIMAS ACTIVIDADES (hasta 20):
${JSON.stringify(
  acts.slice(0, 20).map((a) => ({
    fecha: a.fecha,
    tipo: a.tipo_actividad,
    monto: a.monto,
    descripcion: a.descripcion,
  })),
  null,
  2
)}

Responde ÚNICAMENTE con este JSON exacto (sin markdown, sin texto adicional):
{
  "resumen": "Resumen del estado del negocio en 2-3 oraciones directas",
  "recomendaciones": [
    {
      "titulo": "Título corto y accionable",
      "detalle": "Explicación práctica y específica en máximo 2 oraciones",
      "prioridad": "alta"
    }
  ]
}

Genera entre 3 y 5 recomendaciones. Prioridad puede ser: "alta", "media" o "baja".`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (res.status === 429) throw new Error("Límite de solicitudes alcanzado. Intenta en unos minutos.");
      if (res.status === 402) throw new Error("Créditos de IA agotados. Recarga tu workspace.");
      throw new Error(`Error IA: ${res.status} — ${err}`);
    }

    const completion = await res.json();
    const text: string = completion.choices?.[0]?.message?.content ?? "";

    let parsed: {
      resumen: string;
      recomendaciones: { titulo: string; detalle: string; prioridad: "alta" | "media" | "baja" }[];
    };

    try {
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      throw new Error("Error procesando la respuesta de IA. Intenta de nuevo.");
    }

    return {
      resumen: parsed.resumen ?? "",
      recomendaciones: parsed.recomendaciones ?? [],
      metricas: { ingresos, gastos, margen, total },
    };
  });
