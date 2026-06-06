import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Gift, Megaphone, Plus, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { PremiumActionButton } from "@/components/premium/PremiumActionButton";
import { PremiumEmptyState } from "@/components/premium/PremiumEmptyState";
import { PremiumStatusBadge } from "@/components/premium/PremiumStatusBadge";

type LoyaltyRow = {
  id: string;
  phone: string;
  stamps: number;
  total_orders: number;
  rewards_redeemed: number;
};

type Campaign = {
  id: string;
  name: string;
  campaign_type: string;
  message_template: string;
  is_active: boolean;
  trigger_days: number | null;
};

const STAMPS_NEEDED = 10;

const LoyaltyPage = () => {
  const { storeId } = useAdminStoreId();
  const [accounts, setAccounts] = useState<LoyaltyRow[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campName, setCampName] = useState("");
  const [campMessage, setCampMessage] = useState("Hace tiempo que no pides — ¡te echamos de menos!");
  const [createOpen, setCreateOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(true);

  const load = async () => {
    if (!storeId) return;
    const [{ data: loyalty }, { data: camps }] = await Promise.all([
      supabase.from("loyalty_accounts").select("*").eq("store_id", storeId).order("stamps", { ascending: false }).limit(50),
      supabase.from("marketing_campaigns").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
    ]);
    setAccounts((loyalty as LoyaltyRow[]) || []);
    setCampaigns((camps as Campaign[]) || []);
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const resetStamps = async (id: string) => {
    const row = accounts.find((a) => a.id === id);
    if (!row) return;
    await supabase
      .from("loyalty_accounts")
      .update({ stamps: 0, rewards_redeemed: row.rewards_redeemed + 1 })
      .eq("id", id);
    toast.success("Prémio resgatado");
    load();
  };

  const createCampaign = async () => {
    if (!storeId || !campName.trim()) return;
    const { error } = await supabase.from("marketing_campaigns").insert({
      store_id: storeId,
      name: campName.trim(),
      campaign_type: "winback",
      message_template: campMessage,
      trigger_days: 30,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Campanha criada");
    setCampName("");
    setCreateOpen(false);
    load();
  };

  const toggleCampaign = async (c: Campaign) => {
    await supabase.from("marketing_campaigns").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  if (!storeId) return <div className="p-6 text-sm text-muted-foreground">Sem loja vinculada</div>;

  const readyCount = accounts.filter((a) => a.stamps >= STAMPS_NEEDED).length;

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-[#050505] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-5">
      <PremiumPageHeader
        title="Fidelidade"
        subtitle={`${STAMPS_NEEDED} carimbos = recompensa`}
        actions={
          <PremiumActionButton tone={createOpen ? "secondary" : "primary"} onClick={() => setCreateOpen((v) => !v)}>
            <Plus className="w-4 h-4 mr-1" />
            {createOpen ? "Fechar" : "Nova campanha"}
          </PremiumActionButton>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <PremiumMetricCard title="Clientes no programa" value={accounts.length} subtitle="total registado" icon={Gift} color="brand" />
        <PremiumMetricCard title="Pontos emitidos" value={accounts.reduce((sum, acc) => sum + acc.stamps, 0)} subtitle="carimbos ativos" icon={Gift} color="blue" />
        <PremiumMetricCard title="Recompensas resgatadas" value={accounts.reduce((sum, acc) => sum + acc.rewards_redeemed, 0)} subtitle="histórico" icon={Gift} color="green" />
        <PremiumMetricCard title="Próximos da recompensa" value={accounts.filter((acc) => acc.stamps >= STAMPS_NEEDED - 2).length} subtitle="quase lá" icon={Gift} color="orange" />
        <PremiumMetricCard title="Receita fiel" value={`€ ${(accounts.reduce((sum, acc) => sum + acc.total_orders * 9.5, 0)).toFixed(2)}`} subtitle="estimativa" icon={Megaphone} color="purple" />
      </section>

      <Collapsible open={clientsOpen} onOpenChange={setClientsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between rounded-2xl border bg-card px-3.5 py-3 shadow-sm"
          >
            <span className="text-sm font-bold">Clientes com carimbos</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${clientsOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {accounts.map((a) => (
            <PremiumCard key={a.id} className="bg-[#111111]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{a.phone}</p>
                  <p className="text-xs text-zinc-500">{a.stamps}/{STAMPS_NEEDED} carimbos · {a.total_orders} pedidos</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.stamps >= STAMPS_NEEDED ? (
                    <PremiumActionButton className="h-9 px-3 text-xs" onClick={() => resetStamps(a.id)}>
                      Resgatar
                    </PremiumActionButton>
                  ) : (
                    <PremiumStatusBadge status="neutral">{STAMPS_NEEDED - a.stamps} faltam</PremiumStatusBadge>
                  )}
                </div>
              </div>
            </PremiumCard>
          ))}
          {accounts.length === 0 && (
            <PremiumEmptyState icon={Gift} title="Sem clientes no programa" description="Convide clientes a acumular pontos para começar." />
          )}
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-2">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Megaphone className="w-4 h-4 text-primary" />
          Campanhas
        </h3>

        {createOpen && (
          <PremiumCard className="bg-[#111111]">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                placeholder="Recuperar inactivos 30d"
                className="h-10 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Mensagem</Label>
              <Input value={campMessage} onChange={(e) => setCampMessage(e.target.value)} className="h-10 mt-1" />
            </div>
            <Button className="w-full h-11 font-bold" onClick={createCampaign}>
              Criar campanha
            </Button>
          </PremiumCard>
        )}

        <div className="space-y-2">
          {campaigns.map((c) => (
            <PremiumCard key={c.id} className="bg-[#111111]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-zinc-500">
                    {c.campaign_type} · {c.trigger_days ?? "—"} dias · {c.message_template.length > 48 ? `${c.message_template.slice(0, 48)}…` : c.message_template}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PremiumStatusBadge status={c.is_active ? "success" : "neutral"}>
                    {c.is_active ? "Ativa" : "Pausada"}
                  </PremiumStatusBadge>
                  <Switch checked={c.is_active} onCheckedChange={() => toggleCampaign(c)} />
                </div>
              </div>
            </PremiumCard>
          ))}
          {campaigns.length === 0 && !createOpen && (
            <PremiumEmptyState icon={Megaphone} title="Nenhuma campanha ativa" description="Crie uma campanha para recuperar clientes inativos." />
          )}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPage;
