import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Iniciar sesión — EmprendeSmart" }, { name: "description", content: "Accede a EmprendeSmart o crea tu cuenta gratis." }] }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
const signUpSchema = signInSchema.extend({
  nombre: z.string().trim().min(2, "Tu nombre").max(80),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"tabs" | "forgot">("tabs");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("¡Bienvenido!");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({ nombre: fd.get("nombre"), email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { nombre: parsed.data.nombre } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cuenta creada. ¡Bienvenido!");
    navigate({ to: "/dashboard" });
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const parsed = z.string().email("Correo inválido").safeParse(email);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Te enviamos un correo con las instrucciones.");
    setMode("tabs");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 text-sidebar-foreground/90 hover:text-sidebar-foreground">
          <ArrowLeft className="h-4 w-4" /> <span className="text-sm">Volver al inicio</span>
        </Link>
        <div>
          <div className="mb-6 flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground"><Store className="h-5 w-5" /></div>
            <span className="text-xl font-bold">EmprendeSmart</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight">Toma mejores decisiones con datos reales.</h2>
          <p className="mt-4 max-w-md text-sidebar-foreground/70">
            Gestiona tus actividades, visualiza tus indicadores y recibe alertas que te ayudan a crecer.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© 2026 EmprendeSmart</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Accede a tu cuenta</CardTitle>
            <CardDescription>Inicia sesión o crea una cuenta gratis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div><Label htmlFor="si-email">Correo</Label><Input id="si-email" name="email" type="email" required /></div>
                  <div><Label htmlFor="si-pw">Contraseña</Label><Input id="si-pw" name="password" type="password" required /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div><Label htmlFor="su-name">Nombre</Label><Input id="su-name" name="nombre" required /></div>
                  <div><Label htmlFor="su-email">Correo</Label><Input id="su-email" name="email" type="email" required /></div>
                  <div><Label htmlFor="su-pw">Contraseña</Label><Input id="su-pw" name="password" type="password" minLength={6} required /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creando..." : "Crear cuenta"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
