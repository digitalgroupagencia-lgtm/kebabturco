import { useState } from "react";
import { Loader2, MapPin, RefreshCw, Smartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useStaffT } from "@/hooks/useStaffT";
import {
  createStoreTerminalLocation,
  checkAppleTapToPayTerms,
  isTapToPayPlatform,
  verifyStoreTerminalLocation,
  warmUpTapToPayReader,
} from "@/lib/stripeTerminalService";
import {
  hasSeenTapToPayEducation,
  isTapToPayUserEnabled,
  markTapToPayEducationSeen,
  resetTapToPayLocalState,
  setTapToPayUserEnabled,
} from "@/lib/tapToPayPrefs";
import { useTapToPayWarmUp } from "@/hooks/useTapToPayWarmUp";
import TapToPayAwarenessModal from "@/components/tapToPay/TapToPayAwarenessModal";
import { fetchStoreFinancialProfile } from "@/services/orderService";
import { useQuery } from "@tanstack/react-query";

type Props = {
  storeId: string;
  compact?: boolean;
};

type BusyAction = "create" | "verify" | "terms" | null;

export default function TapToPaySettingsSection({ storeId, compact = false }: Props) {
  const { t } = useStaffT();
  const [awarenessOpen, setAwarenessOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const { status, progressMessage, errorMessage, isPreparing, isReady, hasError, refreshWarmUp } = useTapToPayWarmUp(
    storeId,
    isTapToPayPlatform() && isTapToPayUserEnabled(),
    false,
  );

  const { data: profile, refetch } = useQuery({
    queryKey: ["store-financial-profile", storeId],
    queryFn: () => fetchStoreFinancialProfile(storeId),
    enabled: !!storeId,
  });

  const locationId = profile?.stripe_terminal_location_id;
  const iosOnly = !isTapToPayPlatform();

  const handleCreateLocation = async () => {
    setBusyAction("create");
    try {
      const res = await createStoreTerminalLocation(storeId);
      await refetch();
      toast.success(
        res.created
          ? t("tapToPay.settings.location_created").replace("{id}", res.locationId)
          : t("tapToPay.settings.location_exists").replace("{id}", res.locationId),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("tapToPay.settings.location_error"));
    } finally {
      setBusyAction(null);
    }
  };

  const handleEnableFlow = () => {
    if (!isTapToPayUserEnabled()) {
      setAwarenessOpen(true);
      return;
    }
    void refreshWarmUp();
    toast.info(t("tapToPay.settings.preparing"));
  };

  const handleShowEducation = async () => {
    markTapToPayEducationSeen();
    toast.success(t("tapToPay.settings.education_done"));
  };

  const handleVerifyLocation = async () => {
    setBusyAction("verify");
    try {
      const res = await verifyStoreTerminalLocation(storeId);
      if (res.ok) {
        toast.success(
          t("tapToPay.settings.location_verified").replace("{name}", res.displayName ?? res.locationId),
        );
      } else {
        toast.error(res.error ?? t("tapToPay.settings.location_verify_fail"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("tapToPay.settings.location_verify_fail"));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckAppleTerms = async () => {
    setBusyAction("terms");
    try {
      const res = await checkAppleTapToPayTerms(storeId);
      if (res.linked) {
        toast.success(res.message);
      } else {
        toast.error(res.message, { duration: 8000 });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("tapToPay.settings.terms_check_fail"));
    } finally {
      setBusyAction(null);
    }
  };

  const statusLabel = () => {
    if (iosOnly) return t("tapToPay.settings.status_web");
    if (!locationId) return t("tapToPay.settings.status_no_location");
    if (isReady || status === "ready") return t("tapToPay.settings.status_ready");
    if (hasError) return errorMessage || t("tapToPay.settings.status_error");
    if (isPreparing) return progressMessage || t("tapToPay.settings.status_preparing");
    return t("tapToPay.settings.status_idle");
  };

  const content = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isReady ? "default" : hasError ? "destructive" : "secondary"}>{statusLabel()}</Badge>
        {locationId ? (
          <Badge variant="outline" className="font-mono text-[10px]">
            {locationId}
          </Badge>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{t("tapToPay.settings.help")}</p>

      <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm space-y-2">
        <p className="font-bold">{t("tapToPay.education.title")}</p>
        <p>{t("tapToPay.education.contactless")}</p>
        <p>{t("tapToPay.education.wallets")}</p>
        <p>{t("tapToPay.education.pin")}</p>
        {!hasSeenTapToPayEducation() ? (
          <Button size="sm" variant="outline" onClick={() => void handleShowEducation()}>
            {t("tapToPay.education.mark_done")}
          </Button>
        ) : (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            {t("tapToPay.education.completed")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={handleEnableFlow} disabled={iosOnly} className="font-bold">
          <Smartphone className="h-4 w-4 mr-2" />
          {isTapToPayUserEnabled() ? t("tapToPay.settings.prepare") : t("tapToPay.settings.enable")}
        </Button>
        <Button variant="outline" onClick={() => void handleCreateLocation()} disabled={busyAction !== null || iosOnly}>
          {busyAction === "create" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
          {t("tapToPay.settings.create_location")}
        </Button>
        <Button variant="outline" onClick={() => void handleVerifyLocation()} disabled={busyAction !== null || iosOnly}>
          {busyAction === "verify" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t("tapToPay.settings.verify_location")}
        </Button>
        <Button variant="outline" onClick={() => void handleCheckAppleTerms()} disabled={busyAction !== null || iosOnly}>
          {busyAction === "terms" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t("tapToPay.settings.check_apple_terms")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            resetTapToPayLocalState();
            setTapToPayUserEnabled(false);
            toast.info(t("tapToPay.settings.reset_local"));
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("tapToPay.settings.reset_demo")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <TapToPayAwarenessModal
        open={awarenessOpen}
        storeId={storeId}
        onOpenChange={setAwarenessOpen}
        onEnabled={() => void refreshWarmUp()}
      />

      {compact ? (
        content
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-primary" />
              {t("tapToPay.settings.title")}
            </CardTitle>
            <CardDescription>{t("tapToPay.settings.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>{content}</CardContent>
        </Card>
      )}
    </>
  );
}
