import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { AlertCircle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getStripePublishableKeyForEnvironment } from "@/lib/stripePublishableKey";
import {
  fetchPublicOnboardingLinkInfo,
  submitPublicOnboardingIntake,
} from "@/services/orderService";

function parseToken(pathname: string): string {
  const match = pathname.match(/\/ligar-conta\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-muted/30 px-4 py-8">
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex items-center gap-2">
        <Wallet className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-black">Recebimentos do restaurante</h1>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Preencha os dados onde quer receber o dinheiro dos pedidos online. Formulário seguro da Kebab
        Turco — sem criar conta separada.
      </p>
      {children}
    </div>
  </div>
);

export default function OnboardLinkPage() {
  const location = useLocation();
  const token = useMemo(() => parseToken(location.pathname), [location.pathname]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "verify" | "done">("form");
  const [verifySecret, setVerifySecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [iban, setIban] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("https://kebabturco.net");
  const [ownerDob, setOwnerDob] = useState("");

  const publishableKey = getStripePublishableKeyForEnvironment("live");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const info = await fetchPublicOnboardingLinkInfo(token);
        if (!active) return;
        setStoreName(info.storeName);
        if (info.prefill) {
          setBusinessName(info.prefill.businessName ?? "");
          setOwnerFullName(info.prefill.ownerFullName ?? "");
          setOwnerEmail(info.prefill.ownerEmail ?? "");
          setOwnerPhone(info.prefill.ownerPhone ?? "");
          setTaxId(info.prefill.taxId ?? "");
          setIban(info.prefill.iban ?? "");
          setBusinessAddress(info.prefill.businessAddress ?? "");
          setOwnerDob(info.prefill.ownerDob ?? "");
        }
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : "Link inválido.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const connectInstance = useMemo<StripeConnectInstance | null>(() => {
    if (step !== "verify" || !verifySecret || !publishableKey) return null;
    return loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret: async () => verifySecret,
      appearance: {
        overlays: "dialog",
        variables: {
          fontFamily: "system-ui, -apple-system, sans-serif",
          borderRadius: "12px",
          colorPrimary: "#c2410c",
        },
      },
    });
  }, [step, verifySecret, publishableKey]);

  const submitForm = useCallback(async () => {
    if (!token) return;
    if (
      !businessName.trim() ||
      !ownerFullName.trim() ||
      !ownerEmail.trim() ||
      !ownerPhone.trim() ||
      !taxId.trim() ||
      !iban.trim()
    ) {
      setLoadError("Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    setLoadError(null);
    try {
      const result = await submitPublicOnboardingIntake(token, {
        businessName: businessName.trim(),
        ownerFullName: ownerFullName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPhone: ownerPhone.trim(),
        taxId: taxId.trim(),
        iban: iban.trim(),
        businessAddress: businessAddress.trim() || undefined,
        businessWebsite: businessWebsite.trim() || "https://kebabturco.net",
        ownerDob: ownerDob.trim() || undefined,
      });
      if (result.needsVerification && result.clientSecret) {
        setVerifySecret(result.clientSecret);
        setStep("verify");
      } else {
        setStep("done");
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setSaving(false);
    }
  }, [
    token,
    businessName,
    ownerFullName,
    ownerEmail,
    ownerPhone,
    taxId,
    iban,
    businessAddress,
    businessWebsite,
    ownerDob,
  ]);

  if (!token) {
    return (
      <Shell>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Link inválido. Peça um novo link à administração.
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
        </div>
      </Shell>
    );
  }

  if (step === "done") {
    return (
      <Shell>
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-green-800 dark:text-green-300">Dados enviados</p>
            <p className="text-muted-foreground mt-1">
              Obrigado. Os seus dados foram enviados para análise. Quando estiver tudo aprovado, o
              restaurante passa a receber pagamentos online. Pode fechar esta página.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (step === "verify" && connectInstance) {
    return (
      <Shell>
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm font-bold">Último passo — confirmar identidade</p>
          <p className="text-xs text-muted-foreground">
            Por lei, falta confirmar a identidade do representante (documento ou data de nascimento).
            Este passo é discreto e não pede para criar conta nova.
          </p>
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <ConnectAccountOnboarding onExit={() => setStep("done")} />
          </ConnectComponentsProvider>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {storeName && (
        <p className="text-sm font-semibold text-primary">{storeName}</p>
      )}
      {loadError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}
      <div className="rounded-2xl border bg-card p-4 space-y-3 text-sm">
        <div>
          <Label>Nome do negócio</Label>
          <Input className="mt-1" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div>
          <Label>Nome completo do titular</Label>
          <Input className="mt-1" value={ownerFullName} onChange={(e) => setOwnerFullName(e.target.value)} />
        </div>
        <div>
          <Label>Site do negócio</Label>
          <Input className="mt-1" value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input type="email" className="mt-1" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input className="mt-1" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
        </div>
        <div>
          <Label>Data de nascimento (AAAA-MM-DD)</Label>
          <Input
            className="mt-1"
            placeholder="1980-05-15"
            value={ownerDob}
            onChange={(e) => setOwnerDob(e.target.value)}
          />
        </div>
        <div>
          <Label>NIF / CIF</Label>
          <Input className="mt-1" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>
        <div>
          <Label>IBAN</Label>
          <Input
            className="mt-1 font-mono"
            value={iban}
            onChange={(e) => setIban(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <Label>Morada do negócio</Label>
          <Textarea
            rows={2}
            className="mt-1"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
          />
        </div>
        <Button className="w-full h-11 font-bold" disabled={saving} onClick={() => void submitForm()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Enviar dados para análise
        </Button>
      </div>
    </Shell>
  );
}
