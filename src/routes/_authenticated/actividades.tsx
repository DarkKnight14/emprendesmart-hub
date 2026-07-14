import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { activitiesApi, Actividad } from "@/integrations/api/activities";
import { businessApi } from "@/integrations/api/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/actividades")({
  head: () => ({ meta: [{ title: "Actividades — EmprendeSmart" }] }),
  component: Actividades,
});

const TIPOS = ["ingreso", "gasto", "tarea", "cliente"] as const;

const tipoColor: Record<string, string> = {
  ingreso: "bg-success/15 text-success",
  gasto:   "bg-destructive/15 text-destructive",
  tarea:   "bg-info/15 text-info",
  cliente: "bg-warning/20 text-warning-foreground",
};

const EMPTY_FORM = {
  emp:        "",
  tipo:       "ingreso",
  fecha:      format(new Date(), "yyyy-MM-dd"),
  descripcion:"",
  monto:      "0",
  impacto:    "medio",
  duracion:   "",
};

const PAGE_SIZE = 20;

function Actividades() {
  const qc = useQueryClient();
  const [open, setOpen]         = useState(false);
  const [editing, setEditing]   = useState<Actividad | null>(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [filterTipo, setFilterTipo] = useState("todos");
  const [page, setPage]         = useState(0);

  const { data: emprendimientos = [] } = useQuery({
    queryKey: ["emprendimientos"],
    queryFn:  () => businessApi.list(),
  });

  const { data: actividades = [], isLoading } = useQuery({
    queryKey: ["actividades", filterTipo],
    queryFn:  () => activitiesApi.list(),
  });

  const filtered = filterTipo === "todos"
    ? actividades
    : actividades.filter((a) => a.tipo_actividad === filterTipo);

  const saveMut = useMutation({
    mutationFn: (input: Omit<Actividad, "id">) =>
      editing
        ? activitiesApi.update(editing.id, input)
        : activitiesApi.create(input),
    onSuccess: () => {
      toast.success(editing ? "Actividad actualizada" : "Actividad registrada");
      qc.invalidateQueries({ queryKey: ["actividades"] });
      qc.invalidateQueries({ queryKey: ["actividades-all"] });
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => activitiesApi.remove(id),
    onSuccess: () => {
      toast.success("Eliminada");
      qc.invalidateQueries({ queryKey: ["actividades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, emp: emprendimientos[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(a: Actividad) {
    setEditing(a);
    setForm({
      emp:         a.emprendimiento_id,
      tipo:        a.tipo_actividad,
      fecha:       a.fecha?.slice(0, 10) ?? format(new Date(), "yyyy-MM-dd"),
      descripcion: a.descripcion,
      monto:       String(a.monto ?? 0),
      impacto:     a.impacto ?? "medio",
      duracion:    a.duracion != null ? String(a.duracion) : "",
    });
    setOpen(true);
  }

  function closeModal() { setOpen(false); setEditing(null); }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.emp) { toast.error("Selecciona un emprendimiento"); return; }
    saveMut.mutate({
      emprendimiento_id: form.emp,
      fecha:             form.fecha,
      tipo_actividad:    form.tipo as Actividad["tipo_actividad"],
      descripcion:       form.descripcion,
      monto:             Number(form.monto || 0),
      impacto:           form.impacto,
      duracion:          form.duracion ? Number(form.duracion) : null,
    });
  }

  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Actividades</h1>
          <p className="text-sm text-muted-foreground">Registra ingresos, gastos, tareas y clientes.</p>
        </div>
        <Button className="gap-2 self-start sm:self-auto" disabled={emprendimientos.length === 0} onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nueva actividad
        </Button>
      </div>

      {emprendimientos.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          Primero crea un emprendimiento en la sección <strong>Emprendimientos</strong>.
        </CardContent></Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {["todos", ...TIPOS].map((t) => (
          <Button key={t} size="sm" variant={filterTipo === t ? "default" : "outline"}
            onClick={() => { setFilterTipo(t); setPage(0); }} className="capitalize">
            {t}
          </Button>
        ))}
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Historial <span className="text-sm font-normal text-muted-foreground">({filtered.length} registros)</span></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Sin actividades aún.</p>
          ) : (
            <div className="divide-y divide-border">
              {paged.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge className={`shrink-0 ${tipoColor[a.tipo_actividad] || ""}`}>
                      {a.tipo_actividad}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.descripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.fecha), "dd MMM yyyy")} · {a.impacto}
                        {a.duracion ? ` · ${a.duracion} min` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {Number(a.monto) > 0 && (
                      <span className="text-sm font-semibold">$ {Number(a.monto).toLocaleString("es-CO")}</span>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(a)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => { if (confirm("¿Eliminar esta actividad?")) delMut.mutate(a.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>Página {page + 1} de {totalPages}</span>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar actividad" : "Registrar actividad"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Emprendimiento</Label>
              <Select value={form.emp} onValueChange={(v) => setForm((f) => ({ ...f, emp: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {emprendimientos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} required />
              </div>
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} required maxLength={300} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto (COP)</Label>
                <Input type="number" min="0" step="100" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))} />
              </div>
              <div>
                <Label>Duración (min)</Label>
                <Input type="number" min="0" placeholder="Opcional" value={form.duracion} onChange={(e) => setForm((f) => ({ ...f, duracion: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Impacto</Label>
              <Select value={form.impacto} onValueChange={(v) => setForm((f) => ({ ...f, impacto: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bajo">Bajo</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={saveMut.isPending}>
                {saveMut.isPending ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
