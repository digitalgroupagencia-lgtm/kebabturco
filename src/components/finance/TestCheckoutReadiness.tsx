import { AlertCircle, CheckCircle2 } from "lucide-react";
import { hasStripePublishableKey } from "@/lib/stripePublishableKey";
import { isStripeConnectReady } from "@/lib/stripeConnectReady";
import type { StoreFinancialProfile, StripePlatformStatus } from "@/services/orderService";

type Props = {
  profile: StoreFinancialProfile | null;
  platformStatus: StripePlatformStatus | null;
  schemaStripeEnv?: boolean;
  schemaTestSimulated?: boolean;
  serverTestKey?: boolean;
  serverTestWebhook?: boolean;
  edgeFunctionsOk?: boolean;
};

type Item = { ok: boolean; label: string; fix?: string };

export default function TestCheckoutReadiness({
  profile,
  platformStatus,
  schemaStripeEnv = true,
  schemaTestSimulated = true,
  serverTestKey,
  serverTestWebhook,
  edgeFunctionsOk = true,
}: Props) {
  const hasTestPk = hasStripePublishableKey("test");
  const connectReady = isStripeConnectReady(profile);
  const testSimulated = Boolean(profile?.stripe_connect_test_simulated);
  const testKeysServer = serverTestKey ?? Boolean(platformStatus?.testKeysConfigured);

  const items: Item[] = [
    {
      ok: testKeysServer,
      label: "Chave secreta de teste no servidor",
      fix: "Lovable → Segredos → STRIPE_SECRET_KEY_TEST",
    },
    {
      ok: hasTestPk,
      label: "Chave publicável de teste no site (pk_test)",
      fix: "Coloque pk_test_... no projecto e faça Sync + Publish na Lovable",
    },
    {
      ok: schemaStripeEnv,
      label: "Base de dados: modo teste/produção",
      fix: "Lovable → Database → SQL editor → cole o SQL da caixa vermelha em Recebimentos",
    },
    {
      ok: schemaTestSimulated,
      label: "Base de dados: recebimentos simulados",
      fix: "Lovable → Database → SQL editor → cole o SQL da caixa vermelha em Recebimentos",
    },
    {
      ok: connectReady || testSimulated,
      label: "Recebimentos de teste activos",
      fix: "Clique «Activar recebimentos de teste» abaixo",
    },
    {
      ok: serverTestWebhook !== false,
      label: "Webhook de teste configurado",
      fix: "Segredo STRIPE_WEBHOOK_SECRET_TEST + endpoint na Stripe (modo teste)",
    },
    {
      ok: edgeFunctionsOk,
      label: "Funções do servidor publicadas",
      fix: "Lovable → «Deploy all edge functions»",
    },
  ];

  const blocking = items.filter((i) => !i.ok);
  const allOk = blocking.length === 0;

  if (allOk) {
    return (
      <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 space-y-1">
        <div className="flex items-center gap-2 text-sm font-black text-green-800 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Checkout teste pronto, pode pagar com cartão 4242
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Modo teste activo · Produção bloqueada até aprovação da Stripe · Sem dinheiro real
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black text-amber-900 dark:text-amber-200">Checkout teste, falta configurar</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Corrija os itens abaixo para testar pedido completo com cartão 4242.
          </p>
        </div>
      </div>
      <ul className="space-y-1.5 pl-1">
        {blocking.map((item) => (
          <li key={item.label} className="text-xs">
            <span className="font-bold text-destructive">✗</span>{" "}
            <span className="font-semibold">{item.label}</span>
            {item.fix && <span className="text-muted-foreground">, {item.fix}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
