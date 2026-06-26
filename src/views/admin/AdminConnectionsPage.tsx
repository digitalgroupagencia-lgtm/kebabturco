import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Apple,
  Bell,
  CheckCircle2,
  Circle,
  Copy,
  CreditCard,
  Database,
  ExternalLink,
  Flame,
  Globe,
  Link2,
  Play,
  RefreshCw,
  Save,
  Store,
  Tablet,
  Terminal,
} from "lucide-react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isGeneralAdmin } from "@/lib/projectAccess";
import {
  CONNECTION_TABS,
  REMIX_FAQ,
  filterStepsForDeployMode,
  type ConnectionTab,
} from "@/lib/admin/connectionsPlaybook";
import {
  KEBAB_TURCO_PROFILE,
  buildConnectionVars,
  deriveBundleIds,
  interpolateConnectionText,
  loadConnectionChecks,
  loadConnectionsProfile,
  saveConnectionCheck,
  saveConnectionsProfile,
  slugifyProjectName,
  type ConnectionsProfile,
  type DeployMode,
} from "@/lib/admin/connectionsProfile";

const TAB_ICONS: Record<string, typeof Store> = {
  projeto: Store,
  lovable: Database,
  stripe: CreditCard,
  firebase: Flame,
  apple: Apple,
  google: Play,
  webpush: Bell,
  tablet: Tablet,
  cursor: Terminal,
  dominio: Globe,
};

function copyText(text: string, label?: string) {
  void navigator.clipboard.writeText(text);
  toast({ title: "Copiado", description: label ?? text.slice(0, 60) });
}

