import { useCallback, useEffect, useState } from "react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Wallet, CheckCircle2, Building2, TrendingUp, AlertTriangle, CreditCard, Receipt } from "lucide-react";
import PanelStoreSwitcher from "@/components/panel/PanelStoreSwitcher";
import {
  fetchStorePayoutIntake,
  saveStorePayoutIntake,
  type StorePayoutIntake,
} from "@/services/payoutIntakeService";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { PremiumActionButton } from "@/components/premium/PremiumActionButton";
import { PremiumStatusBadge } from "@/components/premium/PremiumStatusBadge";

const PanelFinancePage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
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
      toast.error(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-[#050505] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-5">
      <PanelStoreSwitcher />

      <PremiumPageHeader
        title="Recebimentos"
        subtitle="Configure conta bancária e acompanhe repasses"
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PremiumMetricCard title="Receita bruta" value="€ 2.450,00" subtitle="hoje" icon={Wallet} color="green" />
        <PremiumMetricCard title="Receita líquida" value="€ 2.129,50" subtitle="após taxas" icon={TrendingUp} color="brand" />
        <PremiumMetricCard title="Taxas" value="€ 320,50" subtitle="custos operacionais" icon={CreditCard} color="orange" />
        <PremiumMetricCard title="Pendências" value={saved ? "0" : "1"} subtitle="dados a validar" icon={AlertTriangle} color="red" />
      </section>

      {saved && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-green-800 dark:text-green-300">Dados enviados</p>
            <p className="text-muted-foreground mt-1">
              Recebemos a sua informação em{" "}
              {new Date(saved.updated_at).toLocaleDateString("pt-PT")}. A equipa SnapOrder regista na Stripe e
              activa os recebimentos — não precisa fazer mais nada por agora.
            </p>
          </div>
        </div>
      )}

      <PremiumCard
        title="Dados bancários"
        subtitle="Use os dados exatos da conta onde quer receber os repasses"
        className="bg-[#111111]"
        action={<PremiumStatusBadge status={saved ? "success" : "warning"}>{saved ? "Configurado" : "Pendente"}</PremiumStatusBadge>}
      >
        <div className="space-y-4">
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

          <PremiumActionButton className="w-full" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saved ? "Atualizar dados" : "Enviar dados"}
          </PremiumActionButton>
        </div>
      </PremiumCard>

      <PremiumCard title="Entradas e saídas" subtitle="Resumo do dia" className="bg-[#111111]">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="text-zinc-400">Entradas</span>
            <b>€ 2.450,00</b>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="text-zinc-400">Saídas</span>
            <b>€ 520,50</b>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="text-zinc-400">Repasses pendentes</span>
            <b>€ 1.928,50</b>
          </div>
        </div>
      </PremiumCard>

      <PremiumCard title="Movimentações recentes" className="bg-[#111111]">
        <div className="space-y-2">
          {[
            ["Hoje 10:21", "Pagamento online", "€ 28,90"],
            ["Hoje 09:48", "Pagamento online", "€ 41,50"],
            ["Hoje 09:15", "Pagamento presencial", "€ 19,80"],
          ].map(([date, label, amount]) => (
            <div key={`${date}-${label}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div>
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-zinc-500">{date}</p>
              </div>
              <span className="font-black">{amount}</span>
            </div>
          ))}
        </div>
      </PremiumCard>

      <PremiumCard title="Ações financeiras" className="bg-[#111111]">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <PremiumActionButton tone="secondary"><Receipt className="mr-2 h-4 w-4" />Exportar CSV</PremiumActionButton>
          <PremiumActionButton tone="secondary"><Receipt className="mr-2 h-4 w-4" />Exportar PDF</PremiumActionButton>
          <PremiumActionButton tone="secondary"><Building2 className="mr-2 h-4 w-4" />Configurar banco</PremiumActionButton>
        </div>
      </PremiumCard>
    </div>
  );
};

export default PanelFinancePage;
