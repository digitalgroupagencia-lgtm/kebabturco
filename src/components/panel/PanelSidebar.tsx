import {
  LayoutGrid,
  ShoppingBag,
  DollarSign,
  Users,
  LogOut,
  UserCog,
  BookOpen,
  Activity,
  Settings,
  UtensilsCrossed,
  Map,
  QrCode,
  Wallet,
  Radio,
} from "lucide-react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSellerModuleEnabled } from "@/hooks/useSellerModule";
import { useStaffT } from "@/hooks/useStaffT";
import { panelNavGroupsForRole } from "@/lib/staffPermissions";
import type { StaffI18nKey } from "@/lib/staffI18n";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { nav } from "@/lib/navPaths.ts";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof ShoppingBag> = {
  live: Radio,
  orders: ShoppingBag,
  dashboard: LayoutGrid,
  cashier: Wallet,
  finance: DollarSign,
  menu: UtensilsCrossed,
  "table-map": Map,
  tables: QrCode,
  settings: Settings,
  team: Users,
  sellers: UserCog,
  guide: BookOpen,
  diagnostics: Activity,
};

export function PanelSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const { enabled: sellerEnabled } = useSellerModuleEnabled(roleData?.tenant_id);
  const { t } = useStaffT();
  const navGroupsRaw = panelNavGroupsForRole(roleData?.role);
  const navGroups = navGroupsRaw
    .map((g) => ({
      ...g,
      label: t(`nav.group.${g.id}` as StaffI18nKey, g.label),
      items: g.items
        .filter((it) => sellerEnabled || it.key !== "sellers")
        .map((it) => ({ ...it, label: t(`nav.${it.key}` as StaffI18nKey, it.label) })),
    }))
    .filter((g) => g.items.length > 0);

  const handleNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="gap-1 border-r border-white/10 bg-[#080808]">
        <div className="px-3 pt-4">
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111111] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D62300] to-[#8B0F1A] text-sm font-black text-white">
              KT
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">Kebab Turco</p>
                <p className="text-xs text-zinc-500">Painel operacional</p>
              </div>
            )}
          </div>
        </div>
        {navGroups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-zinc-600">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = ICONS[item.key] || ShoppingBag;
                  const url = item.href ?? (item.segment ? nav.panel(item.segment) : nav.panel("live"));
                  const isLive = item.segment === "live";
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton asChild>
                        {isLive ? (
                          <RouterNavLink
                            to={nav.panel("live")}
                            onClick={handleNav}
                            className={({ isActive }) => {
                              const p = (typeof window !== "undefined" ? window.location.pathname : "").replace(/\/+$/, "") || "/";
                              const active = isActive || p === "/panel" || p === "/panel/live";
                              return cn(
                                "rounded-lg flex w-full items-center gap-2 px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white",
                                active && "bg-gradient-to-r from-[#8B0F1A] to-[#D62300] text-white font-semibold",
                              );
                            }}
                          >
                            <Icon className="mr-2 h-4 w-4 shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                          </RouterNavLink>
                        ) : (
                          <NavLink
                            to={url}
                            end
                            className="rounded-lg text-zinc-300 hover:bg-white/5 hover:text-white"
                            activeClassName="bg-gradient-to-r from-[#8B0F1A] to-[#D62300] text-white font-semibold"
                            onClick={handleNav}
                          >
                            <Icon className="mr-2 h-4 w-4 shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-white/10 bg-[#080808]">
        <Button variant="ghost" className="w-full justify-start rounded-lg text-zinc-300 hover:bg-white/5 hover:text-white" onClick={() => void signOut("/staff")}>
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && t("common.signout")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
