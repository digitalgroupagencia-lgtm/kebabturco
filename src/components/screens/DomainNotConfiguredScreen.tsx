import { Globe } from "lucide-react";

type Props = { hostname: string };

const DomainNotConfiguredScreen = ({ hostname }: Props) => (
  <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6 text-center gap-4">
    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
      <Globe className="w-8 h-8 text-primary" />
    </div>
    <h1 className="text-xl font-black text-foreground">Loja temporariamente indisponível</h1>
    <p className="text-sm text-muted-foreground max-w-xs">
      Não foi possível carregar a loja em <strong className="text-foreground">{hostname}</strong>.
      Tente actualizar a página ou contacte o suporte.
    </p>
  </div>
);

export default DomainNotConfiguredScreen;
