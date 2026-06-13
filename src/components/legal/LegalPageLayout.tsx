import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Shield } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { APP_NAME } from "@/lib/appMode";
import { LEGAL_NAV, LEGAL_SITE } from "@/lib/legalSite";
import { nav } from "@/lib/navPaths";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  title: string;
  description: string;
  children: ReactNode;
  highlight?: ReactNode;
};

export default function LegalPageLayout({ title, description, children, highlight }: Props) {
  const { settings } = useBranding();
  const brandName = settings?.company_name || APP_NAME;
  const logo = settings?.logo_main_url || "/icon-192.png";

  useEffect(() => {
    document.title = `${title} · ${brandName}`;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = description;
    return () => {
      document.title = brandName;
    };
  }, [title, brandName, description]);

  return (
    <div className="min-h-[100dvh] bg-secondary/40">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <img src={logo} alt="" className="h-9 w-9 rounded-lg object-contain shadow-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-foreground">{brandName}</p>
            <p className="truncate text-xs text-muted-foreground">Documentos legais</p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 h-9">
            <Link to={nav.home()}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Início
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5" />
            {LEGAL_SITE.platformName}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{description}</p>
          <p className="text-xs text-muted-foreground">
            Última actualização: {LEGAL_SITE.lastUpdated}
          </p>
        </div>

        {highlight && <div className="mb-6">{highlight}</div>}

        <Card className="border-border/80 shadow-sm">
          <div className="space-y-8 p-5 sm:p-8">{children}</div>
        </Card>

        <div className="mt-8 rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-3">Precisa de ajuda?</p>
          <p className="text-sm text-muted-foreground mb-4">
            A nossa equipa responde pedidos de suporte e privacidade em {LEGAL_SITE.responseTime}.
          </p>
          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <a href={`mailto:${LEGAL_SITE.supportEmail}`}>
              <Mail className="mr-2 h-4 w-4" />
              {LEGAL_SITE.supportEmail}
            </a>
          </Button>
        </div>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <nav
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-muted-foreground"
            aria-label="Links legais"
          >
            {LEGAL_NAV.map((item) => (
              <Link key={item.key} to={item.path} className="hover:text-primary transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {LEGAL_SITE.companyName}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
