import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Layers, Bot, Heart, Megaphone, Bell, MessageCircle } from "lucide-react";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { usePlatformPlans } from "@/hooks/usePlatformFeatures";

const centrals = [
  { to: "/admin/centrals/ai", icon: Bot, title: "Central IA", desc: "Atendimento, vendedor, recuperação, marketing" },
  { to: "/admin/centrals/loyalty", icon: Heart, title: "Central Fidelidade", desc: "Carimbos, pontos, cashback, VIP" },
  { to: "/admin/centrals/campaigns", icon: Megaphone, title: "Central Campanhas", desc: "Promos, winback, horário fraco" },
  { to: "/admin/centrals/push", icon: Bell, title: "Central Push", desc: "Notificações segmentadas e agendadas" },
  { to: "/admin/centrals/conversational", icon: MessageCircle, title: "Conversar para pedir", desc: "Pedido por conversa (preparação)" },
];

export default function AdminCentralsHubPage() {
  const { data: plans, isLoading } = usePlatformPlans();

  const planSummary = useMemo(
    () => (plans ?? []).map((p) => p.name).join(" · "),
    [plans],
  );

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <div>
        <h2 className="text-xl font-black flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Centrais operacionais
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Gerir funcionalidades por restaurante. Motores automáticos ainda não activos — só preparação e toggles.
        </p>
      </div>

      <OpsCompactCard
        title="Planos activos"
        summary={isLoading ? "A carregar…" : planSummary || "START · PRO · PREMIUM"}
        meta="Gerir matriz de funcionalidades"
        editable={false}
        actions={
          <Link to="/admin/plans" className="text-xs font-bold text-primary hover:underline">
            Ver planos
          </Link>
        }
      />

      <div className="space-y-2">
        {centrals.map((c) => (
          <Link key={c.to} to={c.to}>
            <OpsCompactCard
              title={c.title}
              summary={c.desc}
              badges={["Preparado"]}
              editable={false}
              actions={<c.icon className="h-4 w-4 text-muted-foreground" />}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
