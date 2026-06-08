import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, LayoutDashboard, Store } from "lucide-react";
import { dismissBootShell } from "@/lib/bootShell";

/**
 * Página neutra do PropioApp Master SaaS.
 * Mostrada em "/" quando o host não é um custom_domain de tenant
 * e quando não há ?tenant= explícito na URL.
 */
const PropioLanding = () => {
  useEffect(() => {
    dismissBootShell();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <span className="font-black text-lg tracking-tight">PropioApp</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            to="/auth"
            className="text-sm font-bold text-muted-foreground hover:text-foreground px-3 py-2"
          >
            Entrar
          </Link>
          <Link
            to="/admin"
            className="text-sm font-bold bg-primary text-primary-foreground px-4 py-2 rounded-xl"
          >
            Painel Master
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <LayoutDashboard className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight max-w-xl">
          PropioApp — plataforma SaaS para restaurantes
        </h1>
        <p className="mt-4 text-muted-foreground max-w-md">
          Totem, painel do restaurante e gestão master. Cada restaurante tem o seu
          próprio domínio ou slug — esta é a página da plataforma.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold px-5 py-3 rounded-2xl"
          >
            <ShieldCheck className="w-4 h-4" />
            Abrir painel master
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 border border-border font-bold px-5 py-3 rounded-2xl"
          >
            Entrar
          </Link>
        </div>

        <p className="mt-10 text-xs text-muted-foreground max-w-sm">
          Procura um restaurante específico? Acede pelo domínio próprio do restaurante
          ou por <code className="font-mono">/seu-restaurante</code>.
        </p>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-muted-foreground border-t border-border">
        © PropioApp
      </footer>
    </div>
  );
};

export default PropioLanding;