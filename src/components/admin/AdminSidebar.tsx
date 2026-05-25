import { useState } from "react";
import {
  LayoutGrid,
  Activity,
  Users,
  Settings,
  LogOut,
  BookOpen,
  MessageSquare,
  Layers,
  ChevronDown,
  Bot,
  Heart,
  Megaphone,
  Bell,
  Palette,
  Image,
  Wrench,
  Printer,
  CreditCard,
  Map,
  UtensilsCrossed,
  Truck,
  Wallet,
  Store,
  Globe,
  Monitor,
  DollarSign,
  Package,
  BarChart3,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAME } from "@/lib/appMode";
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
import { ADMIN_CENTRALS, centralAdminPath } from "@/lib/adminCentralsNav";
import { nav } from "@/lib/navPaths.ts";

const overviewItems = [
  { title: "Command Center", url: nav.admin(), icon: LayoutGrid, end: true },
  { title: "Mapa de rotas", url: nav.admin("routes"), icon: Map },
  { title: "Planos & funcionalidades", url: nav.admin("plans"), icon: CreditCard },
];

const storeItems = [
  { title: "Cardápio", url: nav.admin("menu"), icon: UtensilsCrossed },
  { title: "Personalização", url: nav.admin("modifiers"), icon: Layers },
  { title: "Identidade visual", url: nav.admin("branding"), icon: Palette },
  { title: "Banners", url: nav.admin("banner"), icon: Image },
  { title: "Zonas de entrega", url: nav.admin("delivery-zones"), icon: Truck },
  { title: "Cupões", url: nav.admin("coupons"), icon: Wallet },
  { title: "Fidelidade", url: nav.admin("loyalty"), icon: Heart },
  { title: "Unidades", url: nav.admin("stores"), icon: Store },
  { title: "Telas do totem", url: nav.admin("screens"), icon: Monitor },
  { title: "Idiomas", url: nav.admin("languages"), icon: Globe },
  { title: "Recebimentos", url: nav.admin("finance"), icon: DollarSign },
  { title: "Pagamentos", url: nav.admin("operations"), icon: Wrench },
  { title: "Impressora", url: nav.admin("printer"), icon: Printer },
  { title: "Totem", url: nav.admin("totem"), icon: Monitor },
  { title: "Estoque", url: nav.admin("stock"), icon: Package },
  { title: "Relatórios", url: nav.admin("reports"), icon: BarChart3 },
];

const systemItems = [
  { title: "Utilizadores", url: nav.admin("users"), icon: Users },
  { title: "Monitorização", url: nav.admin("monitoring"), icon: Activity },
  { title: "Guia", url: nav.admin("guide"), icon: BookOpen },
  { title: "Conversas IA", url: nav.admin("conversations"), icon: MessageSquare },
  { title: "Definições", url: nav.admin("settings"), icon: Settings },
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
          <SidebarGroupLabel>Administração geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <NavItem key={item.url} item={item} collapsed={collapsed} onNav={handleNav} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuração da loja</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {storeItems.map((item) => (
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
                  to={centralAdminPath()}
                  end
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50",
                    location.pathname === centralAdminPath() && "bg-primary/10 text-primary font-semibold",
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
                                  to={centralAdminPath(c.segment)}
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
                          to={centralAdminPath(c.segment)}
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
