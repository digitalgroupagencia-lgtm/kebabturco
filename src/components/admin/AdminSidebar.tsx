import { useState } from "react";
import {
  LayoutGrid,
  Building2,
  CreditCard,
  Activity,
  Users,
  Settings,
  LogOut,
  BookOpen,
  MessageSquare,
  Layers,
  Globe,
  ChevronDown,
  Bot,
  Heart,
  Megaphone,
  Bell,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ADMIN_CENTRALS } from "@/lib/adminCentralsNav";

const overviewItems = [
  { title: "Command Center", url: "/admin", icon: LayoutGrid, end: true },
];

const clientsItems = [
  { title: "Clientes", url: "/admin/tenants", icon: Building2 },
  { title: "Planos", url: "/admin/plans", icon: CreditCard },
  { title: "Domínios & Links", url: "/admin/domains", icon: Globe },
  { title: "Planos & Cobrança", url: "/admin/billing", icon: CreditCard },
];

const systemItems = [
  { title: "Utilizadores", url: "/admin/users", icon: Users },
  { title: "Monitorização", url: "/admin/monitoring", icon: Activity },
  { title: "Guia", url: "/admin/guide", icon: BookOpen },
  { title: "Conversas IA", url: "/admin/conversations", icon: MessageSquare },
  { title: "Definições", url: "/admin/settings", icon: Settings },
];

const centralIcons: Record<string, typeof Bot> = {
  ai: Bot,
  loyalty: Heart,
  campaigns: Megaphone,
  push: Bell,
  conversational: MessageSquare,
};

function NavItem({
  item,
  collapsed,
  onNav,
}: {
  item: { title: string; url: string; icon: typeof LayoutGrid; end?: boolean };
  collapsed: boolean;
  onNav: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.end}
          className={({ isActive }) =>
            cn("hover:bg-muted/50", isActive && "bg-primary/10 text-primary font-semibold")
          }
          onClick={onNav}
        >
          <item.icon className="mr-2 h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AdminSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const location = useLocation();
  const centralsOpen = location.pathname.includes("/centrals");
  const [centralsExpanded, setCentralsExpanded] = useState(centralsOpen);

  const handleNav = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Visão geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <NavItem key={item.url} item={item} collapsed={collapsed} onNav={handleNav} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Clientes & planos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clientsItems.map((item) => (
                <NavItem key={item.url} item={item} collapsed={collapsed} onNav={handleNav} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Centrais</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <NavLink
                  to="/admin/centrals"
                  end
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50",
                    location.pathname === "/admin/centrals" && "bg-primary/10 text-primary font-semibold",
                  )}
                  onClick={handleNav}
                >
                  <Layers className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Hub centrais</span>}
                </NavLink>
              </SidebarMenuItem>

              {!collapsed ? (
                <Collapsible open={centralsExpanded} onOpenChange={setCentralsExpanded}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between">
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ChevronDown
                            className={cn("h-3.5 w-3.5 transition-transform", centralsExpanded && "rotate-180")}
                          />
                          Operacionais
                        </span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {ADMIN_CENTRALS.map((c) => {
                          const Icon = centralIcons[c.segment] ?? Layers;
                          return (
                            <SidebarMenuSubItem key={c.segment}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={c.globalPath}
                                  className={({ isActive }) =>
                                    cn("hover:bg-muted/50", isActive && "bg-primary/10 text-primary font-semibold")
                                  }
                                  onClick={handleNav}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  <span>{c.title.replace("Central ", "")}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                ADMIN_CENTRALS.map((c) => {
                  const Icon = centralIcons[c.segment] ?? Layers;
                  return (
                    <SidebarMenuItem key={c.segment}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={c.globalPath}
                          className={({ isActive }) =>
                            cn("hover:bg-muted/50", isActive && "bg-primary/10 text-primary font-semibold")
                          }
                          onClick={handleNav}
                        >
                          <Icon className="h-4 w-4" />
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <NavItem key={item.url} item={item} collapsed={collapsed} onNav={handleNav} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
