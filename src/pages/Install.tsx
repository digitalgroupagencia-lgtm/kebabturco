import { useEffect, useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Download, Share, Plus, Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const Install = () => {
  const { settings } = useBranding();
  const { canInstall, isIOS, isAndroid, isStandalone, promptInstall } = useInstallPrompt();
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    setInstalled(isStandalone);
  }, [isStandalone]);

  const logo = settings?.logo_main_url || "/icon-192.png";
  const name = settings?.company_name || "App";

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      setInstalled(true);
      toast.success("App instalado!");
    } else if (outcome === "unavailable") {
      toast.info("Use o menu do navegador para instalar.");
    }
  };

  if (installed) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 className="w-20 h-20 text-[#28A745] mb-4" />
        <h1 className="text-2xl font-black text-foreground mb-2">App instalado</h1>
        <p className="text-muted-foreground">Você já pode abrir pelo ícone na tela inicial.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background px-6 py-10 flex flex-col items-center">
      <img src={logo} alt={name} className="w-24 h-24 object-contain mb-4 drop-shadow-lg" />
      <h1 className="text-2xl font-black text-foreground text-center">Instalar {name}</h1>
      <p className="text-muted-foreground text-center mt-2 mb-8 max-w-sm">
        Tenha o app na sua tela inicial para acessar com um toque, igual a um app de loja.
      </p>

      {/* Android / Desktop com prompt nativo */}
      {(isAndroid || (!isIOS && canInstall)) && (
        <Card className="w-full max-w-sm p-6 flex flex-col items-center gap-4 shadow-lg">
          <Smartphone className="w-12 h-12 text-primary" />
          <p className="text-center text-foreground font-medium">
            Toque no botão abaixo para instalar agora.
          </p>
          <Button
            size="lg"
            className="w-full bg-[#28A745] hover:bg-[#28A745]/90 text-white text-base font-bold h-14"
            onClick={handleInstall}
            disabled={!canInstall}
          >
            <Download className="w-5 h-5 mr-2" />
            {canInstall ? "Instalar app" : "Aguardando…"}
          </Button>
          {!canInstall && (
            <p className="text-xs text-muted-foreground text-center">
              Se o botão não ativar, abra este link no Chrome.
            </p>
          )}
        </Card>
      )}

      {/* iOS, tutorial visual */}
      {isIOS && (
        <Card className="w-full max-w-sm p-6 shadow-lg">
          <p className="text-center text-foreground font-medium mb-6">
            No iPhone, instale em 3 passos:
          </p>

          <div className="space-y-5">
            <Step
              n={1}
              icon={<Share className="w-6 h-6 text-[#007AFF]" />}
              title="Toque em Compartilhar"
              desc="O ícone do quadrado com seta para cima, na barra inferior do Safari."
            />
            <Step
              n={2}
              icon={<Plus className="w-6 h-6 text-foreground" />}
              title='Escolha "Adicionar à Tela de Início"'
              desc="Role o menu para baixo se não aparecer."
            />
            <Step
              n={3}
              icon={<Check className="w-6 h-6 text-[#28A745]" />}
              title='Toque em "Adicionar"'
              desc="O ícone do app aparece na sua tela inicial."
            />
          </div>

          <div className="mt-6 p-3 rounded-lg bg-muted text-xs text-muted-foreground text-center">
            Importante: precisa estar no <strong>Safari</strong>. Chrome no iPhone não funciona.
          </div>
        </Card>
      )}

      {/* Fallback desktop sem prompt */}
      {!isIOS && !isAndroid && !canInstall && (
        <Card className="w-full max-w-sm p-6 text-center shadow-lg">
          <p className="text-foreground font-medium mb-2">Abra no seu celular</p>
          <p className="text-sm text-muted-foreground">
            Acesse este endereço pelo navegador do seu celular para instalar o app.
          </p>
        </Card>
      )}
    </div>
  );
};

const Step = ({ n, icon, title, desc }: { n: number; icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex gap-3 items-start">
    <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
      {n}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="font-semibold text-foreground text-sm">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </div>
);

export default Install;
