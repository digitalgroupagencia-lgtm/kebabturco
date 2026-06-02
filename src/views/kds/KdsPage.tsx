import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Volume2, VolumeX, Maximize, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";

type KdsOrder = {
  id: string;
  order_number: string;
  customer_name: string | null;
  table_number: string | null;
  order_type: string | null;
  status: string;
  total: number;
  created_at: string;
};

const STATUS_COLUMN_KEYS = [
  { key: "new", labelKey: "kds.col.new" as const, tone: "border-red-500/60 bg-red-500/5" },
  { key: "preparing", labelKey: "kds.col.preparing" as const, tone: "border-amber-500/60 bg-amber-500/5" },
  { key: "ready", labelKey: "kds.col.ready" as const, tone: "border-emerald-500/60 bg-emerald-500/5" },
];


const NEW_STATUSES = new Set(["pending", "confirmed", "new"]);
const PREP_STATUSES = new Set(["preparing", "in_preparation"]);
const READY_STATUSES = new Set(["ready", "ready_for_pickup", "out_for_delivery"]);

function bucketFor(status: string): string | null {
  if (NEW_STATUSES.has(status)) return "new";
  if (PREP_STATUSES.has(status)) return "preparing";
  if (READY_STATUSES.has(status)) return "ready";
  return null;
}

function elapsedMin(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

// Beep sintetizado (sem ficheiro externo) — onda quadrada curta
function playBeep() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 880;
    g.gain.value = 0.25;
    o.connect(g).connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.frequency.value = 660;
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 180);
    }, 180);
  } catch {
    /* ignore */
  }
}

const KdsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { storeId } = useAdminStoreId();
  const { t } = useStaffT();

  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [tick, setTick] = useState(0);
  const knownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, table_number, order_type, status, total, created_at")
        .eq("store_id", storeId)
        .in("status", ["pending", "preparing", "ready", "out_for_delivery"])
        .order("created_at", { ascending: true })
        .limit(200);
      if (!active) return;
      const list = (data ?? []) as KdsOrder[];
      knownIds.current = new Set(list.map((o) => o.id));
      setOrders(list);
      setLoading(false);
    };
    void load();

    const ch = supabase
      .channel(`kds:${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const o = payload.new as KdsOrder;
            setOrders((prev) => [...prev, o]);
            if (!knownIds.current.has(o.id)) {
              knownIds.current.add(o.id);
              if (soundOn) playBeep();
            }
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) => prev.map((p) => (p.id === (payload.new as any).id ? { ...p, ...(payload.new as any) } : p)));
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
          }
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [storeId, soundOn]);

  const grouped = useMemo(() => {
    const out: Record<string, KdsOrder[]> = { new: [], preparing: [], ready: [] };
    for (const o of orders) {
      const b = bucketFor(o.status);
      if (b) out[b].push(o);
    }
    return out;
  }, [orders, tick]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3 p-6 text-center">
        <ChefHat className="h-12 w-12" />
        <p className="text-xl font-bold">{t("kds.gate.title")}</p>
        <p className="text-sm text-slate-400">{t("kds.gate.body")}</p>
        <Button asChild>
          <a href="/staff">{t("kds.gate.signin")}</a>
        </Button>
      </div>
    );
  }
  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>{t("common.no_store")}</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-black">{t("kds.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={soundOn ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSoundOn((v) => !v);
              if (!soundOn) playBeep();
            }}
            className="gap-1"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundOn ? "Som ON" : "Activar som"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const el = document.documentElement;
              if (!document.fullscreenElement) void el.requestFullscreen?.();
              else void document.exitFullscreen?.();
            }}
            className="gap-1"
          >
            <Maximize className="h-4 w-4" /> Tela cheia
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 overflow-hidden">
          {STATUS_COLUMNS.map((col) => (
            <section
              key={col.key}
              className={`rounded-2xl border-2 ${col.tone} flex flex-col overflow-hidden`}
            >
              <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-wide">{col.label}</h2>
                <span className="text-2xl font-black tabular-nums">{grouped[col.key].length}</span>
              </header>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {grouped[col.key].length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-6">—</p>
                ) : (
                  grouped[col.key].map((o) => {
                    const min = elapsedMin(o.created_at);
                    const urgent = min >= 15;
                    return (
                      <article
                        key={o.id}
                        className={`rounded-xl bg-slate-900 border ${
                          urgent ? "border-red-500 animate-pulse" : "border-slate-700"
                        } p-4 shadow-lg`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-4xl font-black tabular-nums">#{o.order_number}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              urgent ? "bg-red-600" : "bg-slate-700"
                            }`}
                          >
                            {min}m
                          </span>
                        </div>
                        <p className="font-bold text-base truncate">{o.customer_name || "Cliente"}</p>
                        <p className="text-sm text-slate-400 uppercase tracking-wide">
                          {o.order_type === "delivery"
                            ? "Delivery"
                            : o.order_type === "dine_in"
                              ? `Mesa ${o.table_number ?? "—"}`
                              : "Balcão"}
                        </p>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default KdsPage;
