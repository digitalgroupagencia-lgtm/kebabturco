import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMarketingFunnel, type MarketingFunnelStats } from "@/lib/marketingAnalytics";

type Props = {
  storeId: string | undefined;
};

export default function MarketingFunnelPanel({ storeId }: Props) {
  const [stats, setStats] = useState<MarketingFunnelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    void (async () => {
      setLoading(true);
      const data = await fetchMarketingFunnel(storeId, 30);
      setStats(data);
      setLoading(false);
    })();
  }, [storeId]);

  if (!storeId) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Funil de conversão (30 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !stats ? (
          <p className="text-sm text-muted-foreground">
            Execute a migração SQL no Supabase para activar estatísticas.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-2xl font-black tabular-nums">{stats.menu_views}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Viram o menu</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-2xl font-black tabular-nums">{stats.cart_starts}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Abriram carrinho</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-2xl font-black tabular-nums">{stats.checkout_starts}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Foram pagar</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-2xl font-black tabular-nums">{stats.orders_completed}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Compraram</p>
            </div>
          </div>
        )}
        {stats && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Taxa de abandono (menu → compra):{" "}
            <span className="font-bold text-foreground">{stats.abandon_rate_pct}%</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
