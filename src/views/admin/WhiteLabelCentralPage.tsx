import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  TEMPLATE_VERSION,
  TEMPLATE_CODENAME,
  TEMPLATE_RELEASED_AT,
  diagnoseTemplateStatus,
  type TemplateStatus,
} from "@/lib/templateVersion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Copy,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Database,
  ListChecks,
  GitBranch,
  RefreshCw,
  Sparkles,
  Rocket,
  History,
  ChevronDown,
  Terminal,
  Loader2,
  Smartphone,
  Package,
  Brush,
  ClipboardList,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isGeneralAdmin } from "@/lib/projectAccess";
import { nav } from "@/lib/navPaths.ts";

// ⚠️ Imports raw — Vite carrega o conteúdo no build. Sempre que o app for
// publicado, os arquivos abaixo refletem exatamente a versão do código atual.
import bootstrapSql from "../../../supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql?raw";
import docMasterTemplate from "../../../docs/MASTER_TEMPLATE_RESTAURANT.md?raw";
import docUpdateGuide from "../../../docs/UPDATE_PROPAGATION_GUIDE.md?raw";
import docValidation from "../../../docs/TEMPLATE_VALIDATION_CHECKLIST.md?raw";
import docRestaurantUpdate from "../../../docs/RESTAURANT_UPDATE_CHECKLIST.md?raw";
import docMasterWorkflow from "../../../docs/MASTER_UPDATE_WORKFLOW.md?raw";
import docChangelog from "../../../docs/CHANGELOG_TEMPLATE.md?raw";
import logoMainAsset from "@/assets/white-label/logo_main.png.asset.json";
import logoMainDarkAsset from "@/assets/white-label/logo_main_dark.png.asset.json";
import logoLanguageAsset from "@/assets/white-label/logo_language.png.asset.json";
import logoOrderTypeAsset from "@/assets/white-label/logo_order_type.png.asset.json";
import bannerHomeAsset from "@/assets/white-label/banner_home.png.asset.json";
import iconDineInAsset from "@/assets/white-label/icon_dine_in.png.asset.json";
import iconTakeawayAsset from "@/assets/white-label/icon_takeaway.png.asset.json";
import iconDeliveryAsset from "@/assets/white-label/icon_delivery.png.asset.json";
import langEnAsset from "@/assets/white-label/lang_en.png.asset.json";
import langEsAsset from "@/assets/white-label/lang_es.png.asset.json";
import langFrAsset from "@/assets/white-label/lang_fr.png.asset.json";
import langPtAsset from "@/assets/white-label/lang_pt.png.asset.json";

const BUILD_TIME = new Date().toISOString();

const RESOLVED_BOOTSTRAP_SQL = bootstrapSql
  .replaceAll("/__l5e/assets-v1/10b1bdeb-3cf6-4d7f-afda-915c70ecf38b/white-label-logo_main.png", logoMainAsset.url)
  .replaceAll("/__l5e/assets-v1/cf247b3d-5c8e-4a69-8128-7649aedc8cab/white-label-logo_main_dark.png", logoMainDarkAsset.url)
  .replaceAll("/__l5e/assets-v1/833719f0-07b7-460a-a78b-b19ef7e7aae9/white-label-logo_language.png", logoLanguageAsset.url)
  .replaceAll("/__l5e/assets-v1/acf26dc1-0064-4dc9-9968-5de28d63c002/white-label-logo_order_type.png", logoOrderTypeAsset.url)
  .replaceAll("/__l5e/assets-v1/ae7c7737-28bb-41cd-8abb-05fcf6c85b1f/white-label-banner_home.png", bannerHomeAsset.url)
  .replaceAll("/__l5e/assets-v1/f4156c88-f205-4149-970d-b8278cf4539e/white-label-icon_dine_in.png", iconDineInAsset.url)
  .replaceAll("/__l5e/assets-v1/aaaae7ff-394a-461e-9146-0cd1e98f4ef1/white-label-icon_takeaway.png", iconTakeawayAsset.url)
  .replaceAll("/__l5e/assets-v1/79cf0a13-c837-4e45-835f-507d09a2f708/white-label-icon_delivery.png", iconDeliveryAsset.url)
  .replaceAll("/__l5e/assets-v1/8bc3600d-1044-40da-b042-300509a95cf8/white-label-lang_en.png", langEnAsset.url)
  .replaceAll("/__l5e/assets-v1/29cfe4d1-470a-4c70-84da-4addfddf4edc/white-label-lang_es.png", langEsAsset.url)
  .replaceAll("/__l5e/assets-v1/0cdf6acd-8db3-4cb7-a8aa-4ebd2b7725c0/white-label-lang_fr.png", langFrAsset.url)
  .replaceAll("/__l5e/assets-v1/748bc230-3d89-4928-a8cd-a6da08bda5c7/white-label-lang_pt.png", langPtAsset.url);

