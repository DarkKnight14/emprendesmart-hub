import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, TrendingUp, ClipboardList, AlertTriangle, Info, Lightbulb } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, startOfMonth, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EmprendeSmart" }] }),
  component: Dashboard,
});

type Actividad = {
  id: string; fecha: string; tipo_actividad: "ingreso" | "gasto" | "tarea" | "cliente";
  monto: number; descripcion: string;
};

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const CHART_COLORS = ["oklch(0.68 0.16 155)", "oklch(0.62 0.14 240)", "oklch(0.78 0.15 75)", "oklch(0.6 0.22 25)", "oklch(0.55 0.15 300)"];

function fmt(n: number) {
  return "$ " + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function Dashboard() {
  const { data: actividades = [], isLoading } = useQuery({
    queryKey: ["actividades-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("actividades")
        .select("id, fecha, tipo_actividad, monto, descripcion")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data || []) as Actividad[];
    },
  });

  const now = new Date();
  const thisMonth = startOfMonth(now);
  const lastMonth = startOfMonth(subMonths(now, 1));

  const isInMonth = (d: string, m: Date) => {
    const dt = parseISO(d);
    return dt >= m && dt < startOfMonth(subMonths(m, -1));
  };

  const sum = (arr: Actividad[], tipo: Actividad["tipo_actividad"]) =>
    arr.filter((a) => a.tipo_actividad === tipo).reduce((s, a) => s + Number(a.monto), 0);

  const thisM = actividades.filter((a) => isInMonth(a.fecha, thisMonth));
  const lastM = actividades.filter((a) => isInMonth(a.fecha, lastMonth));

  const ingresos = sum(thisM, "ingreso");
  const gastos = sum(thisM, "gasto");
  const ganancia = ingresos - gastos;
  const total = thisM.length;

  const ingresosLast = sum(lastM, "ingreso");
  const gastosLast = sum(lastM, "gasto");
  const totalLast = lastM.length;

  const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));

  // Monthly trend (last 6 months) — ingresos
  const trend: { mes: string; ingresos: number; gastos: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = startOfMonth(subMonths(now, i));
    const arr = actividades.filter((a) => isInMonth(a.fecha, m));
    trend.push({
      mes: format(m, "MMM", { locale: es }),
      ingresos: sum(arr, "ingreso"),
      gastos: sum(arr, "gasto"),
    });
  }

  // Gastos pie — by descripción bucket (simple: top 5 descriptions)
  const gastosArr = thisM.filter((a) => a.tipo_actividad === "gasto");
  const byDesc = new Map<string, number>();
  gastosArr.forEach((g) => byDesc.set(g.descripcion, (byDesc.get(g.descripcion) || 0) + Number(g.monto)));
  const pieData = Array.from(byDesc.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Alerts
  const alerts: { icon: typeof AlertTriangle; tone: string; text: string }[] = [];
  if (gastos > gastosLast * 1.3 && gastosLast > 0)
    alerts.push({ icon: AlertTriangle, tone: "warning", text: `Tus gastos aumentaron un ${pct(gastos, gastosLast)}% este mes.` });
  if (ingresos > ingresosLast && ingresosLast > 0)
    alerts.push({ icon: Info, tone: "info", text: `¡Buen trabajo! Tus ingresos crecieron ${pct(ingresos, ingresosLast)}% vs el mes anterior.` });
  if (ingresos === 0) alerts.push({ icon: Lightbulb, tone: "warning", text: "Aún no registras ingresos este mes. Empieza registrando tu primera venta." });
  if (alerts.length === 0) alerts.push({ icon: Lightbulb, tone: "info", text: "Sigue registrando tus actividades para recibir recomendaciones inteligentes." });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu emprendimiento — {format(now, "MMMM yyyy", { locale: es })}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Ingresos Totales" value={fmt(ingresos)} delta={pct(ingresos, ingresosLast)} icon={DollarSign} tint="bg-success/10 text-success" />
        <Kpi title="Gastos Totales" value={fmt(gastos)} delta={pct(gastos, gastosLast)} invert icon={CreditCard} tint="bg-info/10 text-info" />
        <Kpi title="Ganancia Neta" value={fmt(ganancia)} delta={pct(ganancia, ingresosLast - gastosLast)} icon={TrendingUp} tint="bg-primary/10 text-primary" />
        <Kpi title="Actividades" value={String(total)} delta={total - totalLast} isCount icon={ClipboardList} tint="bg-warning/15 text-warning-foreground" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Evolución de Ingresos</CardTitle><CardDescription>Últimos 6 meses</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -10, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="ingresos" stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="gastos" stroke={CHART_COLORS[3]} strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Distribución de Gastos</CardTitle><CardDescription>Este mes</CardDescription></CardHeader>
          <CardContent className="h-72">
            {pieData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">Sin gastos registrados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader><CardTitle>Alertas y Recomendaciones</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl border border-border p-4 ${a.tone === "warning" ? "bg-warning/10" : "bg-info/10"}`}>
              <a.icon className={`h-5 w-5 shrink-0 ${a.tone === "warning" ? "text-warning-foreground" : "text-info"}`} />
              <p className="text-sm">{a.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {isLoading && <p className="text-center text-sm text-muted-foreground">Cargando...</p>}
    </div>
  );
}

function Kpi({ title, value, delta, icon: Icon, tint, invert, isCount }: {
  title: string; value: string; delta: number; icon: typeof DollarSign; tint: string; invert?: boolean; isCount?: boolean;
}) {
  const positive = invert ? delta < 0 : delta > 0;
  const arrow = delta === 0 ? "—" : delta > 0 ? "+" : "";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
            <p className={`mt-1 text-xs font-medium ${positive ? "text-success" : delta === 0 ? "text-muted-foreground" : "text-destructive"}`}>
              {arrow}{delta}{isCount ? "" : "%"} vs mes anterior
            </p>
          </div>
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${tint}`}><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}
