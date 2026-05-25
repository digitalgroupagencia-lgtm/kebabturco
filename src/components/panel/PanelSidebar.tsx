import {
  LayoutGrid,
  ShoppingBag,
  DollarSign,
  Users,
  LogOut,
  UserCog,
  BookOpen,
  Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { nav } from "@/lib/navPaths.ts";

const operacaoItems = [
  { title: "Pedidos", url: nav.panel(), icon: ShoppingBag, end: true },
  { title: "Resumo", url: nav.panel("dashboard"), icon: LayoutGrid },
  { title: "Caixa", url: nav.panel("cashier"), icon: DollarSign },
  { title: "Mapa de mesas", url: nav.panel("table-map"), icon: LayoutGrid },
  { title: "Mesas & QR", url: nav.panel("tables"), icon: LayoutGrid },
  { title: "Equipe", url: nav.panel("team"), icon: Users },
  { title: "Vendedores", url: nav.panel("sellers"), icon: UserCog },
  { title: "Guia", url: nav.panel("guide"), icon: BookOpen },
  { title: "Diagnóstico", url: nav.panel("diagnostics"), icon: Activity },
];

export function PanelSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
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
              {operacaoItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                      onClick={handleNav}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
