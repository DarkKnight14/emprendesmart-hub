import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/indicadores")({
  head: () => ({ meta: [{ title: "Indicadores — EmprendeSmart" }] }),
  component: Indicadores,
});

type Act = { fecha: string; tipo_actividad: string; monto: number };

function Indicadores() {
  const { data: actividades = [] } = useQuery({
    queryKey: ["actividades-ind"],
    queryFn: async () => {
      const { data, error } = await supabase.from("actividades").select("fecha, tipo_actividad, monto");
      if (error) throw error;
      return (data || []) as Act[];
    },
  });

  const now = new Date();
  const rows: { mes: string; ingresos: number; gastos: number; ganancia: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = startOfMonth(subMonths(now, i));
    const next = startOfMonth(subMonths(m, -1));
    const arr = actividades.filter(a => { const d = parseISO(a.fecha); return d >= m && d < next; });
    const ingresos = arr.filter(a => a.tipo_actividad === "ingreso").reduce((s, a) => s + Number(a.monto), 0);
    const gastos = arr.filter(a => a.tipo_actividad === "gasto").reduce((s, a) => s + Number(a.monto), 0);
    rows.push({ mes: format(m, "MMM yy", { locale: es }), ingresos, gastos, ganancia: ingresos - gastos });
  }

  const total = rows.reduce((s, r) => ({ ingresos: s.ingresos + r.ingresos, gastos: s.gastos + r.gastos, ganancia: s.ganancia + r.ganancia }), { ingresos: 0, gastos: 0, ganancia: 0 });
  const margen = total.ingresos > 0 ? Math.round((total.ganancia / total.ingresos) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Indicadores</h1>
        <p className="text-sm text-muted-foreground">Análisis de los últimos 12 meses.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ingresos acumulados</p>
          <p className="mt-2 text-2xl font-bold">$ {total.ingresos.toLocaleString("es-CO")}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Gastos acumulados</p>
          <p className="mt-2 text-2xl font-bold">$ {total.gastos.toLocaleString("es-CO")}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Margen de ganancia</p>
          <p className="mt-2 text-2xl font-bold">{margen}%</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ingresos vs Gastos</CardTitle><CardDescription>Comparativa mensual</CardDescription></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="ingresos" fill="oklch(0.68 0.16 155)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="gastos" fill="oklch(0.6 0.22 25)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
