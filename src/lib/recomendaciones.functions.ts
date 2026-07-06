import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = { emprendimientoId: string };

export const generarRecomendacionesIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data?.emprendimientoId) throw new Error("emprendimientoId requerido");
    return data;
  })
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta LOVABLE_API_KEY");

    const { supabase, userId } = context;

    const { data: emp } = await supabase
      .from("emprendimientos")
      .select("nombre, tipo, estado, fecha_inicio")
      .eq("id", data.emprendimientoId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp) throw new Error("Emprendimiento no encontrado");

    const { data: acts } = await supabase
      .from("actividades")
      .select("tipo_actividad, monto, descripcion, fecha, impacto")
      .eq("emprendimiento_id", data.emprendimientoId)
      .order("fecha", { ascending: false })
      .limit(80);

    const actividades = acts ?? [];
    const ingresos = actividades
      .filter((a) => a.tipo_actividad === "ingreso")
      .reduce((s, a) => s + Number(a.monto || 0), 0);
    const gastos = actividades
      .filter((a) => a.tipo_actividad === "gasto")
      .reduce((s, a) => s + Number(a.monto || 0), 0);
    const margen = ingresos - gastos;

    const resumen = {
      nombre: emp.nombre,
      tipo: emp.tipo,
      estado: emp.estado,
      total_actividades: actividades.length,
      ingresos_totales: ingresos,
      gastos_totales: gastos,
      margen,
      ultimas: actividades.slice(0, 20).map((a) => ({
        tipo: a.tipo_actividad,
        monto: Number(a.monto),
        desc: a.descripcion,
        fecha: a.fecha,
      })),
    };

    const prompt = `Eres un asesor experto en pequeños negocios. Analiza los datos de este emprendimiento y entrega entre 3 y 5 recomendaciones concretas, breves y accionables en español. Cada recomendación debe ser específica a los datos observados (no genérica). Responde ÚNICAMENTE con un JSON válido con esta forma:
{"resumen": "1-2 frases", "recomendaciones": [{"titulo": "...", "detalle": "...", "prioridad": "alta|media|baja"}]}

Datos del emprendimiento:
${JSON.stringify(resumen, null, 2)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Devuelves solo JSON válido, sin markdown ni texto adicional." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Límite de uso de IA alcanzado. Intenta más tarde.");
    if (res.status === 402) throw new Error("Se agotaron los créditos de IA de tu cuenta.");
    if (!res.ok) throw new Error(`Error IA (${res.status})`);

    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return { ok: true as const, ...parsed, metricas: { ingresos, gastos, margen, total: actividades.length } };
    } catch {
      return {
        ok: true as const,
        resumen: raw.slice(0, 300),
        recomendaciones: [],
        metricas: { ingresos, gastos, margen, total: actividades.length },
      };
    }
  });