type HistoryRow = {
  id: string;
  version: string;
  applied_at: string;
  project_name: string | null;
  update_type: string;
  migration_names: string[];
  notes: string | null;
  requires_apk_rebuild: boolean;
  success: boolean;
};

function copyText(text: string, label = "Conteúdo") {
  navigator.clipboard.writeText(text).then(
    () => toast({ title: `${label} copiado`, description: `${text.length.toLocaleString()} caracteres` }),
    () => toast({ title: "Erro ao copiar", variant: "destructive" }),
  );
}

const TEMPLATE_FILES: { name: string; desc: string; content: string; path: string }[] = [
  {
    name: "BOOTSTRAP_MASTER_TEMPLATE.sql",
    desc: "Reaplica identidade visual, tela inicial, catálogo, banners, horários e estrutura template sem duplicar em clone novo.",
    content: RESOLVED_BOOTSTRAP_SQL,
    path: "supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql",
  },
  {
    name: "MASTER_TEMPLATE_RESTAURANT.md",
    desc: "Visão geral do conceito Master Template e o que é/não é copiado pelo Remix.",
    content: docMasterTemplate,
    path: "docs/MASTER_TEMPLATE_RESTAURANT.md",
  },
  {
    name: "UPDATE_PROPAGATION_GUIDE.md",
    desc: "Como propagar atualizações do Master para os restaurantes clonados.",
    content: docUpdateGuide,
    path: "docs/UPDATE_PROPAGATION_GUIDE.md",
  },
  {
    name: "TEMPLATE_VALIDATION_CHECKLIST.md",
    desc: "Checklist de 19 pontos para validar paridade Master ↔ Clone.",
    content: docValidation,
    path: "docs/TEMPLATE_VALIDATION_CHECKLIST.md",
  },
  {
    name: "RESTAURANT_UPDATE_CHECKLIST.md",
    desc: "Passos pré e pós-update para um restaurante clonado.",
    content: docRestaurantUpdate,
    path: "docs/RESTAURANT_UPDATE_CHECKLIST.md",
  },
  {
    name: "MASTER_UPDATE_WORKFLOW.md",
    desc: "Pipeline oficial de release do Master até os clones.",
    content: docMasterWorkflow,
    path: "docs/MASTER_UPDATE_WORKFLOW.md",
  },
  {
    name: "CHANGELOG_TEMPLATE.md",
    desc: "Log oficial de versões do Master Template.",
    content: docChangelog,
    path: "docs/CHANGELOG_TEMPLATE.md",
  },
];

const PROMPT_NEW_PROJECT = `Este projeto é um restaurante remixado do Master Template (versão ${TEMPLATE_VERSION} — ${TEMPLATE_CODENAME}).

Tarefas obrigatórias na ordem:
1. Confirme que a Lovable Cloud está ativa.
2. Execute o BOOTSTRAP_MASTER_TEMPLATE.sql para popular o banco com dados template (categorias, produtos, combos, banners, horários, plano).
3. Registre a versão ${TEMPLATE_VERSION} na tabela _template_version.
4. Mantenha toda a estrutura funcional original (totem, painel restaurante, KDS, entregador, admin, Stripe, Firebase, impressão, push).
5. Permita apenas customizações de:
   - nome do restaurante
   - logo
   - cores / identidade visual
   - cardápio (categorias, produtos, preços, extras, combos)
   - horários, endereço, telefone
   - chaves Stripe e Firebase
6. Não remova telas, módulos, contextos, rotas, edge functions ou migrations originais.
7. Confirme paridade visual com o Master usando TEMPLATE_VALIDATION_CHECKLIST.md.`;

