import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { supabase as _sb } from "@/integrations/supabase/client";

const supabase = _sb as unknown as any;

type DriverStat = {
  driver_user_id: string;
  driver_name: string;
  reviews_count: number;
  avg_rating: number;
  last_review_at: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  driver_name: string | null;
  driver_user_id: string | null;
  customer_name: string | null;
  order_type: string | null;
  created_at: string;
};

export default function ReviewsPage() {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const [stats, setStats] = useState<DriverStat[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [s, r] = await Promise.all([
        supabase
          .from("driver_review_stats")
          .select("*")
          .eq("store_id", storeId)
          .order("avg_rating", { ascending: false }),
        supabase
          .from("order_reviews")
          .select("id, rating, comment, driver_name, driver_user_id, customer_name, order_type, created_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (!active) return;
      setStats((s.data as DriverStat[]) || []);
      setReviews((r.data as Review[]) || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [storeId]);

  if (storeLoading || loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> A carregar avaliações...
      </div>
    );
  }

  if (!storeId) return <div className="p-8 text-muted-foreground">Nenhuma loja vinculada.</div>;

  const renderStars = (n: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.round(n) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-black">Avaliações de entregadores</h1>
        <p className="text-sm text-muted-foreground">
          Notas e comentários deixados pelos clientes após receberem o pedido.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Resumo por entregador
        </h2>
        {stats.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            Ainda não há avaliações de entregadores.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((s) => (
              <div key={s.driver_user_id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{s.driver_name || "Entregador"}</p>
                  <span className="text-xs text-muted-foreground">{s.reviews_count} aval.</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {renderStars(s.avg_rating)}
                  <span className="text-sm font-black tabular-nums">{Number(s.avg_rating).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Últimas avaliações
        </h2>
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            Sem avaliações ainda.
          </div>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {renderStars(r.rating)}
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                {r.comment && <p className="text-sm">{r.comment}</p>}
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {r.driver_name && <span>Entregador: <strong>{r.driver_name}</strong></span>}
                  {r.customer_name && <span>Cliente: {r.customer_name}</span>}
                  {r.order_type && <span>Tipo: {r.order_type}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
