import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, AlertCircle } from "lucide-react";

interface Props {
  tenantId: string;
}

/**
 * Mostra um aviso visual quando o tenant está perto ou acima do limite
 * mensal de pedidos do plano. Não bloqueia a operação.
 */
const TenantLimitBanner = ({ tenantId }: Props) => {
  const { data } = useQuery({
    queryKey: ["tenant-monthly-usage", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tenant_monthly_usage", {
        _tenant_id: tenantId,
      });
      if (error) throw error;
      return data?.[0];
    },
    enabled: !!tenantId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (!data) return null;

  const used = Number(data.used) || 0;
  const limit = Number(data.limit_max) || 0;
  const pct = Number(data.pct) || 0;
  const over = used >= limit && limit > 0;
  const near = !over && pct >= 80;

  if (!over && !near) return null;

  return (
    <div
      className={`mb-4 rounded-xl border p-3 sm:p-4 flex items-start gap-3 ${
        over
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : "bg-accent/15 border-accent/40 text-foreground"
      }`}
      role="alert"
    >
      {over ? (
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-accent-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm sm:text-base">
          {over
            ? "Você atingiu o limite mensal do seu plano"
            : `Atenção: ${Math.round(pct)}% do limite mensal usado`}
        </p>
        <p className="text-xs sm:text-sm opacity-90 mt-0.5">
          {used.toLocaleString()} de {limit.toLocaleString()} pedidos este mês.{" "}
          {over
            ? "Os pedidos continuam sendo aceitos, mas considere fazer upgrade para evitar interrupções."
            : "Considere revisar seu plano para evitar interrupções."}
        </p>
      </div>
    </div>
  );
};

export default TenantLimitBanner;