const PROMPT_UPDATE_PROJECT = `Este projeto é um restaurante clonado do Master Template.

Aplique a atualização da versão atual local para a versão ${TEMPLATE_VERSION} (${TEMPLATE_CODENAME}).

Regras:
1. PRESERVE todos os dados locais do restaurante:
   - produtos, categorias, combos, extras, preços
   - pedidos, clientes, fidelidade, financeiro
   - chaves Stripe, Firebase, impressoras, zonas de delivery
   - cores, logos, banners, splash
   - configurações de operação, totem, mesas
2. APLIQUE apenas:
   - mudanças de código (componentes, hooks, contextos, rotas, edge functions)
   - migrations novas que faltam
   - correções estruturais e bugfixes
3. Após aplicar, atualize _template_version para ${TEMPLATE_VERSION} e registre em template_update_history.
4. Avise se a atualização exige rebuild de APK (mudanças nativas: Capacitor, Firebase, push, impressão nativa, permissões Android).
5. Rode TEMPLATE_VALIDATION_CHECKLIST.md ao final.`;

const PROMPT_VALIDATE = `Valide este restaurante contra o Master Template versão ${TEMPLATE_VERSION}.

Execute todos os pontos do TEMPLATE_VALIDATION_CHECKLIST.md e reporte:
- itens OK
- itens com divergência
- itens faltando
- itens extras que não existem no Master

No fim, dê veredito: PARIDADE OK / PARIDADE PARCIAL / PARIDADE QUEBRADA.`;

const GIT_COMMANDS = `git pull origin main
npm install
npm run build
npx cap sync android`;

const GIT_NATIVE = `# Quando houver mudança nativa (Firebase, push, impressão, permissões):
npx cap sync android
npx cap open android
# Depois faça o build do APK no Android Studio.`;

const NEW_RESTAURANT_CHECKLIST = `# Checklist — Novo restaurante white-label

## 1. Criação
- [ ] Remix do Master Template
- [ ] Lovable Cloud ativada no novo projeto
- [ ] Bootstrap SQL executado
- [ ] Versão registrada em _template_version

## 2. Identidade
- [ ] Nome do restaurante
- [ ] Logo
- [ ] Cores (primária, secundária, accent)
- [ ] Endereço, telefone, e-mail
- [ ] Horário de funcionamento
- [ ] Horário de delivery

## 3. Cardápio
- [ ] Categorias
- [ ] Produtos com imagens reais
- [ ] Preços
- [ ] Tamanhos / variações
- [ ] Extras / modificadores
- [ ] Combos
- [ ] Bebidas
- [ ] Zonas de entrega + taxas

## 4. Integrações
- [ ] Stripe (publishable + secret)
- [ ] Firebase (google-services.json)
- [ ] Impressora térmica
- [ ] Push notifications (VAPID)

## 5. Testes
- [ ] Cliente: adicionar produto, finalizar pedido
- [ ] Pagamento em dinheiro
- [ ] Pagamento cartão (Stripe)
- [ ] Painel operador: receber pedido
- [ ] KDS: visualizar pedido na cozinha
- [ ] Impressão automática
- [ ] Delivery: atribuição de entregador
- [ ] Notificação push chega ao cliente
- [ ] Conta cliente: histórico e "pedir de novo"`;

function StatusPill({ status }: { status: TemplateStatus | null }) {
  if (!status) return null;
  const cfg = {
    up_to_date: { icon: CheckCircle2, cls: "bg-success/10 text-success border-success/30" },
    db_outdated: { icon: AlertTriangle, cls: "bg-warning/10 text-warning border-warning/30" },
    code_outdated: { icon: AlertTriangle, cls: "bg-warning/10 text-warning border-warning/30" },
    bootstrap_missing: { icon: XCircle, cls: "bg-destructive/10 text-destructive border-destructive/30" },
  }[status.kind];
  const Icon = cfg.icon;
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {status.label}
    </div>
  );
}

function CopyButton({ text, label, size = "sm", variant = "outline" }: {
  text: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
}) {
  return (
    <Button size={size} variant={variant} onClick={() => copyText(text, label ?? "Conteúdo")}>
      <Copy className="h-3.5 w-3.5 mr-1.5" />
      Copiar
    </Button>
  );
}

function FilePreview({ content }: { content: string }) {
  return (
    <ScrollArea className="h-80 w-full rounded-md border bg-muted/30">
      <pre className="p-3 text-xs whitespace-pre-wrap [overflow-wrap:anywhere] font-mono">{content}</pre>
    </ScrollArea>
  );
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {n}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3">{children}</CardContent>
    </Card>
  );
}

