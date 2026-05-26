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
import { panelNavGroupsForRole } from "@/lib/staffPermissions";
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
  const navGroups = panelNavGroupsForRole(roleData?.role);

  const handleNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="gap-1">
        {navGroups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
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
                            className={({ isActive }) =>
                              cn(
                                "hover:bg-muted/50 rounded-lg flex w-full items-center gap-2 px-2 py-1.5 text-sm",
                                isActive && "bg-primary/10 text-primary font-semibold",
                              )
                            }
                            isActive={(_, location) => {
                              const p = location.pathname.replace(/\/+$/, "") || "/";
                              return p === "/panel" || p === "/panel/live";
                            }}
                          >
                            <Icon className="mr-2 h-4 w-4 shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                          </RouterNavLink>
                        ) : (
                          <NavLink
                            to={url}
                            end
                            className="hover:bg-muted/50 rounded-lg"
                            activeClassName="bg-primary/10 text-primary font-semibold"
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
      <SidebarFooter>
        <Button variant="ghost" className="w-full justify-start rounded-lg" onClick={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
