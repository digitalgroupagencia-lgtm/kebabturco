import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { notifyStoreMarketingBroadcast } from "@/services/pushService";
import { useTenantFeatureFlags } from "@/hooks/usePlatformFeatures";
import { isFeatureAvailableForPlan } from "@/lib/platformFeatureGates";

type Props = {
  storeId: string;
  tenantId: string;
  tenantPlan?: string;
};

const MarketingBroadcastCard = ({ storeId, tenantId, tenantPlan = "starter" }: Props) => {
  const { data: flags } = useTenantFeatureFlags(tenantId);
  const pushFlag = flags?.find((f) => f.feature_key === "push_notifications");
  const pushEnabled = pushFlag?.enabled !== false && isFeatureAvailableForPlan("push_notifications", tenantPlan as any);
  const [title, setTitle] = useState("¿Qué tal un kebab hoy?");
  const [body, setBody] = useState("Pide desde la app y recíbelo en casa 🥙");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!pushEnabled) {
      toast.error("Notificações push não estão activas para este restaurante. Contacte o administrador.");
      return;
    }
    if (!title.trim() || !body.trim()) {
      toast.error("Preencha título e mensagem");
      return;
    }
    setSending(true);
    try {
      await notifyStoreMarketingBroadcast(storeId, title.trim(), body.trim());
      toast.success("Notificação enviada aos clientes com a app instalada!");
    } catch {
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Megaphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <Label className="text-base">Promoção push aos clientes</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Envia a quem tem a app e activou notificações no menu — mesmo sem pedido feito.
          </p>
          {!pushEnabled && (
            <p className="text-xs text-amber-600 mt-1">
              Função desactivada pelo administrador ou plano.
            </p>
          )}
        </div>
      </div>
      <div>
        <Label>Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      </div>
      <div>
        <Label>Mensagem</Label>
        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} maxLength={180} />
      </div>
      <Button onClick={() => void handleSend()} disabled={sending || !pushEnabled}>
        <Send className="w-4 h-4 mr-2" />
        {sending ? "A enviar…" : "Enviar agora"}
      </Button>
    </div>
  );
};

export default MarketingBroadcastCard;
