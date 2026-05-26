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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { panelNavItemsForRole } from "@/lib/staffPermissions";
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

const ICONS: Record<string, typeof ShoppingBag> = {
  orders: ShoppingBag,
  dashboard: LayoutGrid,
  cashier: DollarSign,
  finance: DollarSign,
  menu: UtensilsCrossed,
  "table-map": LayoutGrid,
  tables: LayoutGrid,
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
  const navItems = panelNavItemsForRole(roleData?.role);

  const handleNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação do dia</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = ICONS[item.key] || ShoppingBag;
                const url = item.segment ? nav.panel(item.segment) : nav.panel();
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={url}
                        end={item.segment === ""}
                        className="hover:bg-muted/50"
                        activeClassName="bg-primary/10 text-primary font-semibold"
                        onClick={handleNav}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" className="w-full justify-start" onClick={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
