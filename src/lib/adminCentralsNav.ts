import type { LucideIcon } from "lucide-react";
import { Bot, Heart, Megaphone, Bell, MessageCircle } from "lucide-react";
import { nav } from "@/lib/navPaths.ts";

export type CentralDef = {
  segment: string;
  icon: LucideIcon;
  title: string;
  desc: string;
};

export const ADMIN_CENTRALS: CentralDef[] = [
  {
    segment: "ai",
    icon: Bot,
    title: "Central IA",
    desc: "Atendimento, vendedor, recuperação, marketing",
  },
  {
    segment: "loyalty",
    icon: Heart,
    title: "Central Fidelidade",
    desc: "Carimbos, pontos, cashback, VIP",
  },
  {
    segment: "campaigns",
    icon: Megaphone,
    title: "Central Campanhas",
    desc: "Promos, winback, horário fraco",
  },
  {
    segment: "push",
    icon: Bell,
    title: "Central Push",
    desc: "Notificações segmentadas",
  },
  {
    segment: "conversational",
    icon: MessageCircle,
    title: "Conversar para pedir",
    desc: "Pedido por conversa",
  },
];

export function centralAdminPath(segment?: string) {
  return segment ? nav.admin("centrals", segment) : nav.admin("centrals");
}

/** @deprecated Legado multi-tenant, redirecciona via PreviewPathGuard */
export function tenantCentralsPath(slug: string) {
  return nav.admin("tenants", slug, "centrals");
}

/** @deprecated Legado multi-tenant, redirecciona via PreviewPathGuard */
export function tenantCentralPath(slug: string, segment: string) {
  return nav.admin("tenants", slug, "centrals", segment);
}
