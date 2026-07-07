import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { notifyStoreMarketingBroadcast } from "@/services/pushService";
import { useTenantFeatureAccess } from "@/hooks/useTenantFeatureAccess";
import { normalizePlan } from "@/lib/platformFeatureGates";
import { useStaffT } from "@/hooks/useStaffT";

type Props = {
  storeId: string;
  tenantId: string;
  tenantPlan?: string;
};

const MarketingBroadcastCard = ({ storeId, tenantId, tenantPlan = "starter" }: Props) => {
  const { t } = useStaffT();
  const { isFeatureEnabled } = useTenantFeatureAccess(tenantId);
  const pushEnabled = isFeatureEnabled("push_notifications", normalizePlan(tenantPlan));
  const [title, setTitle] = useState(t("mkt.push.default_title"));
  const [body, setBody] = useState(t("mkt.push.default_body"));
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!pushEnabled) {
      toast.error(t("mkt.push.err.feature_off"));
      return;
    }
    if (!title.trim() || !body.trim()) {
      toast.error(t("mkt.push.err.empty"));
      return;
    }
    setSending(true);
    try {
      await notifyStoreMarketingBroadcast(storeId, title.trim(), body.trim());
      toast.success(t("mkt.push.toast.sent"));
    } catch {
      toast.error(t("mkt.push.toast.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Megaphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <Label className="text-base">{t("mkt.push.title")}</Label>
          <p className="text-xs text-muted-foreground mt-1">
            {t("mkt.push.hint")}
          </p>
          {!pushEnabled && (
            <p className="text-xs text-amber-600 mt-1">
              {t("mkt.push.disabled")}
            </p>
          )}
        </div>
      </div>
      <div>
        <Label>{t("mkt.push.field.title")}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      </div>
      <div>
        <Label>{t("mkt.push.field.body")}</Label>
        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} maxLength={180} />
      </div>
      <Button onClick={() => void handleSend()} disabled={sending || !pushEnabled}>
        <Send className="w-4 h-4 mr-2" />
        {sending ? t("mkt.push.btn.sending") : t("mkt.push.btn.send")}
      </Button>
    </div>
  );
};

export default MarketingBroadcastCard;
