import { useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { isAdminPreviewMode } from "@/lib/tenantPreview";

const TEXT: Record<string, { install: string; iosTitle: string; s1: string; s2: string; s3: string; close: string }> = {
  pt: { install: "Instalar app", iosTitle: "Instalar no iPhone", s1: "Toque em Compartilhar", s2: "Toque em 'Adicionar à Tela de Início'", s3: "Toque em 'Adicionar'", close: "Fechar" },
  en: { install: "Install app", iosTitle: "Install on iPhone", s1: "Tap Share", s2: "Tap 'Add to Home Screen'", s3: "Tap 'Add'", close: "Close" },
  es: { install: "Instalar app", iosTitle: "Instalar en iPhone", s1: "Toca Compartir", s2: "Toca 'Añadir a pantalla de inicio'", s3: "Toca 'Añadir'", close: "Cerrar" },
  fr: { install: "Installer l'app", iosTitle: "Installer sur iPhone", s1: "Touchez Partager", s2: "Touchez 'Sur l'écran d'accueil'", s3: "Touchez 'Ajouter'", close: "Fermer" },
};

interface Props {
  lang?: string;
}

const InstallAppButton = ({ lang = "es" }: Props) => {
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const [showIOS, setShowIOS] = useState(false);
  const t = TEXT[lang] || TEXT.es;

  if (isAdminPreviewMode()) return null;
  if (isStandalone) return null;
  if (!canInstall && !isIOS) return null;

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOS(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-2 w-full max-w-md mx-auto px-5 py-3 rounded-2xl bg-success text-success-foreground font-bold text-sm shadow-[0_8px_24px_-8px_hsl(var(--success)/0.5)] active:scale-[0.97] transition-transform touch-action-manipulation"
      >
        <Download className="w-4 h-4" strokeWidth={2.5} />
        {t.install}
      </button>

      {showIOS && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowIOS(false)}
        >
          <div
            className="bg-card rounded-3xl shadow-2xl w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIOS(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
              aria-label={t.close}
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-black text-foreground mb-5 pr-10">{t.iosTitle}</h2>
            <div className="space-y-4">
              <Step n={1} icon={<Share className="w-5 h-5 text-primary" />} text={t.s1} />
              <Step n={2} icon={<Plus className="w-5 h-5 text-primary" />} text={t.s2} />
              <Step n={3} icon={<Download className="w-5 h-5 text-primary" />} text={t.s3} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Step = ({ n, icon, text }: { n: number; icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center shrink-0">
      {n}
    </div>
    <div className="flex-1 flex items-center gap-2">
      <span className="text-sm text-foreground">{text}</span>
      <span className="ml-auto">{icon}</span>
    </div>
  </div>
);

export default InstallAppButton;
