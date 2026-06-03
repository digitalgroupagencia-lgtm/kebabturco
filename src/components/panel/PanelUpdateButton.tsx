import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

/** Botão "Atualizar agora" — limpa caches/SW e recarrega para puxar a última versão publicada. */
const PanelUpdateButton = () => {
  const [busy, setBusy] = useState(false);

  const handleUpdate = async () => {
    setBusy(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map((r) => {
            // Mantém worker de push (FCM/web push); remove apenas SWs de app-shell.
            const scriptURL = r.active?.scriptURL || "";
            if (/push-handler|firebase-messaging-sw/i.test(scriptURL)) return Promise.resolve(false);
            return r.unregister();
          }),
        );
      }
      try {
        sessionStorage.removeItem("snaporder:last-reload-build");
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.warn("[PanelUpdateButton] cleanup failed", err);
      toast({ title: "Falha ao limpar cache", description: String(err), variant: "destructive" });
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.set("_upd", String(Date.now()));
      window.location.replace(url.toString());
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleUpdate}
      disabled={busy}
      title="Recarrega o app com a última versão publicada"
      className="h-8 gap-1 px-2"
    >
      <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Atualizar agora</span>
    </Button>
  );
};

export default PanelUpdateButton;
