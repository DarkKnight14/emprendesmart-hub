import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const [nombre, setNombre] = useState<string>("");

  useEffect(() => {
    supabase.from("profiles").select("nombre").eq("id", user.id).maybeSingle()
      .then(({ data }) => setNombre(data?.nombre || user.email?.split("@")[0] || "Emprendedor"));
  }, [user]);

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
              <button className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary">
                <Bell className="h-4 w-4" />
              </button>
              <div className="hidden text-sm sm:block">Hola, <span className="font-semibold">{nombre}</span></div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {nombre.charAt(0).toUpperCase()}
              </div>
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