function renderMarkdownLite(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function StepCard({
  stepId,
  title,
  body,
  pasteHint,
  copyValue,
  link,
  linkLabel,
  checked,
  onCheck,
}: {
  stepId: string;
  title: string;
  body: string;
  pasteHint?: string;
  copyValue?: string;
  link?: string;
  linkLabel?: string;
  checked: boolean;
  onCheck: (id: string, done: boolean) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        checked ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex gap-3">
        <Checkbox
          id={stepId}
          checked={checked}
          onCheckedChange={(v) => onCheck(stepId, v === true)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <label htmlFor={stepId} className="font-semibold text-sm cursor-pointer flex items-center gap-2">
            {checked ? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            {title}
          </label>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {renderMarkdownLite(body)}
          </p>
          {pasteHint && (
            <p className="text-xs rounded-lg bg-amber-500/10 text-amber-900 dark:text-amber-200 px-2 py-1.5 border border-amber-500/20">
              Colar em: <span className="font-medium">{pasteHint}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {copyValue && (
              <Button type="button" variant="outline" size="sm" onClick={() => copyText(copyValue, title)}>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copiar valor
              </Button>
            )}
            {link && link.startsWith("http") && (
              <Button type="button" variant="ghost" size="sm" asChild>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  {linkLabel ?? "Abrir"}
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabProgress({ tab, checks, mode }: { tab: ConnectionTab; checks: Record<string, boolean>; mode: DeployMode }) {
  const steps = filterStepsForDeployMode(tab.steps, mode);
  const done = steps.filter((s) => checks[s.id]).length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
      <Progress value={pct} className="h-1.5 flex-1 max-w-[200px]" />
      <span>
        {done}/{steps.length} passos
      </span>
    </div>
  );
}

export default function AdminConnectionsPage() {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const [profile, setProfile] = useState<ConnectionsProfile>(() => loadConnectionsProfile());
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("projeto");

  const vars = useMemo(() => buildConnectionVars(profile), [profile]);
  const slug = vars.projectSlug;

  useEffect(() => {
    setChecks(loadConnectionChecks(slug));
  }, [slug]);

  const handleCheck = useCallback(
    (stepId: string, done: boolean) => {
      setChecks((prev) => {
        const next = { ...prev };
        if (done) next[stepId] = true;
        else delete next[stepId];
        return next;
      });
      saveConnectionCheck(slug, stepId, done);
    },
    [slug],
  );

  const saveProfile = () => {
    saveConnectionsProfile(profile);
    toast({ title: "Perfil guardado", description: "Os textos do checklist foram atualizados." });
  };

  const resetToKebabTurco = () => {
    setProfile({ ...KEBAB_TURCO_PROFILE });
    saveConnectionsProfile(KEBAB_TURCO_PROFILE);
    toast({ title: "Modelo Kebab Turco", description: "Perfil reposto com os valores atuais do projeto." });
  };

  const applySlugFromName = () => {
    const newSlug = slugifyProjectName(profile.projectName);
    const bundles = deriveBundleIds(newSlug, profile.domain);
    setProfile((p) => ({
      ...p,
      projectSlug: newSlug,
      iosBundleId: bundles.ios,
      androidPackage: bundles.android,
      codemagicIntegration: newSlug,
      lovableProjectName: newSlug,
      githubRepo: newSlug,
      firebaseProjectId: `${newSlug}-app`,
    }));
  };

  const totalSteps = useMemo(() => {
    return CONNECTION_TABS.reduce((acc, tab) => {
      return acc + filterStepsForDeployMode(tab.steps, profile.deployMode).length;
    }, 0);
  }, [profile.deployMode]);

  const totalDone = useMemo(() => {
    return CONNECTION_TABS.reduce((acc, tab) => {
      return (
        acc +
        filterStepsForDeployMode(tab.steps, profile.deployMode).filter((s) => checks[s.id]).length
      );
    }, 0);
  }, [checks, profile.deployMode]);

  const overallPct = totalSteps ? Math.round((totalDone / totalSteps) * 100) : 0;

  if (roleLoading) {
    return <div className="p-8 text-muted-foreground">A carregar…</div>;
  }

  if (!isGeneralAdmin(roleData?.role)) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertTitle>Acesso restrito</AlertTitle>
        <AlertDescription>Esta página é exclusiva do Admin Master.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PremiumPageHeader
        icon={Link2}
        title="Conexões"
        subtitle="Checklist completo para ligar serviços externos ao novo restaurante."
        badge={
          <Badge variant="secondary" className="font-normal">
            {overallPct}% concluído
          </Badge>
        }
        actions={
          <Button type="button" variant="outline" size="sm" onClick={resetToKebabTurco}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Usar modelo Kebab Turco
          </Button>
        }
      />

      <Alert>
        <AlertTitle>{REMIX_FAQ.title}</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            {REMIX_FAQ.points.map((p, i) => (
              <li key={i}>{renderMarkdownLite(p)}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progresso geral</CardTitle>
          <CardDescription>
            {totalDone} de {totalSteps} passos marcados para «{profile.projectName}»
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={overallPct} className="h-2" />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          {CONNECTION_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id] ?? Store;
            const tabSteps = filterStepsForDeployMode(tab.steps, profile.deployMode);
            const tabDone = tabSteps.filter((s) => checks[s.id]).length;
            const complete = tabSteps.length > 0 && tabDone === tabSteps.length;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Icon className="w-4 h-4 mr-1.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
                {complete && <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-primary" />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CONNECTION_TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
                <CardDescription>{tab.intro}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tab.id === "projeto" && (
                  <div className="space-y-4 pb-4 border-b border-border mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Nome do restaurante / app</Label>
                        <Input
                          value={profile.projectName}
                          onChange={(e) => setProfile((p) => ({ ...p, projectName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Slug (certificados, keystore)</Label>
                        <div className="flex gap-2">
                          <Input
                            value={profile.projectSlug}
                            onChange={(e) => setProfile((p) => ({ ...p, projectSlug: e.target.value }))}
                          />
                          <Button type="button" variant="secondary" onClick={applySlugFromName}>
                            Gerar
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>Domínio (sem https)</Label>
                        <Input
                          value={profile.domain}
                          onChange={(e) => setProfile((p) => ({ ...p, domain: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Modo de entrega</Label>
                        <RadioGroup
                          value={profile.deployMode}
                          onValueChange={(v) => setProfile((p) => ({ ...p, deployMode: v as DeployMode }))}
                          className="mt-2 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="full-native" id="dm-full" />
                            <Label htmlFor="dm-full" className="font-normal cursor-pointer">
                              App completa (lojas + tablet)
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="tablet-capacitor" id="dm-tab" />
                            <Label htmlFor="dm-tab" className="font-normal cursor-pointer">
                              Só tablet Capacitor (sem lojas)
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="web-only" id="dm-web" />
                            <Label htmlFor="dm-web" className="font-normal cursor-pointer">
                              Só site / PWA
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label>iOS Bundle ID</Label>
                        <Input
                          value={profile.iosBundleId}
                          onChange={(e) => setProfile((p) => ({ ...p, iosBundleId: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Android package</Label>
                        <Input
                          value={profile.androidPackage}
                          onChange={(e) => setProfile((p) => ({ ...p, androidPackage: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>GitHub org / repo</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="org"
                            value={profile.githubOrg}
                            onChange={(e) => setProfile((p) => ({ ...p, githubOrg: e.target.value }))}
                          />
                          <Input
                            placeholder="repo"
                            value={profile.githubRepo}
                            onChange={(e) => setProfile((p) => ({ ...p, githubRepo: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Supabase project ref</Label>
                        <Input
                          value={profile.supabaseProjectRef}
                          onChange={(e) =>
                            setProfile((p) => ({
                              ...p,
                              supabaseProjectRef: e.target.value,
                              supabaseUrl: `https://${e.target.value}.supabase.co`,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Apple Team ID</Label>
                        <Input
                          value={profile.appleTeamId}
                          onChange={(e) => setProfile((p) => ({ ...p, appleTeamId: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Apple Team (nome)</Label>
                        <Input
                          value={profile.appleTeamName}
                          onChange={(e) => setProfile((p) => ({ ...p, appleTeamName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Firebase project ID</Label>
                        <Input
                          value={profile.firebaseProjectId}
                          onChange={(e) => setProfile((p) => ({ ...p, firebaseProjectId: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Codemagic integration</Label>
                        <Input
                          value={profile.codemagicIntegration}
                          onChange={(e) => setProfile((p) => ({ ...p, codemagicIntegration: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button type="button" onClick={saveProfile}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar perfil do projeto
                    </Button>
                  </div>
                )}

                <TabProgress tab={tab} checks={checks} mode={profile.deployMode} />

                <div className="space-y-3">
                  {filterStepsForDeployMode(tab.steps, profile.deployMode).map((step) => {
                    const body = interpolateConnectionText(step.body, vars);
                    const link = step.link ? interpolateConnectionText(step.link, vars) : undefined;
                    const copyValue = step.copyValueKey ? vars[step.copyValueKey] : undefined;
                    return (
                      <StepCard
                        key={step.id}
                        stepId={step.id}
                        title={step.title}
                        body={body}
                        pasteHint={step.pasteHint}
                        copyValue={copyValue}
                        link={link}
                        linkLabel={step.linkLabel}
                        checked={!!checks[step.id]}
                        onCheck={handleCheck}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
