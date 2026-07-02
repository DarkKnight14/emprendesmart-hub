import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Info,
  Lightbulb,
  Bell,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => ({
    meta: [{ title: "Alertas — EmprendeSmart" }],
  }),
  component: AlertasPage,
});

type Alerta = {
  id: string;
  tipo: string;
  mensaje: string;
  nivel: "informativa" | "advertencia" | "critica";
  fecha: string;
  leida: boolean;
  emprendimiento_id: string;
};

type Act = {
  fecha: string;
  tipo_actividad: string;
  monto: number;
  descripcion: string;
  emprendimiento_id: string;
};

const NIVEL_CONFIG = {
  informativa: {
    icon: Info,
    bg: "bg-info/10 border-info/30",
    text: "text-info",
    badge: "bg-info/15 text-info",
    label: "Informativa",
  },
  advertencia: {
    icon: AlertTriangle,
    bg: "bg-warning/15 border-warning/40",
    text: "text-warning-foreground",
    badge: "bg-warning/20 text-warning-foreground",
    label: "Advertencia",
  },
  critica: {
    icon: AlertTriangle,
    bg: "bg-destructive/10 border-destructive/30",
    text: "text-destructive",
    badge: "bg-destructive/15 text-destructive",
    label: "Crítica",
  },
};

function AlertasPage() {
  const qc = useQueryClient();

  // Load existing alerts from DB
  const { data: alertasDB = [], isLoading } = useQuery({
    queryKey: ["alertas-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as Alerta[];
    },
  });

  // Load actividades to generate new alerts client-side if DB is empty
  const { data: actividades = [] } = useQuery({
    queryKey: ["actividades-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actividades")
        .select("fecha, tipo_actividad, monto, descripcion, emprendimiento_id");
      if (error) throw error;
      return (data || []) as Act[];
    },
  });

  // Mark single alert as read
  const markReadMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alertas")
        .update({ leida: true } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alertas-db"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mark all as read
  const markAllReadMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No auth");
      const { error } = await supabase
        .from("alertas")
        .update({ leida: true } as never)
        .eq("user_id", u.user.id)
        .eq("leida", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Todas las alertas marcadas como leídas");
      qc.invalidateQueries({ queryKey: ["alertas-db"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Generate + persist new alerts from actividades (runs when user clicks "Actualizar")
  const generateMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No auth");

      const now = new Date();
      const thisMonth = startOfMonth(now);
      const lastMonth = startOfMonth(subMonths(now, 1));
      const inMonth = (d: string, m: Date) => {
        const dt = parseISO(d);
        return dt >= m && dt < startOfMonth(subMonths(m, -1));
      };
      const sum = (arr: Act[], t: string) =>
        arr.filter((a) => a.tipo_actividad === t).reduce((s, a) => s + Number(a.monto), 0);

      const tm = actividades.filter((a) => inMonth(a.fecha, thisMonth));
      const lm = actividades.filter((a) => inMonth(a.fecha, lastMonth));

      const ingresos = sum(tm, "ingreso");
      const gastos = sum(tm, "gasto");
      const ingresosL = sum(lm, "ingreso");
      const gastosL = sum(lm, "gasto");

      // Get emprendimientos to assign alerts
      const { data: emps } = await supabase
        .from("emprendimientos")
        .select("id")
        .eq("user_id", u.user.id)
        .limit(1);
      const empId = emps?.[0]?.id;
      if (!empId) return;

      type NewAlerta = {
        tipo: string;
        mensaje: string;
        nivel: "informativa" | "advertencia" | "critica";
        emprendimiento_id: string;
        user_id: string;
      };
      const newAlerts: NewAlerta[] = [];

      if (gastos > ingresos && ingresos > 0)
        newAlerts.push({
          tipo: "gastos_superiores",
          mensaje: `Este mes gastaste $ ${gastos.toLocaleString("es-CO")} pero solo ingresaste $ ${ingresos.toLocaleString("es-CO")}. Revisa tus costos.`,
          nivel: "critica",
          emprendimiento_id: empId,
          user_id: u.user.id,
        });

      if (gastosL > 0 && gastos > gastosL * 1.3)
        newAlerts.push({
          tipo: "aumento_gastos",
          mensaje: `Tus gastos aumentaron un ${Math.round(((gastos - gastosL) / gastosL) * 100)}% vs el mes anterior.`,
          nivel: "advertencia",
          emprendimiento_id: empId,
          user_id: u.user.id,
        });

      if (ingresosL > 0 && ingresos > ingresosL)
        newAlerts.push({
          tipo: "ingresos_crecimiento",
          mensaje: `¡Buen trabajo! Tus ingresos crecieron ${Math.round(((ingresos - ingresosL) / ingresosL) * 100)}% comparado con el mes anterior.`,
          nivel: "informativa",
          emprendimiento_id: empId,
          user_id: u.user.id,
        });

      if (ingresos === 0)
        newAlerts.push({
          tipo: "sin_ingresos",
          mensaje: "Aún no registras ingresos este mes. Empieza registrando tu primera venta.",
          nivel: "advertencia",
          emprendimiento_id: empId,
          user_id: u.user.id,
        });

      if (actividades.length < 5)
        newAlerts.push({
          tipo: "recomendacion_actividades",
          mensaje: "Registra al menos 5 actividades para obtener mejores indicadores y recomendaciones.",
          nivel: "informativa",
          emprendimiento_id: empId,
          user_id: u.user.id,
        });

      if (newAlerts.length === 0) return;

      // Delete today's auto-generated alerts, then insert new ones
      const today = now.toISOString().slice(0, 10);
      await supabase
        .from("alertas")
        .delete()
        .eq("user_id", u.user.id)
        .gte("fecha", today);

      if (newAlerts.length > 0) {
        const { error } = await supabase
          .from("alertas")
          .insert(newAlerts as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Alertas actualizadas");
      qc.invalidateQueries({ queryKey: ["alertas-db"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unread = alertasDB.filter((a) => !a.leida).length;

  const tone = (nivel: Alerta["nivel"]) =>
    NIVEL_CONFIG[nivel] ?? NIVEL_CONFIG.informativa;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            Alertas y recomendaciones
            {unread > 0 && (
              <span className="rounded-full bg-destructive px-2.5 py-0.5 text-sm font-bold text-destructive-foreground">
                {unread}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Generadas automáticamente según el comportamiento de tu negocio.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${generateMut.isPending ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          {unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => markAllReadMut.mutate()}
              disabled={markAllReadMut.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Marcar leídas
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : alertasDB.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sin alertas aún</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pulsa "Actualizar" para generar alertas basadas en tus actividades.
            </p>
            <Button
              className="mt-4"
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
            >
              Generar alertas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alertasDB.map((a) => {
            const cfg = tone(a.nivel);
            const Icon = cfg.icon;
            return (
              <div
                key={a.id}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-opacity ${cfg.bg} ${a.leida ? "opacity-50" : ""}`}
              >
                <div className={`shrink-0 rounded-lg p-2 ${cfg.badge}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(a.fecha), "dd MMM yyyy", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm">{a.mensaje}</p>
                </div>
                {!a.leida && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    title="Marcar como leída"
                    onClick={() => markReadMut.mutate(a.id)}
                    disabled={markReadMut.isPending}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