export default function WhiteLabelCentralPage() {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const [status, setStatus] = useState<TemplateStatus | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ver }, { data: hist }] = await Promise.all([
      supabase
        .from("_template_version")
        .select("version, applied_at")
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("template_update_history")
        .select("*")
        .order("applied_at", { ascending: false })
        .limit(30),
    ]);
    setStatus(diagnoseTemplateStatus(ver?.version ?? null, ver?.applied_at ?? null));
    setHistory((hist as HistoryRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasUnpublished = useMemo(() => status?.kind === "db_outdated", [status]);

  if (roleLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isGeneralAdmin(roleData?.role)) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Acesso restrito</AlertTitle>
        <AlertDescription>
          Esta central é exclusiva do Admin Master.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Central White-Label</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Tudo para criar, atualizar e gerir restaurantes a partir do Master Template — sem entrar no código.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          <Button variant="outline" size="sm" onClick={() => void load()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Banner: atualização não publicada */}
      {hasUnpublished && (
        <Alert className="border-warning/40 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>Atualização pendente neste projeto</AlertTitle>
          <AlertDescription className="text-sm">
            O código está na versão <b>{TEMPLATE_VERSION}</b> mas o banco está em <b>{status?.dbVersion}</b>.
            Existem alterações que ainda não foram aplicadas/publicadas. Aplique as migrations pendentes e registre o
            update na aba <Link className="underline" to={nav.admin("template-version")}>Versão do Template</Link>.
          </AlertDescription>
        </Alert>
      )}

      {status?.kind === "bootstrap_missing" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Bootstrap não aplicado</AlertTitle>
          <AlertDescription>
            Este projeto ainda não tem dados template. Vá em "Bootstrap SQL" abaixo e execute o script.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" /> Código
            </div>
            <p className="text-xl font-bold mt-1">v{TEMPLATE_VERSION}</p>
            <p className="text-[10px] text-muted-foreground">{TEMPLATE_CODENAME} · {TEMPLATE_RELEASED_AT}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="h-3.5 w-3.5" /> Banco
            </div>
            <p className="text-xl font-bold mt-1">{status?.dbVersion ? `v${status.dbVersion}` : "—"}</p>
            <p className="text-[10px] text-muted-foreground">
              {status?.dbAppliedAt ? new Date(status.dbAppliedAt).toLocaleDateString("pt-PT") : "sem registro"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Updates
            </div>
            <p className="text-xl font-bold mt-1">{history.length}</p>
            <p className="text-[10px] text-muted-foreground">registros no histórico</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Rocket className="h-3.5 w-3.5" /> Build
            </div>
            <p className="text-sm font-bold mt-1">{new Date(BUILD_TIME).toLocaleString("pt-PT")}</p>
            <p className="text-[10px] text-muted-foreground">conteúdos atualizados na publicação</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="create"><Rocket className="h-3.5 w-3.5 mr-1.5" />Criar restaurante</TabsTrigger>
          <TabsTrigger value="files"><FileText className="h-3.5 w-3.5 mr-1.5" />Arquivos</TabsTrigger>
          <TabsTrigger value="bootstrap"><Database className="h-3.5 w-3.5 mr-1.5" />Bootstrap SQL</TabsTrigger>
          <TabsTrigger value="update"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Atualizar clones</TabsTrigger>
          <TabsTrigger value="prompts"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Prompts</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1.5" />Histórico</TabsTrigger>
          <TabsTrigger value="commands"><Terminal className="h-3.5 w-3.5 mr-1.5" />Comandos</TabsTrigger>
        </TabsList>

        {/* CRIAR RESTAURANTE */}
        <TabsContent value="create" className="space-y-4 mt-4">
          <Alert>
            <Rocket className="h-4 w-4" />
            <AlertTitle>Fluxo: do Remix ao restaurante publicado</AlertTitle>
            <AlertDescription>Siga os 6 passos abaixo. Tempo médio: 20-30 min.</AlertDescription>
          </Alert>

          <StepCard n={1} title="Remixar o projeto Master">
            <p>Clique em <b>Remix</b> no projeto Master Template. O Remix copia código, telas, componentes, edge functions, Android e migrations.</p>
            <p className="text-xs text-muted-foreground">⚠️ O Remix NÃO copia dados do banco — por isso o passo 3 é obrigatório.</p>
          </StepCard>

          <StepCard n={2} title="Ativar Lovable Cloud">
            <p>No novo projeto, ative a Lovable Cloud. Isso cria um banco novo e executa as migrations automaticamente.</p>
          </StepCard>

          <StepCard n={3} title="Rodar Bootstrap Master">
            <p>Copie o SQL abaixo e cole no chat do novo projeto pedindo: <i>"execute o bootstrap"</i>.</p>
            <div className="flex gap-2">
              <CopyButton text={bootstrapSql} label="BOOTSTRAP_MASTER_TEMPLATE.sql" variant="default" />
              <CopyButton text={PROMPT_NEW_PROJECT} label="Prompt novo projeto" />
            </div>
          </StepCard>

          <StepCard n={4} title="Editar identidade">
            <ul className="grid grid-cols-2 gap-1 text-sm">
              <li>☐ Nome do restaurante</li>
              <li>☐ Logo</li>
              <li>☐ Cores</li>
              <li>☐ Endereço</li>
              <li>☐ Telefone</li>
              <li>☐ Horários</li>
            </ul>
          </StepCard>

          <StepCard n={5} title="Editar cardápio">
            <ul className="grid grid-cols-2 gap-1 text-sm">
              <li>☐ Categorias</li>
              <li>☐ Produtos</li>
              <li>☐ Preços</li>
              <li>☐ Imagens</li>
              <li>☐ Modificadores</li>
              <li>☐ Combos</li>
              <li>☐ Bebidas</li>
              <li>☐ Zonas de delivery</li>
            </ul>
          </StepCard>

          <StepCard n={6} title="Testar tudo">
            <ul className="grid grid-cols-2 gap-1 text-sm">
              <li>☐ Cliente abre e vê catálogo</li>
              <li>☐ Adicionar produto ao carrinho</li>
              <li>☐ Finalizar pedido</li>
              <li>☐ Pagamento dinheiro</li>
              <li>☐ Pagamento cartão</li>
              <li>☐ Painel operador recebe</li>
              <li>☐ Impressão automática</li>
              <li>☐ Delivery atribuído</li>
              <li>☐ Notificação chega</li>
            </ul>
            <CopyButton text={NEW_RESTAURANT_CHECKLIST} label="Checklist completo" />
          </StepCard>
        </TabsContent>

        {/* ARQUIVOS */}
        <TabsContent value="files" className="space-y-3 mt-4">
          {TEMPLATE_FILES.map((f) => (
            <Card key={f.name}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="break-all">{f.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">{f.desc}</CardDescription>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono break-all">{f.path}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <CopyButton text={f.content} label={f.name} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Visualizar conteúdo
                      <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <FilePreview content={f.content} />
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* BOOTSTRAP */}
        <TabsContent value="bootstrap" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                BOOTSTRAP_MASTER_TEMPLATE.sql
              </CardTitle>
              <CardDescription>
                Popula um projeto remixado com a estrutura template completa: tenant, store, plano,
                categorias, produtos com extras/tamanhos, combos, banners, splash e horários.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Rodar <b>apenas em projeto novo/remixado</b>. Não execute em restaurante já em produção —
                  ele cria dados template que vão poluir o cardápio real.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 flex-wrap">
                <CopyButton text={bootstrapSql} label="BOOTSTRAP SQL completo" variant="default" />
                <Badge variant="outline">{bootstrapSql.length.toLocaleString()} caracteres</Badge>
                <Badge variant="outline">idempotente</Badge>
              </div>
              <FilePreview content={bootstrapSql} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATUALIZAR */}
        <TabsContent value="update" className="space-y-4 mt-4">
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>Como atualizar um restaurante já criado</AlertTitle>
            <AlertDescription>Siga os passos para sincronizar um clone com o Master.</AlertDescription>
          </Alert>

          <StepCard n={1} title="Abrir o projeto do restaurante">
            <p>Entre no projeto Lovable do restaurante clonado.</p>
          </StepCard>
          <StepCard n={2} title="Aplicar atualização">
            <p>Use o prompt de atualização (aba <b>Prompts</b>) ou faça git pull manual:</p>
            <pre className="bg-muted p-3 rounded text-xs font-mono">{GIT_COMMANDS}</pre>
            <CopyButton text={GIT_COMMANDS} label="Comandos git" />
          </StepCard>
          <StepCard n={3} title="Aplicar migrations novas">
            <p>Se houver migrations pendentes, o Lovable aplica automaticamente. Confira em <Link className="underline" to={nav.admin("template-version")}>Versão do Template</Link>.</p>
          </StepCard>
          <StepCard n={4} title="Testar fluxo principal">
            <p>Use o <Link className="underline" to={nav.admin("diagnostics-hub")}>Centro de Testes</Link> para validar o restaurante.</p>
          </StepCard>
          <StepCard n={5} title="Registrar update">
            <p>Vá em <Link className="underline" to={nav.admin("template-version")}>Versão do Template</Link> e registre o update aplicado.</p>
          </StepCard>

          <Card className="border-warning/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-warning" />
                Quando precisa rebuild de APK?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Só precisa rebuild quando houver mudança <b>nativa</b>:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Firebase / google-services.json</li>
                <li>Capacitor (versão ou plugins)</li>
                <li>Permissões Android</li>
                <li>Impressão nativa</li>
                <li>Push notifications nativas</li>
              </ul>
              <pre className="bg-muted p-3 rounded text-xs font-mono">{GIT_NATIVE}</pre>
              <CopyButton text={GIT_NATIVE} label="Comandos Android" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROMPTS */}
        <TabsContent value="prompts" className="space-y-3 mt-4">
          {[
            { title: "Prompt — novo projeto remixado", text: PROMPT_NEW_PROJECT, icon: Rocket },
            { title: "Prompt — atualizar restaurante clonado", text: PROMPT_UPDATE_PROJECT, icon: RefreshCw },
            { title: "Prompt — validar paridade com Master", text: PROMPT_VALIDATE, icon: ListChecks },
            { title: "Checklist — novo restaurante", text: NEW_RESTAURANT_CHECKLIST, icon: ClipboardList },
            { title: "Guia — propagação de updates", text: docUpdateGuide, icon: GitBranch },
            { title: "Checklist — atualização de restaurante", text: docRestaurantUpdate, icon: ListChecks },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <Card key={p.title}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      {p.title}
                    </CardTitle>
                    <CopyButton text={p.text} label={p.title} />
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/50 p-3 rounded text-xs whitespace-pre-wrap [overflow-wrap:anywhere] font-mono max-h-48 overflow-auto">
                    {p.text}
                  </pre>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* HISTORICO */}
        <TabsContent value="history" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Histórico de updates (banco)</h3>
            <Button variant="outline" size="sm" asChild>
              <Link to={nav.admin("template-version")}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Registrar novo update
              </Link>
            </Button>
          </div>
          {history.length === 0 ? (
            <Card><CardContent className="py-6 text-sm text-muted-foreground text-center">Nenhum update registrado ainda.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <Card key={h.id}>
                  <CardContent className="p-3 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={h.success ? "default" : "destructive"}>v{h.version}</Badge>
                      <Badge variant="outline">{h.update_type}</Badge>
                      {h.requires_apk_rebuild && (
                        <Badge variant="secondary"><Smartphone className="h-3 w-3 mr-1" />APK rebuild</Badge>
                      )}
                      {h.project_name && <span className="font-bold">{h.project_name}</span>}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(h.applied_at).toLocaleString("pt-PT")}
                      </span>
                    </div>
                    {h.migration_names.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 [overflow-wrap:anywhere]">
                        Migrations: {h.migration_names.join(", ")}
                      </p>
                    )}
                    {h.notes && <p className="text-xs mt-1 [overflow-wrap:anywhere]">{h.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CHANGELOG_TEMPLATE.md
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FilePreview content={docChangelog} />
              <div className="mt-3">
                <CopyButton text={docChangelog} label="Changelog" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMANDOS */}
        <TabsContent value="commands" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Atualizar código (clone)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-xs font-mono">{GIT_COMMANDS}</pre>
              <div className="mt-2"><CopyButton text={GIT_COMMANDS} label="Comandos git" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Rebuild APK Android
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-xs font-mono">{GIT_NATIVE}</pre>
              <div className="mt-2"><CopyButton text={GIT_NATIVE} label="Comandos Android" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Atalhos úteis
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-2">
              <Button variant="outline" asChild><Link to={nav.admin("template-version")}><GitBranch className="h-3.5 w-3.5 mr-1.5" />Versão do Template</Link></Button>
              <Button variant="outline" asChild><Link to={nav.admin("diagnostics-hub")}><ListChecks className="h-3.5 w-3.5 mr-1.5" />Centro de Testes</Link></Button>
              <Button variant="outline" asChild><Link to={nav.admin("branding")}><Brush className="h-3.5 w-3.5 mr-1.5" />Identidade visual</Link></Button>
              <Button variant="outline" asChild><Link to={nav.admin("menu")}><FileText className="h-3.5 w-3.5 mr-1.5" />Cardápio</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
