import { useEffect, useState } from "react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Save, Globe, Bell, Shield, Database, Mail, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const SettingsPage = () => {
  const { settings, isLoading, save, isSaving } = usePlatformSettings();

  const [platformName, setPlatformName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [shortName, setShortName] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("pt");
  const [defaultCurrency, setDefaultCurrency] = useState("BRL");
  const [defaultTimezone, setDefaultTimezone] = useState("America/Sao_Paulo");

  const [allowSignup, setAllowSignup] = useState(false);
  const [defaultPlan, setDefaultPlan] = useState("free");
  const [defaultMaxOrders, setDefaultMaxOrders] = useState(500);
  const [trialDays, setTrialDays] = useState(14);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [overLimitAlerts, setOverLimitAlerts] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);

  const [require2FA, setRequire2FA] = useState(false);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [sessionHours, setSessionHours] = useState(24);

  const [aiAutoMenu, setAiAutoMenu] = useState(true);
  const [aiAutoImages, setAiAutoImages] = useState(true);
  const [aiImageStyle, setAiImageStyle] = useState("realistic");

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  useEffect(() => {
    if (!settings) return;
    setPlatformName(settings.platform_name);
    setDisplayName((settings as { display_name?: string }).display_name || settings.platform_name || "Kebab Turco");
    setShortName((settings as { short_name?: string }).short_name || "Kebab Turco");
    setMetaDescription((settings as { meta_description?: string }).meta_description || "");
    setSupportEmail(settings.support_email);
    setDefaultLanguage(settings.default_language);
    setDefaultCurrency(settings.default_currency);
    setDefaultTimezone(settings.default_timezone);
    setAllowSignup(settings.allow_signup);
    setDefaultPlan(settings.default_plan);
    setDefaultMaxOrders(settings.default_max_orders);
    setTrialDays(settings.trial_days);
    setEmailNotifications(settings.email_notifications);
    setOverLimitAlerts(settings.over_limit_alerts);
    setDailySummary(settings.daily_summary);
    setRequire2FA(settings.require_2fa);
    setPasswordMinLength(settings.password_min_length);
    setSessionHours(settings.session_hours);
    setAiAutoMenu(settings.ai_auto_menu);
    setAiAutoImages(settings.ai_auto_images);
    setAiImageStyle(settings.ai_image_style);
    setMaintenanceMode(settings.maintenance_mode);
    setMaintenanceMessage(settings.maintenance_message);
  }, [settings]);

  const persist = async (section: string, patch: Record<string, unknown>) => {
    try {
      await save(patch);
      toast.success(`${section} salvas`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PremiumPageHeader
        icon={SettingsIcon}
        title="Configurações globais"
        subtitle="Tudo aqui é persistido e aplicado em toda a plataforma."
      />

      <Tabs defaultValue="platform" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="platform"><Globe className="w-4 h-4 mr-1.5" /> Plataforma</TabsTrigger>
          <TabsTrigger value="onboarding"><Database className="w-4 h-4 mr-1.5" /> Clientes & Limites</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-1.5" /> Notificações</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-4 h-4 mr-1.5" /> Segurança</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="w-4 h-4 mr-1.5" /> IA</TabsTrigger>
          <TabsTrigger value="system"><Mail className="w-4 h-4 mr-1.5" /> Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle>Identidade da plataforma</CardTitle>
              <CardDescription>Dados básicos exibidos para todos os clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Nome da plataforma (interno)</Label><Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} /></div>
              <div><Label>Título no browser</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Kebab Turco" /></div>
              <div><Label>Nome curto (telemóvel)</Label><Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Kebab Turco" /></div>
              <div><Label>Descrição pública</Label><Input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Gestão white-label de restaurantes" /></div>
              <div><Label>E-mail de suporte</Label><Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Idioma padrão</Label>
                  <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Moeda padrão</Label>
                  <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (BRL)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fuso horário</Label>
                  <Select value={defaultTimezone} onValueChange={setDefaultTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                      <SelectItem value="America/Bogota">Bogotá (COT)</SelectItem>
                      <SelectItem value="America/Mexico_City">Cidade do México</SelectItem>
                      <SelectItem value="Europe/Madrid">Madrid (CET)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button disabled={isSaving} onClick={() => persist("Plataforma", { platform_name: platformName, display_name: displayName, short_name: shortName, meta_description: metaDescription, support_email: supportEmail, default_language: defaultLanguage, default_currency: defaultCurrency, default_timezone: defaultTimezone })}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding e limites padrão</CardTitle>
              <CardDescription>Definições aplicadas a novos clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-base">Permitir cadastro público</Label>
                  <p className="text-xs text-muted-foreground">Se desativado, só você pode criar novos clientes.</p>
                </div>
                <Switch checked={allowSignup} onCheckedChange={setAllowSignup} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Plano padrão</Label>
                  <Select value={defaultPlan} onValueChange={setDefaultPlan}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Pedidos/mês padrão</Label><Input type="number" min={0} value={defaultMaxOrders} onChange={(e) => setDefaultMaxOrders(Number(e.target.value))} /></div>
                <div><Label>Dias de teste grátis</Label><Input type="number" min={0} max={90} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} /></div>
              </div>
              <Button disabled={isSaving} onClick={() => persist("Limites", { allow_signup: allowSignup, default_plan: defaultPlan, default_max_orders: defaultMaxOrders, trial_days: trialDays })}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notificações do administrador</CardTitle>
              <CardDescription>Quando você quer ser avisado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "email", label: "Receber por e-mail", desc: "Eventos importantes vão para o seu e-mail.", val: emailNotifications, set: setEmailNotifications },
                { key: "limit", label: "Alertar quando cliente passar do limite", desc: "Notificação quando um tenant ultrapassa pedidos/mês.", val: overLimitAlerts, set: setOverLimitAlerts },
                { key: "daily", label: "Resumo diário", desc: "Receba um resumo de faturamento todo dia às 9h.", val: dailySummary, set: setDailySummary },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                  <div>
                    <Label className="text-base">{n.label}</Label>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch checked={n.val} onCheckedChange={n.set} />
                </div>
              ))}
              <Button disabled={isSaving} onClick={() => persist("Notificações", { email_notifications: emailNotifications, over_limit_alerts: overLimitAlerts, daily_summary: dailySummary })}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Segurança e acesso</CardTitle>
              <CardDescription>Políticas aplicadas a todos os usuários.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">Exigir 2FA para administradores</Label>
                  <p className="text-xs text-muted-foreground">Ativa autenticação em duas etapas obrigatória.</p>
                </div>
                <Switch checked={require2FA} onCheckedChange={setRequire2FA} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Tamanho mínimo de senha</Label><Input type="number" min={6} max={32} value={passwordMinLength} onChange={(e) => setPasswordMinLength(Number(e.target.value))} /></div>
                <div><Label>Duração da sessão (horas)</Label><Input type="number" min={1} max={720} value={sessionHours} onChange={(e) => setSessionHours(Number(e.target.value))} /></div>
              </div>
              <Button disabled={isSaving} onClick={() => persist("Segurança", { require_2fa: require2FA, password_min_length: passwordMinLength, session_hours: sessionHours })}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>Inteligência Artificial</CardTitle>
              <CardDescription>Define como a IA ajuda você ao criar novos clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">Geração automática de cardápio</Label>
                  <p className="text-xs text-muted-foreground">Cole o cardápio em texto e a IA cria categorias e produtos.</p>
                </div>
                <Switch checked={aiAutoMenu} onCheckedChange={setAiAutoMenu} />
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">Gerar imagens dos produtos automaticamente</Label>
                  <p className="text-xs text-muted-foreground">Cria imagens fotorrealistas baseadas em cada item do cardápio.</p>
                </div>
                <Switch checked={aiAutoImages} onCheckedChange={setAiAutoImages} />
              </div>
              <div>
                <Label>Estilo visual padrão das imagens</Label>
                <Select value={aiImageStyle} onValueChange={setAiImageStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">Fotorrealista (Uber Eats / iFood)</SelectItem>
                    <SelectItem value="3d">3D estilizado (Pixar)</SelectItem>
                    <SelectItem value="flatlay">Flatlay (vista de cima)</SelectItem>
                    <SelectItem value="minimal">Minimalista (fundo neutro)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Pode ser ajustado por cliente individualmente.</p>
              </div>
              <Button disabled={isSaving} onClick={() => persist("IA", { ai_auto_menu: aiAutoMenu, ai_auto_images: aiAutoImages, ai_image_style: aiImageStyle })}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>Modo de manutenção</CardTitle>
              <CardDescription>Bloqueia temporariamente o acesso para todos os clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">Ativar manutenção</Label>
                  <p className="text-xs text-muted-foreground">Mostra aviso para todos os totens e painéis.</p>
                </div>
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
              <div>
                <Label>Mensagem exibida</Label>
                <Textarea value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)} rows={3} />
              </div>
              <Button disabled={isSaving} onClick={() => persist("Sistema", { maintenance_mode: maintenanceMode, maintenance_message: maintenanceMessage })}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;