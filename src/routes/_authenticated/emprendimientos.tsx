import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Store as StoreIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/emprendimientos")({
  head: () => ({ meta: [{ title: "Emprendimientos — EmprendeSmart" }] }),
  component: Emprendimientos,
});

type Emp = { id: string; nombre: string; tipo: string; estado: string; fecha_inicio: string };

function Emprendimientos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["emprendimientos-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("emprendimientos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Emp[];
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: Omit<Emp, "id">) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No auth");
      const { error } = await supabase.from("emprendimientos").insert({ ...input, user_id: u.user.id } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Emprendimiento creado"); qc.invalidateQueries(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emprendimientos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries(); },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMut.mutate({
      nombre: String(fd.get("nombre")),
      tipo: String(fd.get("tipo")),
      estado: String(fd.get("estado")),
      fecha_inicio: String(fd.get("fecha_inicio")),
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emprendimientos</h1>
          <p className="text-sm text-muted-foreground">Gestiona los negocios que estás administrando.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nuevo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo emprendimiento</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div><Label>Nombre</Label><Input name="nombre" required maxLength={120} /></div>
              <div><Label>Tipo</Label><Input name="tipo" defaultValue="Tienda local" required maxLength={80} /></div>
              <div><Label>Fecha de inicio</Label><Input type="date" name="fecha_inicio" defaultValue={format(new Date(), "yyyy-MM-dd")} required /></div>
              <div>
                <Label>Estado</Label>
                <Select name="estado" defaultValue="activo">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>
                {createMut.isPending ? "Guardando..." : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> :
       data.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <StoreIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Aún no tienes emprendimientos</p>
          <p className="mt-1 text-sm text-muted-foreground">Crea tu primer emprendimiento para empezar a registrar actividades.</p>
        </CardContent></Card>
       ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map(e => (
            <Card key={e.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{e.nombre}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{e.tipo}</p>
                </div>
                <Badge variant={e.estado === "activo" ? "default" : "secondary"}>{e.estado}</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Inicio: {format(new Date(e.fecha_inicio), "dd MMM yyyy")}</p>
                <Button size="icon" variant="ghost" onClick={() => delMut.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
       )}
    </div>
  );
}
