import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import { CHART_TOKEN_HSL } from "@/lib/demoData";

type Row = { name: string; value: number; token: keyof typeof CHART_TOKEN_HSL };

type Props = {
  title: string;
  subtitle?: string;
  data: Row[];
  className?: string;
};

/**
 * Funil/pirâmide invertida — barras horizontais decrescentes centradas.
 * Não usa recharts (mais previsível e bonito com tokens).
 */
export default function FunnelChartCard({ title, subtitle, data, className }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <PremiumChartCard title={title} subtitle={subtitle} className={className}>
      <div className="space-y-2">
        {data.map((row) => {
          const pct = (row.value / max) * 100;
          const sidePad = (100 - pct) / 2;
          return (
            <div key={row.name} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-muted-foreground truncate">{row.name}</span>
              <div className="flex-1 h-7 relative bg-muted/40 rounded-md overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 rounded-md"
                  style={{
                    left: `${sidePad}%`,
                    right: `${sidePad}%`,
                    background: CHART_TOKEN_HSL[row.token],
                  }}
                />
              </div>
              <span className="w-12 text-right font-semibold tabular-nums text-foreground">{row.value}</span>
            </div>
          );
        })}
      </div>
    </PremiumChartCard>
  );
}