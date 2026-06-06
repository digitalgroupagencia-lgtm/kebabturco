import { ReactNode } from "react";
import { PremiumCard } from "./PremiumCard";

type PremiumChartCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  mode?: "dark" | "light";
  className?: string;
};

export function PremiumChartCard({
  title,
  subtitle,
  action,
  children,
  mode = "dark",
  className,
}: PremiumChartCardProps) {
  return (
    <PremiumCard title={title} subtitle={subtitle} action={action} mode={mode} className={className}>
      <div className="relative overflow-hidden rounded-xl">{children}</div>
    </PremiumCard>
  );
}
