import { Link } from "react-router-dom";
import { Plus, Smartphone, Globe, CreditCard, Hammer, Rocket, Palette, UtensilsCrossed, Sparkles } from "lucide-react";
import PlatformPageShell from "@/components/admin/premium/PlatformPageShell";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { nav } from "@/lib/navPaths.ts";
import { APP_NAME } from "@/lib/appMode";

type Step = { icon: typeof Plus; title: string; desc: string; link?: { to: string; label: string } };

const STANDARD_STEPS: Step[] = [
  { icon: Plus, title: "1. Criar tenant", desc: "Cadastre nome, slug e plano START/PRO.", link: { to: nav.admin("tenants", "new"), label: "Criar agora" } },
  { icon: Palette, title: "2. Configurar branding", desc: "Logo, cores, splash e identidade visual." },
  { icon: UtensilsCrossed, title: "3. Cardápio", desc: "Categorias, produtos, modificadores, fotos." },
  { icon: CreditCard, title: "4. Stripe", desc: "Conectar conta de pagamentos da loja.", link: { to: nav.admin("payments"), label: "Gateways" } },
  { icon: Globe, title: "5. Domínio / PWA", desc: "Configurar domínio próprio e ícones PWA.", link: { to: nav.admin("distribution"), label: "Distribuição" } },
];

const PREMIUM_STEPS: Step[] = [
  { icon: Plus, title: "1. Criar tenant", desc: "Plano PREMIUM com distribuição nativa.", link: { to: nav.admin("tenants", "new"), label: "Criar agora" } },
  { icon: Palette, title: "2. Branding completo", desc: "Logos adaptativos, splash, ícones iOS/Android." },
  { icon: Smartphone, title: "3. Distribuição", desc: "Definir package id Android e bundle id iOS.", link: { to: nav.admin("distribution"), label: "Configurar" } },
  { icon: Hammer, title: "4. Build Center", desc: "Registar build manual com APK/AAB ou IPA.", link: { to: nav.admin("build-center"), label: "Build Center" } },
  { icon: Rocket, title: "5. Release Center", desc: "Acompanhar publicação Play/App Store.", link: { to: nav.admin("release-center"), label: "Release Center" } },
];

function StepList({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-2">
      {steps.map((s) => (
        <div key={s.title} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <s.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{s.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
          </div>
          {s.link && (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to={s.link.to}>{s.link.label}</Link>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <PlatformPageShell width="wide">
      <AdminPageHeader
        title="Como funciona"
        description="Fluxo operacional para criar restaurantes na PropioApp — desde o cadastro até à publicação."
        breadcrumbs={[{ label: APP_NAME, to: nav.admin() }, { label: "Como funciona" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Standard · PWA</h2>
            <Badge variant="outline" className="ml-auto text-[10px]">START / PRO</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Restaurante publica como Progressive Web App em domínio próprio. Sem submissão a stores.
          </p>
          <StepList steps={STANDARD_STEPS} />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Premium · App Nativo</h2>
            <Badge variant="outline" className="ml-auto text-[10px]">PREMIUM</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            App nativo Android/iOS publicado nas stores oficiais com identidade do restaurante.
          </p>
          <StepList steps={PREMIUM_STEPS} />
        </Card>
      </div>

      <Card className="p-4 border-amber-500/30 bg-amber-500/5">
        <p className="text-sm font-semibold mb-1">Modelo Remix (legado)</p>
        <p className="text-xs text-muted-foreground">
          O fluxo antigo de remix/bootstrap por projeto Lovable separado foi descontinuado. Use sempre o
          Admin Master para criar novos restaurantes.
        </p>
      </Card>
    </PlatformPageShell>
  );
}