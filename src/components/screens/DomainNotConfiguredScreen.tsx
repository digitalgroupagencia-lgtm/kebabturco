import { Globe } from "lucide-react";

type Props = { hostname: string };

const DomainNotConfiguredScreen = ({ hostname }: Props) => (
  <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background px-6 text-center">
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
