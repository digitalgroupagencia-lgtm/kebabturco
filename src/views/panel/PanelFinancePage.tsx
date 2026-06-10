import { useCallback, useEffect, useState } from "react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Wallet, CheckCircle2, Building2 } from "lucide-react";
import PanelStoreSwitcher from "@/components/panel/PanelStoreSwitcher";
import { useStaffT } from "@/hooks/useStaffT";
import {
  fetchStorePayoutIntake,
  saveStorePayoutIntake,
  type StorePayoutIntake,
} from "@/services/payoutIntakeService";

const PanelFinancePage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { t, lang } = useStaffT();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<StorePayoutIntake | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [iban, setIban] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchStorePayoutIntake(storeId);
      setSaved(row);
      if (row) {
        setBusinessName(row.business_name);
        setOwnerFullName(row.owner_full_name);
        setOwnerEmail(row.owner_email ?? "");
        setOwnerPhone(row.owner_phone ?? "");
        setTaxId(row.tax_id ?? "");
        setIban(row.iban);
        setBusinessAddress(row.business_address ?? "");
        setNotes(row.notes ?? "");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("finance.toast.load_error"));
    } finally {
      setLoading(false);
    }
  }, [storeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!storeId) return;
    if (!businessName.trim() || !ownerFullName.trim() || !iban.trim()) {
      toast.error(t("finance.toast.required"));
      return;
    }
    setSaving(true);
    try {
      await saveStorePayoutIntake({
        storeId,
        businessName: businessName.trim(),
        ownerFullName: ownerFullName.trim(),
        iban: iban.trim(),
        ownerEmail: ownerEmail.trim() || undefined,
        ownerPhone: ownerPhone.trim() || undefined,
        taxId: taxId.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(t("finance.toast.saved"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("finance.toast.save_error"));
    } finally {
      setSaving(false);
    }
  };

  if (storeLoading || loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("finance.loading")}
      </div>
    );
  }

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">{t("finance.no_store")}</div>;
  }

  const localeCode = lang === "es" ? "es-ES" : lang === "en" ? "en-US" : "pt-PT";
  const savedDate = saved ? new Date(saved.updated_at).toLocaleDateString(localeCode) : "";

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      <PanelStoreSwitcher />

      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          {t("finance.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {t("finance.subtitle")}
        </p>
      </div>

      {saved && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-green-800 dark:text-green-300">{t("finance.saved.title")}</p>
            <p className="text-muted-foreground mt-1">
              {t("finance.saved.body").replace("{date}", savedDate)}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t("finance.card.title")}
          </CardTitle>
          <CardDescription>{t("finance.card.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("finance.field.business")}</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={t("finance.field.business.ph")}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("finance.field.owner")}</Label>
            <Input
              value={ownerFullName}
              onChange={(e) => setOwnerFullName(e.target.value)}
              placeholder={t("finance.field.owner.ph")}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("finance.field.iban")}</Label>
            <Input
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="ES00 0000 0000 0000 0000 0000"
              className="mt-1 font-mono"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t("finance.field.tax")}</Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{t("finance.field.phone")}</Label>
              <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>{t("finance.field.email")}</Label>
            <Input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("finance.field.address")}</Label>
            <Textarea
              rows={2}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("finance.field.notes")}</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("finance.field.notes.ph")}
              className="mt-1"
            />
          </div>
          <Button className="w-full h-11 font-bold" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saved ? t("finance.btn.update") : t("finance.btn.send")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PanelFinancePage;
