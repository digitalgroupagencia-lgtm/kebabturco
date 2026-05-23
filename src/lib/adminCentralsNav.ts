import type { LucideIcon } from "lucide-react";
import { Bot, Heart, Megaphone, Bell, MessageCircle } from "lucide-react";

export type CentralDef = {
  segment: string;
  globalPath: string;
  icon: LucideIcon;
  title: string;
  desc: string;
};

export const ADMIN_CENTRALS: CentralDef[] = [
  {
    segment: "ai",
    globalPath: "/admin/centrals/ai",
    icon: Bot,
    title: "Central IA",
    desc: "Atendimento, vendedor, recuperação, marketing",
  },
  {
    segment: "loyalty",
    globalPath: "/admin/centrals/loyalty",
    icon: Heart,
    title: "Central Fidelidade",
    desc: "Carimbos, pontos, cashback, VIP",
  },
  {
    segment: "campaigns",
    globalPath: "/admin/centrals/campaigns",
    icon: Megaphone,
    title: "Central Campanhas",
    desc: "Promos, winback, horário fraco",
  },
  {
    segment: "push",
    globalPath: "/admin/centrals/push",
    icon: Bell,
    title: "Central Push",
    desc: "Notificações segmentadas",
  },
  {
    segment: "conversational",
    globalPath: "/admin/centrals/conversational",
    icon: MessageCircle,
    title: "Conversar para pedir",
    desc: "Pedido por conversa",
  },
];

export function tenantCentralsPath(slug: string) {
  return `/admin/tenants/${slug}/centrals`;
}

export function tenantCentralPath(slug: string, segment: string) {
  return `/admin/tenants/${slug}/centrals/${segment}`;
}
