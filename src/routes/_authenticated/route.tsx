import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { authApi, AuthUser } from "@/integrations/api/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, User, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/integrations/api/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await authApi.getUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
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

// Minimal alerta mapping from backend
function mapAlerta(a: Record<string, unknown>): Alerta {
  return {
    id:      String(a.id),
    mensaje: String(a.mensaje || a.message || ''),
    nivel:   (a.nivel || 'informativa') as Alerta['nivel'],
    fecha:   String(a.fecha || a.createdAt),
    leida:   Boolean(a.leida),
  };
}

function AuthLayout() {
  const { user } = Route.useRouteContext() as { user: AuthUser };
  const navigate = useNavigate();
  const qc = useQueryClient();

  const nombre = user.name || user.email?.split("@")[0] || "Emprendedor";

  // Alertas desde el backend (tabla alertas del primer negocio)
  const { data: alertas = [] } = useQuery({
    queryKey: ["alertas-header"],
    queryFn: async () => {
      try {
        // Obtener primer negocio del usuario
        const businesses = await api.get<{ id: string }[]>('/business');
        if (!businesses.length) return [];
        const bId = businesses[0].id;
        const data = await api.get<Record<string, unknown>[]>(`/business/${bId}/alertas`).catch(() => []);
        return data.map(mapAlerta).slice(0, 10);
      } catch {
        return [];
      }
    },
    refetchInterval: 30_000,
  });

  const unread = alertas.filter((a) => !a.leida).length;

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    authApi.logout();
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
                  <button
                    className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                    aria-label="Notificaciones"
                  >
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
                      <div className="p-6 text-center text-sm text-muted-foreground">No tienes notificaciones.</div>
                    ) : (
                      alertas.map((a) => (
                        <div key={a.id} className={`flex gap-3 border-b p-3 ${a.leida ? "opacity-60" : ""}`}>
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${nivelColor(a.nivel)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{a.mensaje}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {format(parseISO(a.fecha), "dd MMM yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
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

              <div className="hidden text-sm sm:block">
                Hola, <span className="font-semibold">{nombre}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid h-9 w-9 place-items-center rounded-full bg-primary-gradient text-sm font-semibold text-primary-foreground shadow-md transition-transform duration-200 hover:scale-110">
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
