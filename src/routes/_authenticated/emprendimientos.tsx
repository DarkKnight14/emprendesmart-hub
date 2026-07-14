import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { businessApi, Emprendimiento } from "@/integrations/api/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Store as StoreIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/emprendimientos")({
  head: () => ({ meta: [{ title: "Emprendimientos — EmprendeSmart" }] }),
  component: Emprendimientos,
});

const EMPTY_FORM = {
  nombre:      "",
  tipo:        "Tienda local",
  estado:      "activo",
  fecha_inicio: format(new Date(), "yyyy-MM-dd"),
};

const ESTADO_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  activo:  "default",
  pausado: "secondary",
  cerrado: "destructive",
};

function Emprendimientos() {
  const qc = useQueryClient();
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<Emprendimiento | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);

  const { data = [], isLoading } = useQuery({
    queryKey: ["emprendimientos-full"],
    queryFn:  () => businessApi.list(),
  });

  const saveMut = useMutation({
    mutationFn: (input: Omit<Emprendimiento, "id" | "createdAt">) =>
      editing
        ? businessApi.update(editing.id, input)
        : businessApi.create(input),
    onSuccess: () => {
      toast.success(editing ? "Emprendimiento actualizado" : "Emprendimiento creado");
      qc.invalidateQueries({ queryKey: ["emprendimientos-full"] });
      qc.invalidateQueries({ queryKey: ["emprendimientos"] });
      qc.invalidateQueries({ queryKey: ["emprendimientos-dashboard"] });
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => businessApi.remove(id),
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["emprendimientos-full"] });
      qc.invalidateQueries({ queryKey: ["emprendimientos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setOpen(true); }

  function openEdit(e: Emprendimiento) {
    setEditing(e);
    setForm({
      nombre:       e.nombre,
      tipo:         e.tipo,
      estado:       e.estado,
      fecha_inicio: e.fecha_inicio?.slice(0, 10) ?? format(new Date(), "yyyy-MM-dd"),
    });
    setOpen(true);
  }

  function closeModal() { setOpen(false); setEditing(null); }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    saveMut.mutate(form);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emprendimientos</h1>
          <p className="text-sm text-muted-foreground">Gestiona los negocios que estás administrando.</p>
        </div>
        <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <StoreIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Aún no tienes emprendimientos</p>
            <p className="mt-1 text-sm text-muted-foreground">Crea tu primer emprendimiento para registrar actividades.</p>
            <Button className="mt-4" onClick={openCreate}>Crear ahora</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <Card key={e.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">{e.nombre}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{e.tipo}</p>
                </div>
                <Badge variant={ESTADO_BADGE[e.estado] ?? "secondary"}>{e.estado}</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Inicio: {format(new Date(e.fecha_inicio), "dd MMM yyyy")}
                </p>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost"
                    onClick={() => { if (confirm("¿Eliminar este emprendimiento y todas sus actividades?")) delMut.mutate(e.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar emprendimiento" : "Nuevo emprendimiento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} required maxLength={120} placeholder="Mi Negocio" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Input value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} maxLength={80} placeholder="Tienda local, Restaurante..." />
            </div>
            <div>
              <Label>Fecha de inicio</Label>
              <Input type="date" value={form.fecha_inicio} onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))} required />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={saveMut.isPending}>
                {saveMut.isPending ? "Guardando..." : editing ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
