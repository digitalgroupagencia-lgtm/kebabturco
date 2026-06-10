import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
import {
  fetchStorePayoutIntake,
  saveAndSyncStorePayoutIntake,
  type SavePayoutIntakeResult,
  type StorePayoutIntake,
} from "@/services/payoutIntakeService";

type Props = {
  storeId: string;
  onSaved?: (row: StorePayoutIntake, result: SavePayoutIntakeResult) => void;
};

export default function AdminPayoutIntakeForm({ storeId, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missingTable, setMissingTable] = useState(false);
  const [saved, setSaved] = useState<StorePayoutIntake | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [iban, setIban] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("https://kebabturco.net");
  const [ownerDob, setOwnerDob] = useState("");
  const [businessMcc, setBusinessMcc] = useState("5814");
  const [businessType, setBusinessType] = useState<"company" | "individual">("company");
  const [representativeId, setRepresentativeId] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setMissingTable(false);
      try {
        const row = await fetchStorePayoutIntake(storeId);
        if (!active) return;
        if (row) {
          setSaved(row);
          setCollapsed(true);
          setBusinessName(row.business_name);
          setOwnerFullName(row.owner_full_name);
          setOwnerEmail(row.owner_email ?? "");
          setOwnerPhone(row.owner_phone ?? "");
          setTaxId(row.tax_id ?? "");
          setIban(row.iban);
          setBusinessAddress(row.business_address ?? "");
          const n = row.notes ?? "";
          const dob = n.match(/dob:([^|]+)/)?.[1]?.trim();
          const mcc = n.match(/mcc:([^|]+)/)?.[1]?.trim();
          const biz = n.match(/biz:([^|]+)/)?.[1]?.trim();
          const rep = n.match(/rep_id:([^|]+)/)?.[1]?.trim();
          if (dob) setOwnerDob(dob);
          if (mcc) setBusinessMcc(mcc);
          if (biz === "company" || biz === "individual") setBusinessType(biz);
          if (rep) setRepresentativeId(rep);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("store_payout_intake") || msg.includes("does not exist")) {
          setMissingTable(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [storeId]);

  const save = async () => {
    if (
      !businessName.trim() ||
      !ownerFullName.trim() ||
      !iban.trim() ||
      !ownerEmail.trim() ||
      !ownerPhone.trim() ||
      !taxId.trim() ||
      !businessAddress.trim() ||
      !ownerDob.trim()
    ) {
      toast.error("Preencha todos os campos obrigatórios (inclui morada e data de nascimento)");
      return;
    }
    setSaving(true);
    try {
      const result = await saveAndSyncStorePayoutIntake({
        storeId,
        businessName: businessName.trim(),
        ownerFullName: ownerFullName.trim(),
        iban: iban.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPhone: ownerPhone.trim() || undefined,
        taxId: taxId.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
        businessWebsite: businessWebsite.trim() || "https://kebabturco.net",
        ownerDob: ownerDob.trim() || undefined,
        businessMcc,
        businessType,
        representativeId: representativeId.trim() || undefined,
      });
      const row = await fetchStorePayoutIntake(storeId);
      if (row) {
        setSaved(row);
        setCollapsed(true);
        onSaved?.(row, result);
      }
      toast.success(
        result.message ||
          (result.bankSynced
            ? "Dados guardados e enviados para a conta de recebimentos (incluindo IBAN)."
            : "Dados guardados e enviados — confirme a verificação se for pedida."),
      );
    } catch (e) {
      const msg = extractErrorMessage(e);
      toast.error(
        msg.includes("store_payout_intake") || msg.includes("migração")
          ? "Falta actualizar a base de dados na Lovable — peça Sync + Publish."
          : msg || "Erro ao guardar",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> A carregar dados do restaurante…
        </CardContent>
      </Card>
    );
  }

  if (collapsed && saved) {
    return (
      <Card className="border-green-500/40 bg-green-500/5">
        <CardContent className="py-4 space-y-2">
          <p className="text-sm font-bold text-green-800 dark:text-green-300">
            Dados do restaurante guardados
          </p>
          <p className="text-xs text-muted-foreground">
            {saved.business_name} · {saved.owner_email ?? "sem e-mail"} · IBAN ····{" "}
            {saved.iban.slice(-4)}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setCollapsed(false)}>
            Editar dados
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (missingTable) {
    return (
      <Card className="border-amber-500/40">
        <CardContent className="py-4 text-sm text-amber-800 dark:text-amber-200">
          Falta activar a base de dados dos dados bancários — peça Sync + Publish na Lovable.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Passo 1 — Dados do restaurante
        </CardTitle>
        <CardDescription>
          Preencha tudo — o sistema envia automaticamente para activar a conta do restaurante: site, tipo de
          empresa (NIF/CIF), e-mail, telefone, morada e IBAN. O e-mail é o do dono, não o seu de administrador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <Label>Nome do negócio</Label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex.: Kebab Turco Gandia"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Nome completo do titular</Label>
          <Input
            value={ownerFullName}
            onChange={(e) => setOwnerFullName(e.target.value)}
            placeholder="Como no banco"
            className="mt-1"
          />
        </div>
        <div>
          <Label>E-mail do dono do restaurante</Label>
          <Input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="email@restaurante.com"
            className="mt-1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Use o e-mail pessoal ou do negócio do dono — não o seu e-mail de administrador.
          </p>
        </div>
        <div>
          <Label>Site do negócio</Label>
          <Input
            value={businessWebsite}
            onChange={(e) => setBusinessWebsite(e.target.value)}
            placeholder="https://kebabturco.net"
            className="mt-1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Obrigatório na Stripe — use o site público do restaurante ou da marca.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Tipo de empresa</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as "company" | "individual")}
            >
              <option value="company">Empresa (SL, SLU…)</option>
              <option value="individual">Autónomo</option>
            </select>
          </div>
          <div>
            <Label>Setor</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={businessMcc}
              onChange={(e) => setBusinessMcc(e.target.value)}
            >
              <option value="5814">Restaurante / comida rápida</option>
              <option value="5812">Restaurante com mesa</option>
              <option value="5813">Bar / cafetaria</option>
            </select>
          </div>
        </div>
        <div>
          <Label>Data de nascimento do representante (AAAA-MM-DD)</Label>
          <Input
            value={ownerDob}
            onChange={(e) => setOwnerDob(e.target.value)}
            placeholder="1980-05-15"
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
            <Label>NIF / CIF da empresa</Label>
            <Input
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Ex.: B25979048"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Telefone do dono</Label>
            <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="mt-1" />
          </div>
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
          <Label>DNI / NIE do representante</Label>
          <Input
            value={representativeId}
            onChange={(e) => setRepresentativeId(e.target.value.toUpperCase())}
            placeholder="12345678A"
            className="mt-1"
          />
        </div>
        <Button type="button" className="w-full h-11 font-bold" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {saved ? "Actualizar e enviar para recebimentos" : "Guardar e enviar para recebimentos"}
        </Button>
      </CardContent>
    </Card>
  );
}
