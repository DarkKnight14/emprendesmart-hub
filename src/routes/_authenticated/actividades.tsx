import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/actividades")({
  head: () => ({ meta: [{ title: "Actividades — EmprendeSmart" }] }),
  component: Actividades,
});

type Emp = { id: string; nombre: string };
type Act = { id: string; fecha: string; tipo_actividad: string; descripcion: string; monto: number; impacto: string; emprendimiento_id: string };

const tipoColor: Record<string, string> = {
  ingreso: "bg-success/15 text-success",
  gasto: "bg-destructive/15 text-destructive",
  tarea: "bg-info/15 text-info",
  cliente: "bg-warning/20 text-warning-foreground",
};

function Actividades() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: emprendimientos = [] } = useQuery({
    queryKey: ["emprendimientos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("emprendimientos").select("id, nombre").order("nombre");
      if (error) throw error;
      return (data || []) as Emp[];
    },
  });

  const { data: actividades = [], isLoading } = useQuery({
    queryKey: ["actividades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("actividades")
        .select("id, fecha, tipo_actividad, descripcion, monto, impacto, emprendimiento_id")
        .order("fecha", { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []) as Act[];
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: Omit<Act, "id">) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No auth");
      const { error } = await supabase.from("actividades").insert({ ...input, user_id: u.user.id } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Actividad registrada"); qc.invalidateQueries(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("actividades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Eliminada"); qc.invalidateQueries(); },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const emprendimiento_id = String(fd.get("emp"));
    if (!emprendimiento_id) { toast.error("Selecciona un emprendimiento"); return; }
    createMut.mutate({
      emprendimiento_id,
      fecha: String(fd.get("fecha")),
      tipo_actividad: String(fd.get("tipo")),
      descripcion: String(fd.get("descripcion")),
      monto: Number(fd.get("monto") || 0),
      impacto: String(fd.get("impacto")),
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Actividades</h1>
          <p className="text-sm text-muted-foreground">Registra ingresos, gastos, tareas y clientes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={emprendimientos.length === 0}><Plus className="h-4 w-4" /> Nueva actividad</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar actividad</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label>Emprendimiento</Label>
                <Select name="emp" defaultValue={emprendimientos[0]?.id}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>{emprendimientos.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select name="tipo" defaultValue="ingreso">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingreso">Ingreso</SelectItem>
                      <SelectItem value="gasto">Gasto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fecha</Label><Input type="date" name="fecha" defaultValue={format(new Date(), "yyyy-MM-dd")} required /></div>
              </div>
              <div><Label>Descripción</Label><Textarea name="descripcion" required maxLength={300} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Monto (COP)</Label><Input type="number" name="monto" min="0" step="100" defaultValue="0" /></div>
                <div>
                  <Label>Impacto</Label>
                  <Select name="impacto" defaultValue="medio">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bajo">Bajo</SelectItem>
                      <SelectItem value="medio">Medio</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>
                {createMut.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {emprendimientos.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Primero crea un emprendimiento en la sección <strong>Emprendimientos</strong>.</CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Cargando...</p> :
           actividades.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Sin actividades aún.</p> :
            <div className="divide-y divide-border">
              {actividades.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <Badge className={tipoColor[a.tipo_actividad] || ""}>{a.tipo_actividad}</Badge>
                    <div>
                      <p className="text-sm font-medium">{a.descripcion}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.fecha), "dd MMM yyyy")} · Impacto {a.impacto}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {Number(a.monto) > 0 && <span className="font-semibold">$ {Number(a.monto).toLocaleString("es-CO")}</span>}
                    <Button size="icon" variant="ghost" onClick={() => delMut.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
