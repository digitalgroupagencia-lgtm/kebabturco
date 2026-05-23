import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Gift, Megaphone, Plus } from "lucide-react";

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

  const load = async () => {
    if (!storeId) return;
    const [{ data: loyalty }, { data: camps }] = await Promise.all([
      supabase.from("loyalty_accounts").select("*").eq("store_id", storeId).order("stamps", { ascending: false }).limit(50),
      supabase.from("marketing_campaigns").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
    ]);
    setAccounts((loyalty as LoyaltyRow[]) || []);
    setCampaigns((camps as Campaign[]) || []);
  };

  useEffect(() => { load(); }, [storeId]);

  const resetStamps = async (id: string) => {
    await supabase.from("loyalty_accounts").update({ stamps: 0, rewards_redeemed: accounts.find((a) => a.id === id)!.rewards_redeemed + 1 }).eq("id", id);
    toast.success("Recompensa resgatada — carimbos zerados");
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
    if (error) toast.error(error.message);
    else {
      toast.success("Campanha criada");
      setCampName("");
      load();
    }
  };

  const toggleCampaign = async (c: Campaign) => {
    await supabase.from("marketing_campaigns").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  if (!storeId) return <div className="p-8 text-muted-foreground">Sem loja vinculada</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Gift className="w-6 h-6" /> Fidelidade & Campanhas</h2>

      <Card>
        <CardHeader><CardTitle>Programa de carimbos</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Cada pedido dá 1 carimbo. Ao completar {STAMPS_NEEDED} carimbos, o cliente ganha recompensa (gerir manualmente).</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-bold">{a.phone}</p>
                  <p className="text-sm text-muted-foreground">{a.stamps}/{STAMPS_NEEDED} carimbos · {a.total_orders} pedidos</p>
                </div>
                {a.stamps >= STAMPS_NEEDED && (
                  <Button size="sm" onClick={() => resetStamps(a.id)}>Resgatar prémio</Button>
                )}
              </div>
            ))}
            {accounts.length === 0 && <p className="text-muted-foreground text-sm">Ainda sem clientes no programa</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> Campanhas automáticas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Nome</Label><Input value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="Recuperar inactivos 30d" /></div>
            <div><Label>Mensagem</Label><Input value={campMessage} onChange={(e) => setCampMessage(e.target.value)} /></div>
          </div>
          <Button onClick={createCampaign}><Plus className="w-4 h-4 mr-1" /> Criar campanha win-back</Button>
          <div className="space-y-2 mt-4">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.campaign_type} · {c.trigger_days}d · {c.message_template}</p>
                </div>
                <Switch checked={c.is_active} onCheckedChange={() => toggleCampaign(c)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoyaltyPage;
