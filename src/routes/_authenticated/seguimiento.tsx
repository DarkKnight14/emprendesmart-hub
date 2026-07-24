import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { format, parseISO, subMonths, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Sparkles, Plus, Trash2, Target, StickyNote, TrendingUp, Lightbulb, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/seguimiento")({
  head: () => ({ meta: [{ title: "Seguimiento — EmprendeSmart" }] }),
  component: Seguimiento,
});

type Emp = { id: string; nombre: string; tipo: string };
type Act = {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  tipo_actividad: "ingreso" | "gasto" | "tarea" | "cliente";
};
type Meta = {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: "ingresos" | "gastos" | "actividades" | "personalizada";
  valor_objetivo: number;
  valor_actual: number;
  fecha_limite: string | null;
  estado: "activa" | "completada" | "cancelada";
};
type Nota = { id: string; contenido: string; created_at: string };

type Reco = {
  resumen: string;
  recomendaciones: { titulo: string; detalle: string; prioridad: "alta" | "media" | "baja" }[];
  metricas: { ingresos: number; gastos: number; margen: number; total: number };
};

const TIPO_COLOR: Record<Act["tipo_actividad"], string> = {
  ingreso: "bg-success",
  gasto: "bg-destructive",
  tarea: "bg-info",
  cliente: "bg-chart-5",
};

