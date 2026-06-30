import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info, Lightbulb, Bell } from "lucide-react";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => ({ meta: [{ title: "Alertas — EmprendeSmart" }] }),
  component: AlertasPage,
});

type Act = { fecha: string; tipo_actividad: string; monto: number; descripcion: string };

function AlertasPage() {
  const { data: actividades = [] } = useQuery({
    queryKey: ["actividades-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("actividades").select("fecha, tipo_actividad, monto, descripcion");
      if (error) throw error;
      return (data || []) as Act[];
    },
  });

  const now = new Date();
  const thisMonth = startOfMonth(now);
  const lastMonth = startOfMonth(subMonths(now, 1));
  const inMonth = (d: string, m: Date) => { const dt = parseISO(d); return dt >= m && dt < startOfMonth(subMonths(m, -1)); };
  const sum = (arr: Act[], t: string) => arr.filter(a => a.tipo_actividad === t).reduce((s, a) => s + Number(a.monto), 0);

  const tm = actividades.filter(a => inMonth(a.fecha, thisMonth));
  const lm = actividades.filter(a => inMonth(a.fecha, lastMonth));
  const ingresos = sum(tm, "ingreso"), gastos = sum(tm, "gasto");
  const ingresosL = sum(lm, "ingreso"), gastosL = sum(lm, "gasto");

  type A = { icon: typeof AlertTriangle; nivel: "critica" | "advertencia" | "informativa"; titulo: string; texto: string; fecha: Date };
  const alerts: A[] = [];

  if (gastos > ingresos && ingresos > 0)
    alerts.push({ icon: AlertTriangle, nivel: "critica", titulo: "Gastos superan ingresos", texto: `Este mes gastaste $ ${gastos.toLocaleString("es-CO")} pero solo ingresaste $ ${ingresos.toLocaleString("es-CO")}.`, fecha: now });
  if (gastosL > 0 && gastos > gastosL * 1.3)
    alerts.push({ icon: AlertTriangle, nivel: "advertencia", titulo: "Aumento de gastos", texto: `Tus gastos subieron ${Math.round(((gastos - gastosL) / gastosL) * 100)}% vs el mes anterior.`, fecha: now });
  if (ingresosL > 0 && ingresos > ingresosL)
    alerts.push({ icon: Info, nivel: "informativa", titulo: "Ingresos en crecimiento", texto: `Crecieron ${Math.round(((ingresos - ingresosL) / ingresosL) * 100)}% comparado con el mes anterior.`, fecha: now });
  if (ingresos === 0)
    alerts.push({ icon: Lightbulb, nivel: "advertencia", titulo: "Sin ingresos este mes", texto: "Empieza registrando tu primera venta del mes.", fecha: now });
  if (actividades.length < 5)
    alerts.push({ icon: Lightbulb, nivel: "informativa", titulo: "Recomendación", texto: "Registra al menos 5 actividades para obtener mejores indicadores y recomendaciones.", fecha: now });

  const tone = (n: A["nivel"]) =>
    n === "critica" ? "bg-destructive/10 border-destructive/30 text-destructive" :
    n === "advertencia" ? "bg-warning/15 border-warning/40 text-warning-foreground" :
    "bg-info/10 border-info/30 text-info";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alertas y recomendaciones</h1>
        <p className="text-sm text-muted-foreground">Generadas automáticamente según el comportamiento de tu negocio.</p>
      </div>

      {alerts.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Sin alertas activas</p>
          <p className="mt-1 text-sm text-muted-foreground">Todo va bien. Registra más actividades para obtener insights.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl border p-4 ${tone(a.nivel)}`}>
              <a.icon className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">{a.titulo}</p>
                <p className="text-sm opacity-90">{a.texto}</p>
                <p className="mt-1 text-xs opacity-60">{format(a.fecha, "dd MMM yyyy", { locale: es })} · {a.nivel}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
