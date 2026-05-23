import {
  LayoutGrid,
  Building2,
  CreditCard,
  Activity,
  Users,
  Settings,
  Palette,
  LogOut,
  Image,
  Wallet,
  Printer,
  BookOpen,
  MessageSquare,
  Globe,
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

const mainItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutGrid },
  { title: "Clientes", url: "/admin/tenants", icon: Building2 },
  { title: "Domínios & Links", url: "/admin/domains", icon: Globe },
  { title: "Identidad Visual", url: "/admin/branding", icon: Palette },
  { title: "Banner Promocional", url: "/admin/banner", icon: Image },
  { title: "Pagos", url: "/admin/operations", icon: Wallet },
  { title: "Impresora", url: "/admin/printer", icon: Printer },
  { title: "Planos & Cobrança", url: "/admin/billing", icon: CreditCard },
  { title: "Monitoramento", url: "/admin/monitoring", icon: Activity },
];

const configItems = [
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Guia", url: "/admin/guide", icon: BookOpen },
  { title: "Conversas IA", url: "/admin/conversations", icon: MessageSquare },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
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
          <SidebarGroupLabel>Admin Master</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
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

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
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