function Seguimiento() {
  const qc = useQueryClient();
  const [empId, setEmpId] = useState<string>("");
  const [metaOpen, setMetaOpen] = useState(false);
  const [notaText, setNotaText] = useState("");


  const [metaForm, setMetaForm] = useState({
    titulo: "",
    descripcion: "",
    tipo: "ingresos" as Meta["tipo"],
    valor_objetivo: 0,
    fecha_limite: "",
  });

  const { data: emps = [] } = useQuery({
    queryKey: ["emps-seg"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emprendimientos").select("id, nombre, tipo").order("created_at");
      if (error) throw error;
      const arr = (data || []) as Emp[];
      if (arr.length && !empId) setEmpId(arr[0].id);
      return arr;
    },
  });

  const { data: acts = [] } = useQuery({
    queryKey: ["acts-seg", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actividades")
        .select("id, fecha, descripcion, monto, tipo_actividad")
        .eq("emprendimiento_id", empId)
        .order("fecha", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Act[];
    },
  });

  const { data: metas = [] } = useQuery({
    queryKey: ["metas", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas").select("*").eq("emprendimiento_id", empId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Meta[];
    },
  });

  const { data: notas = [] } = useQuery({
    queryKey: ["notas", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas").select("id, contenido, created_at").eq("emprendimiento_id", empId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Nota[];
    },
  });

  // ---------- KPIs mensuales ----------
  const monthly = useMemo(() => {
    const buckets: Record<string, { mes: string; ingresos: number; gastos: number; margen: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      const k = format(d, "yyyy-MM");
      buckets[k] = { mes: format(d, "MMM", { locale: es }), ingresos: 0, gastos: 0, margen: 0 };
    }
    acts.forEach((a) => {
      const k = a.fecha.slice(0, 7);
      if (!buckets[k]) return;
      if (a.tipo_actividad === "ingreso") buckets[k].ingresos += Number(a.monto);
      if (a.tipo_actividad === "gasto") buckets[k].gastos += Number(a.monto);
    });
    return Object.values(buckets).map((b) => ({ ...b, margen: b.ingresos - b.gastos }));
  }, [acts]);

  const totals = useMemo(() => {
    const ingresos = acts.filter((a) => a.tipo_actividad === "ingreso").reduce((s, a) => s + Number(a.monto), 0);
    const gastos = acts.filter((a) => a.tipo_actividad === "gasto").reduce((s, a) => s + Number(a.monto), 0);
    return { ingresos, gastos, margen: ingresos - gastos, total: acts.length };
  }, [acts]);

  // ---------- Recomendaciones por reglas ----------
  const reglas = useMemo(() => {
    const out: { titulo: string; detalle: string; prioridad: "alta" | "media" | "baja" }[] = [];
    if (totals.total === 0) {
      out.push({ titulo: "Empieza a registrar actividades", detalle: "Aún no hay datos. Registra ventas y gastos para obtener análisis.", prioridad: "alta" });
      return out;
    }
    if (totals.margen < 0) {
      out.push({ titulo: "Tu margen es negativo", detalle: `Estás gastando ${(totals.gastos - totals.ingresos).toFixed(2)} más de lo que ingresas. Revisa gastos fijos.`, prioridad: "alta" });
    }
    if (totals.gastos > 0 && totals.gastos > totals.ingresos * 0.7) {
      out.push({ titulo: "Gastos altos vs ingresos", detalle: "Tus gastos superan el 70% de los ingresos. Identifica gastos prescindibles.", prioridad: "media" });
    }
    const ultMes = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    if (ultMes && prev && prev.ingresos > 0 && ultMes.ingresos < prev.ingresos * 0.8) {
      out.push({ titulo: "Caída de ingresos este mes", detalle: "Tus ingresos bajaron más de 20% respecto al mes anterior. Considera promociones o revisar canales de venta.", prioridad: "alta" });
    }
    const clientes = acts.filter((a) => a.tipo_actividad === "cliente").length;
    if (clientes < 3 && totals.total > 5) {
      out.push({ titulo: "Registra más interacciones con clientes", detalle: "Un buen seguimiento de clientes mejora ventas recurrentes.", prioridad: "media" });
    }
    if (out.length === 0) {
      out.push({ titulo: "Vas por buen camino", detalle: "Tus indicadores están saludables. Mantén el registro constante.", prioridad: "baja" });
    }
    return out;
  }, [totals, monthly, acts]);

  // ---------- Mutations ----------
  const crearMeta = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sin sesión");
      const { error } = await supabase.from("metas").insert({
        user_id: u.user.id,
        emprendimiento_id: empId,
        titulo: metaForm.titulo,
        descripcion: metaForm.descripcion || null,
        tipo: metaForm.tipo,
        valor_objetivo: metaForm.valor_objetivo,
        fecha_limite: metaForm.fecha_limite || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta creada");
      qc.invalidateQueries({ queryKey: ["metas", empId] });
      setMetaOpen(false);
      setMetaForm({ titulo: "", descripcion: "", tipo: "ingresos", valor_objetivo: 0, fecha_limite: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updMeta = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Meta> }) => {
      const { error } = await supabase.from("metas").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas", empId] }),
  });

  const delMeta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta eliminada");
      qc.invalidateQueries({ queryKey: ["metas", empId] });
    },
  });

  const crearNota = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sin sesión");
      const { error } = await supabase.from("notas").insert({
        user_id: u.user.id, emprendimiento_id: empId, contenido: notaText,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setNotaText("");
      qc.invalidateQueries({ queryKey: ["notas", empId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delNota = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notas", empId] }),
  });


  const prioColor = (p: "alta" | "media" | "baja") =>
    p === "alta" ? "destructive" : p === "media" ? "default" : "secondary";

  const empActual = emps.find((e) => e.id === empId);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      {/* Hero header */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-primary-foreground"
        style={{ backgroundImage: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <TrendingUp className="h-3.5 w-3.5" /> Panel de seguimiento
            </div>
            <h1 className="truncate text-3xl font-extrabold tracking-tight sm:text-4xl">
              {empActual?.nombre ?? "Seguimiento de empresa"}
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/80">
              Recomendaciones, evolución, metas y bitácora — todo en un solo lugar.
            </p>
          </div>
          <div className="min-w-56 rounded-xl bg-background/95 p-3 text-foreground shadow-lg backdrop-blur">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Emprendimiento
            </Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="mt-1 border-0 bg-transparent px-0 focus:ring-0">
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!empActual ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-sm text-muted-foreground">
          Crea un emprendimiento primero para empezar a hacer seguimiento.
        </CardContent></Card>
      ) : (
        <>
          {/* Métricas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Ingresos" value={`$${totals.ingresos.toFixed(2)}`} tone="success" icon={<TrendingUp className="h-4 w-4" />} />
            <KpiCard label="Gastos" value={`$${totals.gastos.toFixed(2)}`} tone="destructive" icon={<AlertTriangle className="h-4 w-4" />} />
            <KpiCard
              label="Margen"
              value={`$${totals.margen.toFixed(2)}`}
              tone={totals.margen >= 0 ? "success" : "destructive"}
              icon={<Sparkles className="h-4 w-4" />}
            />
            <KpiCard label="Actividades" value={String(totals.total)} tone="primary" icon={<Target className="h-4 w-4" />} />
          </div>

          <Tabs defaultValue="recomendaciones">
            <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 sm:grid-cols-4">
              <TabsTrigger value="recomendaciones" className="rounded-lg data-[state=active]:shadow-sm"><Lightbulb className="mr-1.5 h-4 w-4" />Recomendaciones</TabsTrigger>
              <TabsTrigger value="evolucion" className="rounded-lg data-[state=active]:shadow-sm"><TrendingUp className="mr-1.5 h-4 w-4" />Evolución</TabsTrigger>
              <TabsTrigger value="metas" className="rounded-lg data-[state=active]:shadow-sm"><Target className="mr-1.5 h-4 w-4" />Metas</TabsTrigger>
              <TabsTrigger value="bitacora" className="rounded-lg data-[state=active]:shadow-sm"><StickyNote className="mr-1.5 h-4 w-4" />Bitácora</TabsTrigger>
            </TabsList>

            {/* ---------- RECOMENDACIONES ---------- */}
            <TabsContent value="recomendaciones" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recomendaciones automáticas</CardTitle>
                  <CardDescription>Basadas en tus indicadores actuales.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reglas.map((r, i) => {
                    const tone = r.prioridad === "alta" ? "destructive" : r.prioridad === "media" ? "warning" : "muted-foreground";
                    return (
                      <div
                        key={i}
                        className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                        style={{ borderLeft: `4px solid var(--color-${tone})` }}
                      >
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-${tone}`} style={{ backgroundColor: `color-mix(in oklab, var(--color-${tone}) 15%, transparent)` }}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{r.titulo}</p>
                            <Badge variant={prioColor(r.prioridad)} className="text-[10px] capitalize">{r.prioridad}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{r.detalle}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>


            {/* ---------- EVOLUCIÓN ---------- */}
            <TabsContent value="evolucion" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">KPIs mensuales</CardTitle>
                  <CardDescription>Ingresos, gastos y margen de los últimos 6 meses.</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthly} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                      <XAxis dataKey="mes" fontSize={12} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="ingresos" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="gastos" stroke="var(--color-destructive)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="margen" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>


              <Card>
                <CardHeader><CardTitle className="text-base">Línea de tiempo de actividades</CardTitle></CardHeader>
                <CardContent>
                  {acts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin actividades registradas.</p>
                  ) : (
                    <div className="relative space-y-3 border-l pl-6">
                      {acts.slice(0, 30).map((a) => (
                        <div key={a.id} className="relative">
                          <span className={`absolute -left-[29px] top-1.5 h-3 w-3 rounded-full ring-2 ring-background ${TIPO_COLOR[a.tipo_actividad]}`} />
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium">{a.descripcion}</p>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(a.fecha), "dd MMM yyyy", { locale: es })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="capitalize text-[10px]">{a.tipo_actividad}</Badge>
                            {a.monto > 0 && <span>${Number(a.monto).toFixed(2)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---------- METAS ---------- */}
            <TabsContent value="metas" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setMetaOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Nueva meta
                </Button>
              </div>
              {metas.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Aún no has definido metas para este emprendimiento.
                </CardContent></Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {metas.map((m) => {
                    // Auto-calcula valor_actual desde actividades para ingresos/gastos/actividades
                    let actual = Number(m.valor_actual);
                    if (m.tipo === "ingresos") actual = totals.ingresos;
                    else if (m.tipo === "gastos") actual = totals.gastos;
                    else if (m.tipo === "actividades") actual = totals.total;
                    const pct = m.valor_objetivo > 0 ? Math.min(100, (actual / Number(m.valor_objetivo)) * 100) : 0;
                    return (
                      <Card key={m.id}>
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                          <div className="min-w-0">
                            <CardTitle className="text-sm">{m.titulo}</CardTitle>
                            {m.descripcion && <CardDescription className="text-xs">{m.descripcion}</CardDescription>}
                          </div>
                          <Badge variant={m.estado === "completada" ? "default" : m.estado === "cancelada" ? "secondary" : "outline"} className="text-[10px] capitalize">{m.estado}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{m.tipo}</span>
                            <span className="font-medium">{actual.toFixed(0)} / {Number(m.valor_objetivo).toFixed(0)}</span>
                          </div>
                          <Progress value={pct} />
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>{m.fecha_limite ? `Hasta ${format(parseISO(m.fecha_limite), "dd MMM yyyy", { locale: es })}` : "Sin fecha límite"}</span>
                            <div className="flex gap-1">
                              {m.estado === "activa" && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs"
                                  onClick={() => updMeta.mutate({ id: m.id, patch: { estado: "completada" } })}>
                                  Completar
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => { if (confirm("¿Eliminar meta?")) delMeta.mutate(m.id); }}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ---------- BITÁCORA ---------- */}
            <TabsContent value="bitacora" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Nueva nota</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={notaText} onChange={(e) => setNotaText(e.target.value)}
                    placeholder="Aprendizajes, decisiones, observaciones..."
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => notaText.trim() && crearNota.mutate()}
                      disabled={!notaText.trim() || crearNota.isPending}
                    >
                      Guardar nota
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {notas.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Sin notas todavía.
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {notas.map((n) => (
                    <Card key={n.id}>
                      <CardContent className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="whitespace-pre-wrap text-sm">{n.contenido}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {format(parseISO(n.created_at), "dd MMM yyyy · HH:mm", { locale: es })}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => delNota.mutate(n.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Modal nueva meta */}
      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva meta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input value={metaForm.titulo} onChange={(e) => setMetaForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Alcanzar $5.000 en ventas" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={metaForm.descripcion} onChange={(e) => setMetaForm((f) => ({ ...f, descripcion: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={metaForm.tipo} onValueChange={(v) => setMetaForm((f) => ({ ...f, tipo: v as Meta["tipo"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingresos">Ingresos</SelectItem>
                    <SelectItem value="gastos">Gastos (reducir)</SelectItem>
                    <SelectItem value="actividades">Nº actividades</SelectItem>
                    <SelectItem value="personalizada">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor objetivo</Label>
                <Input type="number" min={0} value={metaForm.valor_objetivo}
                  onChange={(e) => setMetaForm((f) => ({ ...f, valor_objetivo: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Fecha límite</Label>
              <Input type="date" value={metaForm.fecha_limite}
                onChange={(e) => setMetaForm((f) => ({ ...f, fecha_limite: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setMetaOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={!metaForm.titulo.trim() || crearMeta.isPending}
                onClick={() => crearMeta.mutate()}>
                {crearMeta.isPending ? "Creando..." : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type KpiTone = "success" | "destructive" | "primary" | "warning" | "info";
function KpiCard({
  label, value, tone, icon,
}: { label: string; value: string; tone: KpiTone; icon: React.ReactNode }) {
  return (
    <Card
      className="relative overflow-hidden border-0 transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: `var(--color-${tone})` }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p
              className="mt-1 truncate text-2xl font-extrabold tracking-tight"
              style={{ color: `var(--color-${tone})` }}
            >
              {value}
            </p>
          </div>
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{
              color: `var(--color-${tone})`,
              backgroundColor: `color-mix(in oklab, var(--color-${tone}) 14%, transparent)`,
            }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

