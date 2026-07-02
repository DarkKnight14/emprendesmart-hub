import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/actividades")({
  head: () => ({ meta: [{ title: "Actividades — EmprendeSmart" }] }),
  component: Actividades,
});

type Emp = { id: string; nombre: string };
type Act = {
  id: string;
  fecha: string;
  tipo_actividad: string;
  descripcion: string;
  monto: number;
  impacto: string;
  duracion: number | null;
  emprendimiento_id: string;
};

const TIPOS = ["ingreso", "gasto", "tarea", "cliente"] as const;

const tipoColor: Record<string, string> = {
  ingreso: "bg-success/15 text-success",
  gasto: "bg-destructive/15 text-destructive",
  tarea: "bg-info/15 text-info",
  cliente: "bg-warning/20 text-warning-foreground",
};

const EMPTY_FORM = {
  emp: "",
  tipo: "ingreso",
  fecha: format(new Date(), "yyyy-MM-dd"),
  descripcion: "",
  monto: "0",
  impacto: "medio",
  duracion: "",
};

const PAGE_SIZE = 20;

function Actividades() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Act | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [page, setPage] = useState(0);

  const { data: emprendimientos = [] } = useQuery({
    queryKey: ["emprendimientos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emprendimientos")
        .select("id, nombre")
        .order("nombre");
      if (error) throw error;
      return (data || []) as Emp[];
    },
  });

  const { data: actividades = [], isLoading } = useQuery({
    queryKey: ["actividades", filterTipo],
    queryFn: async () => {
      let q = supabase
        .from("actividades")
        .select(
          "id, fecha, tipo_actividad, descripcion, monto, impacto, duracion, emprendimiento_id"
        )
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (filterTipo !== "todos") q = q.eq("tipo_actividad", filterTipo as never);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Act[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (input: Omit<Act, "id">) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No auth");
      if (editing) {
        const { error } = await supabase
          .from("actividades")
          .update(input as never)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("actividades")
          .insert({ ...input, user_id: u.user.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Actividad actualizada" : "Actividad registrada");
      qc.invalidateQueries({ queryKey: ["actividades"] });
      qc.invalidateQueries({ queryKey: ["actividades-all"] });
      qc.invalidateQueries({ queryKey: ["actividades-alerts"] });
      qc.invalidateQueries({ queryKey: ["actividades-ind"] });
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("actividades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Eliminada");
      qc.invalidateQueries({ queryKey: ["actividades"] });
      qc.invalidateQueries({ queryKey: ["actividades-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      emp: emprendimientos[0]?.id ?? "",
    });
    setOpen(true);
  }

  function openEdit(a: Act) {
    setEditing(a);
    setForm({
      emp: a.emprendimiento_id,
      tipo: a.tipo_actividad,
      fecha: a.fecha?.slice(0, 10) ?? format(new Date(), "yyyy-MM-dd"),
      descripcion: a.descripcion,
      monto: String(a.monto ?? 0),
      impacto: a.impacto ?? "medio",
      duracion: a.duracion != null ? String(a.duracion) : "",
    });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.emp) {
      toast.error("Selecciona un emprendimiento");
      return;
    }
    saveMut.mutate({
      emprendimiento_id: form.emp,
      fecha: form.fecha,
      tipo_actividad: form.tipo as Act["tipo_actividad"],
      descripcion: form.descripcion,
      monto: Number(form.monto || 0),
      impacto: form.impacto as Act["impacto"],
      duracion: form.duracion ? Number(form.duracion) : null,
    });
  }

  // Pagination
  const paged = actividades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(actividades.length / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Actividades</h1>
          <p className="text-sm text-muted-foreground">
            Registra ingresos, gastos, tareas y clientes.
          </p>
        </div>
        <Button
          className="gap-2 self-start sm:self-auto"
          disabled={emprendimientos.length === 0}
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" /> Nueva actividad
        </Button>
      </div>

      {emprendimientos.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Primero crea un emprendimiento en la sección{" "}
            <strong>Emprendimientos</strong>.
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {["todos", ...TIPOS].map((t) => (
          <Button
            key={t}
            size="sm"
            variant={filterTipo === t ? "default" : "outline"}
            onClick={() => {
              setFilterTipo(t);
              setPage(0);
            }}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Historial{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({actividades.length} registros)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando...</p>
          ) : actividades.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Sin actividades aún.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {paged.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge
                      className={`shrink-0 ${tipoColor[a.tipo_actividad] || ""}`}
                    >
                      {a.tipo_actividad}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {a.descripcion}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.fecha), "dd MMM yyyy")} · Impacto{" "}
                        {a.impacto}
                        {a.duracion ? ` · ${a.duracion} min` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {Number(a.monto) > 0 && (
                      <span className="text-sm font-semibold">
                        $ {Number(a.monto).toLocaleString("es-CO")}
                      </span>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(a)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("¿Eliminar esta actividad?"))
                          delMut.mutate(a.id);
                      }}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal crear / editar */}
      <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar actividad" : "Registrar actividad"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Emprendimiento</Label>
              <Select
                value={form.emp}
                onValueChange={(v) => setForm((f) => ({ ...f, emp: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {emprendimientos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                    <SelectItem value="tarea">Tarea</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fecha: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                required
                maxLength={300}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto (COP)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={form.monto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, monto: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Duración (min)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Opcional"
                  value={form.duracion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duracion: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Impacto</Label>
              <Select
                value={form.impacto}
                onValueChange={(v) => setForm((f) => ({ ...f, impacto: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bajo">Bajo</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={closeModal}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={saveMut.isPending}
              >
                {saveMut.isPending
                  ? "Guardando..."
                  : editing
                    ? "Actualizar"
                    : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
