import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";
import { cn } from "@/lib/utils";

type Plan = {
  plan_key: string;
  name: string;
  description: string | null;
  sort_order: number;
};

const FEATURE_COUNTS: Record<PlanKey, number> = { start: 6, pro: 14, premium: 22 };

const HIGHLIGHTS: Record<PlanKey, string[]> = {
  start: ["Cardápio", "Pedidos online", "QR / Mesas", "Delivery básico", "Domínio", "Mobile"],
  pro: ["Tudo do START", "Push", "Fidelidade", "Campanhas", "Analytics", "Recuperação"],
  premium: ["Tudo do PRO", "IA completa", "Multi-unidade", "Apps nativas", "Dashboards avançados"],
};

function PlanCard({ plan, featured }: { plan: Plan; featured?: boolean }) {
  const key = plan.plan_key as PlanKey;
  const count = FEATURE_COUNTS[key] ?? 0;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 h-full flex flex-col shadow-sm",
        featured && "border-primary/40 ring-1 ring-primary/15 shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-lg font-black">{plan.name}</h3>
        {featured && (
          <Badge className="text-[10px] bg-primary/15 text-primary border-0">Popular</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground min-h-[2.5rem]">{plan.description}</p>
      <p className="text-[11px] font-bold text-primary mt-2">{count} funcionalidades</p>
      <ul className="mt-3 space-y-1.5 flex-1">
        {HIGHLIGHTS[key]?.map((h) => (
          <li key={h} className="flex items-start gap-2 text-xs text-foreground/90">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Props = {
  plans: Plan[];
  className?: string;
};

export default function PlanComparisonGrid({ plans, className }: Props) {
  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className={className}>
      {/* Desktop: colunas */}
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        {sorted.map((p) => (
          <PlanCard key={p.plan_key} plan={p} featured={p.plan_key === "pro"} />
        ))}
      </div>

      {/* Mobile: carrossel */}
      <div className="md:hidden">
        <Carousel opts={{ align: "start", loop: false }} className="w-full">
          <CarouselContent className="-ml-2">
            {sorted.map((p) => (
              <CarouselItem key={p.plan_key} className="pl-2 basis-[85%] sm:basis-[70%]">
                <PlanCard plan={p} featured={p.plan_key === "pro"} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-end gap-1 mt-2">
            <CarouselPrevious className="static translate-y-0 h-8 w-8" />
            <CarouselNext className="static translate-y-0 h-8 w-8" />
          </div>
        </Carousel>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {sorted.map((p) => (
          <Badge key={p.plan_key} variant="outline" className="text-[10px]">
            {PLAN_LABELS[p.plan_key as PlanKey] ?? p.name}
          </Badge>
        ))}
        <Button variant="link" size="sm" className="h-7 text-xs" asChild>
          <Link to="/admin/plans">Ver planos</Link>
        </Button>
      </div>
    </div>
  );
}
