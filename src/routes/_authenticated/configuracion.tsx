import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({ meta: [{ title: "Configuración — EmprendeSmart" }] }),
  component: Configuracion,
});

function Configuracion() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setCorreo(data.user.email || "");
      supabase.from("profiles").select("nombre").eq("id", data.user.id).maybeSingle()
        .then(({ data: p }) => setNombre(p?.nombre || ""));
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { error } = await supabase.from("profiles").update({ nombre }).eq("id", u.user.id);
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Perfil actualizado");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">Administra tu perfil.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Perfil</CardTitle><CardDescription>Tu información personal.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div><Label>Correo</Label><Input value={correo} disabled /></div>
            <div><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} /></div>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
