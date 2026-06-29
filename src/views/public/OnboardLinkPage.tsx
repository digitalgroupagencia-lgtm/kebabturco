import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { AlertCircle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getStripePublishableKeyForEnvironment } from "@/lib/stripePublishableKey";
import {
  fetchPublicOnboardingLinkInfo,
  submitPublicOnboardingIntake,
} from "@/services/orderService";

const SECTOR_OPTIONS = [
  { mcc: "5814", label: "Restaurante / comida rápida (kebab, pizza, etc.)" },
  { mcc: "5812", label: "Restaurante con servicio en mesa" },
  { mcc: "5813", label: "Bar o cafetería" },
  { mcc: "5499", label: "Tienda de alimentación" },
] as const;

const STRIPE_CONNECT_TERMS_URL = "https://stripe.com/es/legal/connect-account";
const KEBAB_PRIVACY_URL = "https://kebabturco.net/privacy";

function parseToken(pathname: string): string {
  const match = pathname.match(/\/(?:recibos\/registro-datos|ligar-conta)\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-muted/30 px-4 py-8">
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex items-center gap-2">
        <Wallet className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-black">Cobros del restaurante</h1>
      </div>
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
  const [step, setStep] = useState<"form" | "documents" | "done">("form");
  const [verifySecret, setVerifySecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<"company" | "individual">("company");
  const [businessMcc, setBusinessMcc] = useState("5814");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [iban, setIban] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("https://kebabturco.net");
  const [ownerDob, setOwnerDob] = useState("");
  const [representativeId, setRepresentativeId] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

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
          setBusinessMcc(info.prefill.businessMcc ?? "5814");
          setBusinessType(info.prefill.businessType ?? "company");
          setRepresentativeId(info.prefill.representativeId ?? "");
        }
      } catch {
        /* formulario sin pre-relleno */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const connectInstance = useMemo<StripeConnectInstance | null>(() => {
    if (step !== "documents" || !verifySecret || !publishableKey) return null;
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
      !iban.trim() ||
      !businessAddress.trim() ||
      !ownerDob.trim()
    ) {
      setLoadError("Rellena todos los campos obligatorios.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ownerDob.trim())) {
      setLoadError("La fecha de nacimiento debe ser AAAA-MM-DD (ejemplo: 1980-05-15).");
      return;
    }
    if (!acceptTerms) {
      setLoadError("Debes aceptar los términos del servicio de pagos.");
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
        businessAddress: businessAddress.trim(),
        businessWebsite: businessWebsite.trim() || "https://kebabturco.net",
        ownerDob: ownerDob.trim(),
        businessType,
        businessMcc,
        acceptTerms: true,
        representativeId: representativeId.trim() || undefined,
      });
      if (!result.clientSecret) {
        setLoadError("No se pudo abrir el paso de verificación. Pide un enlace nuevo a administración.");
        return;
      }
      setVerifySecret(result.clientSecret);
      setStep("documents");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudieron enviar los datos.");
    } finally {
      setSaving(false);
    }
  }, [
    token,
    businessName,
    businessType,
    businessMcc,
    ownerFullName,
    ownerEmail,
    ownerPhone,
    taxId,
    iban,
    businessAddress,
    businessWebsite,
    ownerDob,
    representativeId,
    acceptTerms,
  ]);

  if (!token) {
    return (
      <Shell>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Enlace no válido. Pide un enlace nuevo a administración.
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
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
            <p className="font-bold text-green-800 dark:text-green-300">Registro completado</p>
            <p className="text-muted-foreground mt-1">
              Datos y documentos enviados para revisión. Cuando esté aprobado, el restaurante recibirá
              los cobros online. Puede cerrar esta página.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (step === "documents" && connectInstance) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-bold text-foreground">Paso 2 de 2, Verificación</span>
          <br />
          Si la ley lo exige, suba aquí el documento de identidad del representante (DNI/NIE o
          pasaporte). Este paso es obligatorio para activar los cobros.
        </p>
        <div className="rounded-xl border bg-card p-4">
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <ConnectAccountOnboarding
              skipTermsOfServiceCollection
              fullTermsOfServiceUrl={STRIPE_CONNECT_TERMS_URL}
              privacyPolicyUrl={KEBAB_PRIVACY_URL}
              collectionOptions={{
                fields: "eventually_due",
                futureRequirements: "include",
              }}
              onExit={() => setStep("done")}
            />
          </ConnectComponentsProvider>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm text-muted-foreground leading-relaxed">
        <span className="font-bold text-foreground">Paso 1 de 2, Datos del negocio</span>
        <br />
        Rellena todos los campos. Después pasará al paso de verificación de identidad (documento).
      </p>
      {storeName && <p className="text-sm font-semibold text-primary">{storeName}</p>}
      {loadError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}
      <div className="rounded-2xl border bg-card p-4 space-y-3 text-sm">
        <div>
          <Label>Nombre del negocio</Label>
          <Input className="mt-1" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div>
          <Label>Tipo de empresa</Label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value as "company" | "individual")}
          >
            <option value="company">Empresa (SL, SLU, etc.)</option>
            <option value="individual">Autónomo / persona física</option>
          </select>
        </div>
        <div>
          <Label>Sector del negocio</Label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={businessMcc}
            onChange={(e) => setBusinessMcc(e.target.value)}
          >
            {SECTOR_OPTIONS.map((opt) => (
              <option key={opt.mcc} value={opt.mcc}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Nombre completo del representante legal</Label>
          <Input className="mt-1" value={ownerFullName} onChange={(e) => setOwnerFullName(e.target.value)} />
        </div>
        <div>
          <Label>Web del negocio</Label>
          <Input className="mt-1" value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} />
        </div>
        <div>
          <Label>Correo electrónico</Label>
          <Input type="email" className="mt-1" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input className="mt-1" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
        </div>
        <div>
          <Label>Fecha de nacimiento del representante (AAAA-MM-DD)</Label>
          <Input
            className="mt-1"
            placeholder="1980-05-15"
            value={ownerDob}
            onChange={(e) => setOwnerDob(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>NIF / CIF de la empresa</Label>
          <Input className="mt-1" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>
        <div>
          <Label>DNI / NIE del representante</Label>
          <Input
            className="mt-1"
            placeholder="12345678A"
            value={representativeId}
            onChange={(e) => setRepresentativeId(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <Label>IBAN (cuenta para recibir cobros)</Label>
          <Input
            className="mt-1 font-mono"
            value={iban}
            onChange={(e) => setIban(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <Label>Dirección del negocio</Label>
          <Textarea
            rows={2}
            className="mt-1"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            required
          />
        </div>
        <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 cursor-pointer">
          <Checkbox
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(v === true)}
            className="mt-0.5"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            Acepto el{" "}
            <a
              href={STRIPE_CONNECT_TERMS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline font-semibold"
              onClick={(e) => e.stopPropagation()}
            >
              acuerdo de cuenta conectada y términos del servicio de pagos
            </a>{" "}
            necesarios para recibir cobros online en España, y confirmo que los datos son correctos.
          </span>
        </label>
        <Button className="w-full h-11 font-bold" disabled={saving} onClick={() => void submitForm()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continuar al paso de verificación
        </Button>
      </div>
    </Shell>
  );
}
