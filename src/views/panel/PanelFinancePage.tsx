import { useCallback, useEffect, useState } from "react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Wallet, CheckCircle2, Building2, ShieldCheck, Settings2, ChevronDown } from "lucide-react";
import PanelStoreSwitcher from "@/components/panel/PanelStoreSwitcher";
import StripeConnectEmbeddedPanel from "@/components/finance/StripeConnectEmbeddedPanel";
import { isStripeConnectReady, stripeConnectStatusLabel } from "@/lib/stripeConnectReady";
import {
  fetchStoreFinancialProfile,
  syncStripeConnectStatus,
  type StoreFinancialProfile,
} from "@/services/orderService";
import {
  fetchStorePayoutIntake,
  saveStorePayoutIntake,
  type StorePayoutIntake,
} from "@/services/payoutIntakeService";

const PanelFinancePage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<StorePayoutIntake | null>(null);

  const [profile, setProfile] = useState<StoreFinancialProfile | null>(null);
  const [embeddedMode, setEmbeddedMode] = useState<"none" | "onboarding" | "management">("none");
  const [syncing, setSyncing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

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
      const [prof, row] = await Promise.all([
        fetchStoreFinancialProfile(storeId).catch(() => null),
        fetchStorePayoutIntake(storeId).catch(() => null),
      ]);
      setProfile(prof);
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
      toast.error(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshStatus = useCallback(async () => {
    if (!storeId) return;
    setSyncing(true);
    try {
      await syncStripeConnectStatus(storeId);
      await load();
      toast.success("Estado dos recebimentos actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao actualizar");
    } finally {
      setSyncing(false);
    }
  }, [storeId, load]);

  const onEmbeddedComplete = useCallback(async () => {
    setEmbeddedMode("none");
    await refreshStatus();
  }, [refreshStatus]);

  const save = async () => {
    if (!storeId) return;
    if (!businessName.trim() || !ownerFullName.trim() || !iban.trim()) {
      toast.error("Preencha nome do negócio, titular e IBAN");
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
      toast.success("Dados guardados — a nossa equipa vai activar os recebimentos");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  if (storeLoading || loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="p-8 text-muted-foreground">
        Escolha a unidade no topo da página para configurar os recebimentos.
      </div>
    );
  }

  const ready = isStripeConnectReady(profile);
  const connectStatus = stripeConnectStatusLabel(profile);
  const connectEnv =
    (profile?.stripe_connect_environment as "live" | "test" | undefined) ?? "live";
  const testModeActive = connectEnv === "test" || Boolean(profile?.stripe_connect_test_simulated);
  // The server is the real gate: it only issues a live session when the live keys
  // are published and Stripe approved live Connect. Otherwise it falls back / errors.
  const onboardingEnv: "live" | "test" = testModeActive ? "test" : "live";

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      <PanelStoreSwitcher />

      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Recebimentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Ligue a sua conta diretamente à Stripe para receber os pagamentos online dos pedidos. O cliente paga o
          total; a taxa da plataforma sai do repasse.
        </p>
      </div>

      {ready && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-green-800 dark:text-green-300">
              {testModeActive ? "Recebimentos em modo teste" : "Recebimentos online activos"}
            </p>
            <p className="text-muted-foreground mt-1">
              {testModeActive
                ? "Conta de teste ligada — pode validar o checkout sem dinheiro real."
                : "A sua conta está ligada à Stripe. Os pagamentos dos pedidos chegam à sua conta bancária."}
            </p>
          </div>
        </div>
      )}

      {!ready && embeddedMode === "none" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Ligar a minha conta
            </CardTitle>
            <CardDescription>
              Preencha os seus dados no formulário seguro da Stripe. A Stripe trata da verificação e da conta
              bancária — nós não guardamos os dados sensíveis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full h-12 font-black text-base" onClick={() => setEmbeddedMode("onboarding")}>
              {onboardingEnv === "live" ? "Ligar a minha conta à Stripe" : "Activar recebimentos (modo teste)"}
            </Button>
            {connectStatus === "pending" && (
              <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                Já começou a ligação — faltam dados. Carregue no botão para concluir.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {embeddedMode === "onboarding" && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-sm">Ligar conta à Stripe</p>
            <Button variant="ghost" size="sm" onClick={() => setEmbeddedMode("none")}>
              Fechar
            </Button>
          </div>
          <StripeConnectEmbeddedPanel
            storeId={storeId}
            variant="onboarding"
            connectEnvironment={onboardingEnv}
            productionBlocked={testModeActive}
            onComplete={onEmbeddedComplete}
            onTestProvisioned={(msg) => toast.success(msg)}
          />
        </div>
      )}

      {(ready || profile?.stripe_connect_account_id) && embeddedMode !== "management" && (
        <Button
          variant="outline"
          className="w-full h-11 font-bold gap-2"
          onClick={() => setEmbeddedMode("management")}
        >
          <Settings2 className="h-4 w-4" />
          Gerir conta bancária e repasses
        </Button>
      )}

      {embeddedMode === "management" && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-sm">Conta bancária e repasses</p>
            <Button variant="ghost" size="sm" onClick={() => setEmbeddedMode("none")}>
              Fechar
            </Button>
          </div>
          <StripeConnectEmbeddedPanel
            storeId={storeId}
            variant="management"
            connectEnvironment={connectEnv}
            productionBlocked={testModeActive}
            onComplete={onEmbeddedComplete}
          />
        </div>
      )}

      {(ready || profile?.stripe_connect_account_id) && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={refreshStatus}
          disabled={syncing}
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Actualizar estado dos recebimentos
        </Button>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${manualOpen ? "rotate-180" : ""}`} />
          Prefiro enviar os meus dados à equipa (alternativa)
        </button>
      </div>

      {manualOpen && (
        <>
          {saved && (
            <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-green-800 dark:text-green-300">Dados enviados</p>
                <p className="text-muted-foreground mt-1">
                  Recebemos a sua informação em{" "}
                  {new Date(saved.updated_at).toLocaleDateString("pt-PT")}. A equipa regista na Stripe e activa os
                  recebimentos.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Dados bancários (alternativa)
              </CardTitle>
              <CardDescription>
                Use os dados exactos da conta onde quer receber o dinheiro dos pedidos online.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do negócio / empresa</Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex.: Kebab Turco Gandia S.L."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Nome completo do titular</Label>
                <Input
                  value={ownerFullName}
                  onChange={(e) => setOwnerFullName(e.target.value)}
                  placeholder="Como aparece no banco"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>IBAN</Label>
                <Input
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  className="mt-1 font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>NIF / CIF</Label>
                  <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>E-mail de contacto</Label>
                <Input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Morada do negócio</Label>
                <Textarea
                  rows={2}
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma informação extra para a nossa equipa"
                  className="mt-1"
                />
              </div>
              <Button className="w-full h-11 font-bold" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {saved ? "Actualizar dados" : "Enviar dados"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PanelFinancePage;
