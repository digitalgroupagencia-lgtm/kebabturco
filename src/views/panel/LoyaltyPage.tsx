import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { toast } from "sonner";
import { Gift, Megaphone, Plus, ChevronDown } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <HowToUsePanel
        purpose="Programa de carimbos para retorno de clientes (a cada N pedidos ganha um prêmio)."
        whenToUse="Retenção contínua. Para campanhas pontuais use Cupons."
        steps={[
          "Defina quantos carimbos para ganhar um prêmio (ex: 10).",
          "Escreva o prêmio (ex: 1 kebab grátis).",
          "Ative o programa. Cada pedido pago soma 1 carimbo ao telefone do cliente.",
          "Em 'Campanhas' crie mensagens automáticas (cliente inativo, aniversário, prêmio próximo).",
        ]}
        howToConfirm="Faça um pedido teste com um telefone novo e veja o carimbo subir na lista."
        assistantQuestion="Que regra de fidelidade dá melhor retenção sem virar prejuízo?"
      />
      <div>
        <h2 className="text-xl font-black flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Fidelidade
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {STAMPS_NEEDED} carimbos = recompensa · {accounts.length} clientes
          {readyCount > 0 && ` · ${readyCount} prémio(s) prontos`}
        </p>
      </div>

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
            <OpsCompactCard
              key={a.id}
              title={a.phone}
              summary={`${a.stamps}/${STAMPS_NEEDED} carimbos · ${a.total_orders} pedidos`}
              meta={a.rewards_redeemed > 0 ? `${a.rewards_redeemed} prémios já resgatados` : undefined}
              badges={a.stamps >= STAMPS_NEEDED ? ["Prémio pronto"] : []}
              editable={false}
              actions={
                a.stamps >= STAMPS_NEEDED ? (
                  <Button size="sm" className="h-9 font-bold text-xs" onClick={() => resetStamps(a.id)}>
                    Resgatar
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    {STAMPS_NEEDED - a.stamps} faltam
                  </Badge>
                )
              }
            />
          ))}
          {accounts.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded-2xl">
              Ainda sem clientes no programa
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-primary" />
            Campanhas
          </h3>
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs" onClick={() => setCreateOpen((v) => !v)}>
            <Plus className="w-4 h-4 mr-1" />
            {createOpen ? "Fechar" : "Nova"}
          </Button>
        </div>

        {createOpen && (
          <div className="rounded-2xl border bg-card p-3.5 space-y-2.5 mb-2 shadow-sm">
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
          </div>
        )}

        <div className="space-y-2">
          {campaigns.map((c) => (
            <OpsCompactCard
              key={c.id}
              title={c.name}
              summary={`${c.campaign_type} · ${c.trigger_days ?? "—"} dias`}
              meta={c.message_template.length > 48 ? `${c.message_template.slice(0, 48)}…` : c.message_template}
              inactive={!c.is_active}
              badges={c.is_active ? ["Activa"] : ["Pausada"]}
              editable={false}
              actions={<Switch checked={c.is_active} onCheckedChange={() => toggleCampaign(c)} />}
            />
          ))}
          {campaigns.length === 0 && !createOpen && (
            <p className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded-2xl">
              Nenhuma campanha
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPage;
