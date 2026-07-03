import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, User, LogOut, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

type Alerta = {
  id: string;
  mensaje: string;
  nivel: "informativa" | "advertencia" | "critica";
  fecha: string;
  leida: boolean;
};

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const [nombre, setNombre] = useState<string>("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    supabase.from("profiles").select("nombre").eq("id", user.id).maybeSingle()
      .then(({ data }) => setNombre(data?.nombre || user.email?.split("@")[0] || "Emprendedor"));
  }, [user]);

  const { data: alertas = [] } = useQuery({
    queryKey: ["alertas-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select("id, mensaje, nivel, fecha, leida")
        .order("fecha", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as Alerta[];
    },
    refetchOnWindowFocus: true,
  });

  const unread = alertas.filter((a) => !a.leida).length;

  const markReadMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alertas")
        .update({ leida: true } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alertas-db"] }),
  });

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nivelColor = (n: Alerta["nivel"]) =>
    n === "critica" ? "bg-destructive" : n === "advertencia" ? "bg-warning" : "bg-info";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium text-muted-foreground">EmprendeSmart</span>
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary" aria-label="Notificaciones">
                    <Bell className="h-4 w-4" />
                    {unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                        {unread}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between border-b p-3">
                    <span className="text-sm font-semibold">Notificaciones</span>
                    {unread > 0 && <span className="text-xs text-muted-foreground">{unread} sin leer</span>}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {alertas.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No tienes notificaciones.
                      </div>
                    ) : (
                      alertas.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => !a.leida && markReadMut.mutate(a.id)}
                          className={`flex w-full gap-3 border-b p-3 text-left transition-colors hover:bg-accent ${a.leida ? "opacity-60" : ""}`}
                        >
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${nivelColor(a.nivel)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{a.mensaje}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {format(parseISO(a.fecha), "dd MMM yyyy", { locale: es })}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="border-t p-2">
                    <Button asChild variant="ghost" size="sm" className="w-full">
                      <Link to="/alertas">Ver todas las alertas</Link>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="hidden text-sm sm:block">Hola, <span className="font-semibold">{nombre}</span></div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90" aria-label="Menú de perfil">
                    {nombre.charAt(0).toUpperCase() || "U"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{nombre}</span>
                      <span className="text-xs font-normal text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/configuracion" className="flex cursor-pointer items-center gap-2">
                      <User className="h-4 w-4" /> Ver perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/configuracion" className="flex cursor-pointer items-center gap-2">
                      <Settings className="h-4 w-4" /> Configuración
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
