import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { activitiesApi, type Actividad } from "@/integrations/api/activities";
import { businessApi, type Emprendimiento } from "@/integrations/api/business";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, CreditCard, TrendingUp, ClipboardList, AlertTriangle, Info, Lightbulb, Store } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, startOfMonth, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EmprendeSmart" }] }),
  component: Dashboard,
});

const CHART_COLORS = ["oklch(0.68 0.16 155)", "oklch(0.62 0.14 240)", "oklch(0.78 0.15 75)", "oklch(0.6 0.22 25)", "oklch(0.55 0.15 300)"];

function fmt(n: number) {
  return "$ " + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");

  const { data: emprendimientos = [], isLoading: empsLoading } = useQuery<Emprendimiento[], Error>({
    queryKey: ["emprendimientos-dashboard"],
    queryFn: () => businessApi.list(),
  });

  useEffect(() => {
    if (!selectedEmpId && emprendimientos.length > 0) {
      setSelectedEmpId(emprendimientos[0].id);
    }
  }, [emprendimientos, selectedEmpId]);

  const activeEmpId = selectedEmpId || emprendimientos[0]?.id || "";

  const { data: actividades = [], isLoading: actLoading } = useQuery<Actividad[], Error>({
    queryKey: ["actividades-all", activeEmpId],
    queryFn: () => activitiesApi.list(activeEmpId),
    enabled: !!activeEmpId,
  });

  const isLoading = empsLoading || actLoading;
  const now = new Date();
  const thisMonth = startOfMonth(now);
  const lastMonth = startOfMonth(subMonths(now, 1));

  const isInMonth = (d: string, m: Date) => {
    const dt = parseISO(d);
    return dt >= m && dt < startOfMonth(subMonths(m, -1));
  };

  const sum = (arr: Actividad[], tipo: string) =>
    arr.filter((a) => a.tipo_actividad === tipo).reduce((s, a) => s + Number(a.monto), 0);

  const thisM = actividades.filter((a) => isInMonth(a.fecha, thisMonth));
  const lastM = actividades.filter((a) => isInMonth(a.fecha, lastMonth));

  const ingresos    = sum(thisM, "ingreso");
  const gastos      = sum(thisM, "gasto");
  const ganancia    = ingresos - gastos;
  const total       = thisM.length;
  const ingresosLast = sum(lastM, "ingreso");
  const gastosLast   = sum(lastM, "gasto");
  const totalLast    = lastM.length;

  const pct = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);

  // Tendencia 6 meses
  const trend: Array<{ mes: string; ingresos: number; gastos: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const m = startOfMonth(subMonths(now, i));
    const arr = actividades.filter((a) => isInMonth(a.fecha, m));
    trend.push({ mes: format(m, "MMM", { locale: es }), ingresos: sum(arr, "ingreso"), gastos: sum(arr, "gasto") });
  }

  // Pie por descripción (top 5)
  const gastosArr = thisM.filter((a) => a.tipo_actividad === "gasto");
  const byDesc = new Map<string, number>();
  gastosArr.forEach((g) => byDesc.set(g.descripcion, (byDesc.get(g.descripcion) || 0) + Number(g.monto)));
  const pieData = Array.from(byDesc.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

  // Alertas dinámicas
  const alerts: { icon: typeof AlertTriangle; tone: string; text: string }[] = [];
  if (gastos > gastosLast * 1.3 && gastosLast > 0)
    alerts.push({ icon: AlertTriangle, tone: "warning", text: `Tus gastos aumentaron un ${pct(gastos, gastosLast)}% este mes.` });
  if (ingresos > ingresosLast && ingresosLast > 0)
    alerts.push({ icon: Info, tone: "info", text: `¡Buen trabajo! Tus ingresos crecieron ${pct(ingresos, ingresosLast)}% vs el mes anterior.` });
  if (ingresos === 0)
    alerts.push({ icon: Lightbulb, tone: "warning", text: "Aún no registras ingresos este mes. ¡Registra tu primera venta!" });
  if (alerts.length === 0)
    alerts.push({ icon: Lightbulb, tone: "info", text: "Sigue registrando actividades para recibir recomendaciones." });

  if (!empsLoading && emprendimientos.length === 0) {
    return (
      <div className="mx-auto max-w-md mt-20 text-center space-y-4">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted">
          <Store className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">¡Bienvenido a EmprendeSmart!</h2>
        <p className="text-sm text-muted-foreground">Crea tu primer emprendimiento para ver datos en el dashboard.</p>
        <Link
          to="/emprendimientos"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Crear mi primer emprendimiento
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de tu emprendimiento — {format(now, "MMMM yyyy", { locale: es })}
          </p>
        </div>
        {emprendimientos.length > 1 && (
          <Select value={activeEmpId} onValueChange={setSelectedEmpId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecciona negocio" />
            </SelectTrigger>
            <SelectContent>
              {emprendimientos.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          <Kpi title="Ingresos Totales"  value={fmt(ingresos)}  delta={pct(ingresos, ingresosLast)}           icon={DollarSign}   tint="bg-success/10 text-success" />
          <Kpi title="Gastos Totales"    value={fmt(gastos)}    delta={pct(gastos, gastosLast)} invert         icon={CreditCard}   tint="bg-info/10 text-info" />
          <Kpi title="Ganancia Neta"     value={fmt(ganancia)}  delta={pct(ganancia, ingresosLast - gastosLast)} icon={TrendingUp} tint="bg-primary/10 text-primary" />
          <Kpi title="Actividades"       value={String(total)}  delta={total - totalLast} isCount              icon={ClipboardList} tint="bg-warning/15 text-warning-foreground" />
        </div>

      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Evolución de Ingresos</CardTitle><CardDescription>Últimos 6 meses</CardDescription></CardHeader>
          <CardContent className="h-72">
            {isLoading ? <Skeleton className="h-full w-full rounded-lg" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="ingresos" stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ r: 4 }} name="Ingresos" />
                  <Line type="monotone" dataKey="gastos"   stroke={CHART_COLORS[3]} strokeWidth={2} strokeDasharray="4 4" dot={false} name="Gastos" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Distribución de Gastos</CardTitle><CardDescription>Este mes</CardDescription></CardHeader>
          <CardContent className="h-72">
            {isLoading ? <Skeleton className="h-full w-full rounded-lg" /> : pieData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">Sin gastos registrados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <Card>
        <CardHeader><CardTitle>Alertas y Recomendaciones</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 stagger-children">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl border border-border p-4 card-interactive ${a.tone === "warning" ? "bg-warning/10" : "bg-info/10"}`}>
              <a.icon className={`h-5 w-5 shrink-0 ${a.tone === "warning" ? "text-warning-foreground" : "text-info"}`} />
              <p className="text-sm">{a.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}

function Kpi({ title, value, delta, icon: Icon, tint, invert, isCount }: {
  title: string; value: string; delta: number; icon: typeof DollarSign;
  tint: string; invert?: boolean; isCount?: boolean;
}) {
  const positive = invert ? delta < 0 : delta > 0;
  const arrow = delta === 0 ? "—" : delta > 0 ? "+" : "";
  return (
    <Card className="card-interactive overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
            <p className={`mt-1 text-xs font-medium ${positive ? "text-success" : delta === 0 ? "text-muted-foreground" : "text-destructive"}`}>
              {arrow}{delta}{isCount ? "" : "%"} vs mes anterior
            </p>
          </div>
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${tint} transition-transform duration-300 hover:scale-110 hover:rotate-3`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

