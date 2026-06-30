import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { Store, BarChart3, Bell, ClipboardCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EmprendeSmart — Plataforma inteligente para emprendimientos locales" },
      { name: "description", content: "Registra actividades, visualiza indicadores clave y recibe alertas inteligentes para hacer crecer tu negocio." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">EmprendeSmart</span>
          </Link>
          <nav className="hidden gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Funciones</a>
            <a href="#how" className="hover:text-foreground">Cómo funciona</a>
            <a href="#beneficios" className="hover:text-foreground">Beneficios</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Iniciar sesión</Button></Link>
            <Link to="/auth"><Button size="sm">Comenzar gratis</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto grid items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span className="h-2 w-2 rounded-full bg-success" /> Para emprendedores locales
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Gestiona tu emprendimiento <span className="text-primary">con inteligencia</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Plataforma web que ayuda a los emprendedores a gestionar sus operaciones,
            visualizar indicadores clave y recibir recomendaciones para hacer crecer su negocio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth"><Button size="lg" className="gap-2">Empezar ahora <ArrowRight className="h-4 w-4" /></Button></Link>
            <a href="#how"><Button size="lg" variant="outline">Ver cómo funciona</Button></a>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Registro de actividades", "Indicadores automáticos", "Alertas inteligentes", "Historial completo"].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-primary/15 via-success/10 to-warning/10 blur-2xl" />
          <img src={heroImg} alt="EmprendeSmart" width={1280} height={960} className="rounded-2xl border border-border shadow-xl" />
        </div>
      </section>

      {/* Para quién */}
      <section className="border-y border-border bg-secondary/40 py-12">
        <div className="container mx-auto px-4">
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">¿Para quién es?</p>
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 text-center md:grid-cols-4">
            {["Emprendedores individuales", "Pequeños negocios", "Freelancers", "Nuevos emprendimientos"].map((t) => (
              <div key={t} className="rounded-xl border border-border bg-card p-4 text-sm font-medium">{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Todo lo que necesitas en un solo lugar</h2>
          <p className="mt-4 text-muted-foreground">Diseñado para ser simple, sin requerir conocimientos técnicos o contables avanzados.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: ClipboardCheck, title: "Registra actividades diarias", desc: "Ingresos, gastos, tareas y clientes — todo en segundos.", color: "bg-info/10 text-info" },
            { icon: BarChart3, title: "Indicadores automáticos", desc: "Visualiza la salud de tu negocio con gráficos claros y actualizados.", color: "bg-success/10 text-success" },
            { icon: Bell, title: "Alertas inteligentes", desc: "Recibe avisos cuando algo necesite tu atención antes de que sea tarde.", color: "bg-warning/10 text-warning-foreground" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-md">
              <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${f.color}`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-border bg-secondary/40 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">¿Cómo funciona?</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-5">
            {[
              "Registra tus actividades",
              "Se guarda en la plataforma",
              "El sistema procesa los datos",
              "Se muestran indicadores",
              "Tomas mejores decisiones",
            ].map((step, i) => (
              <div key={step} className="relative rounded-xl border border-border bg-card p-5 text-center">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-bold">{i + 1}</div>
                <p className="text-sm font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section id="beneficios" className="container mx-auto px-4 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Beneficios reales</h2>
            <p className="mt-4 text-muted-foreground">EmprendeSmart te permite trabajar con datos reales en lugar de intuición.</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {["Mayor control del negocio", "Mejores decisiones", "Ahorro de tiempo y dinero", "Crecimiento sostenible", "Historial centralizado", "Todo desde cualquier lugar"].map((b) => (
              <li key={b} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <CheckCircle2 className="h-5 w-5 text-success" /><span className="text-sm font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="overflow-hidden rounded-3xl bg-sidebar p-10 text-center text-sidebar-foreground md:p-16">
          <h2 className="text-3xl font-bold md:text-4xl">Empieza a tomar mejores decisiones hoy</h2>
          <p className="mx-auto mt-4 max-w-xl text-sidebar-foreground/80">Una plataforma simple, potente e inteligente, creada para impulsar el crecimiento de los emprendedores.</p>
          <div className="mt-8"><Link to="/auth"><Button size="lg" className="gap-2">Crear cuenta gratis <ArrowRight className="h-4 w-4" /></Button></Link></div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2"><Store className="h-4 w-4" /> <span>EmprendeSmart © 2026</span></div>
          <span>Plataforma inteligente para emprendimientos locales</span>
        </div>
      </footer>
    </div>
  );
}
