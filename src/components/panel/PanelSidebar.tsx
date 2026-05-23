import {
  LayoutGrid, ShoppingBag, UtensilsCrossed, Package, BarChart3, Settings,
  Users, LogOut, Monitor, DollarSign, Palette, Image as ImageIcon, Wallet,
  Printer, Globe, Store, Layout, Truck, UserCog, BookOpen, Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const operacao = [
  { title: "Pedidos", url: "/panel", icon: ShoppingBag, end: true },
  { title: "Dashboard", url: "/panel/dashboard", icon: LayoutGrid },
  { title: "Mapa de mesas", url: "/panel/table-map", icon: LayoutGrid },
  { title: "Caixa", url: "/panel/cashier", icon: DollarSign },
  { title: "Estoque", url: "/panel/stock", icon: Package },
  { title: "Relatórios", url: "/panel/reports", icon: BarChart3 },
];
const cardapio = [
  { title: "Cardápio", url: "/panel/menu", icon: UtensilsCrossed },
  { title: "Banners", url: "/panel/banners", icon: ImageIcon },
  { title: "Zonas de entrega", url: "/panel/delivery-zones", icon: Truck },
  { title: "Cupões", url: "/panel/coupons", icon: Wallet },
  { title: "Fidelidade", url: "/panel/loyalty", icon: Users },
];
const config = [
  { title: "Identidade", url: "/panel/branding", icon: Palette },
  { title: "Unidades", url: "/panel/stores", icon: Store },
  { title: "Telas do totem", url: "/panel/screens", icon: Layout },
  { title: "Idiomas", url: "/panel/languages", icon: Globe },
  { title: "Recebimentos", url: "/panel/finance", icon: DollarSign },
  { title: "Pagamentos", url: "/panel/payments", icon: Wallet },
  { title: "Impressoras", url: "/panel/printers", icon: Printer },
  { title: "Totem", url: "/panel/totem", icon: Monitor },
  { title: "Mesas & QR", url: "/panel/tables", icon: LayoutGrid },
  { title: "Equipe", url: "/panel/team", icon: Users },
  { title: "Vendedores", url: "/panel/sellers", icon: UserCog },
  { title: "Guia", url: "/panel/guide", icon: BookOpen },
  { title: "Diagnóstico", url: "/panel/diagnostics", icon: Activity },
  { title: "Configurações", url: "/panel/settings", icon: Settings },
];

export function PanelSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const handleNav = () => { if (isMobile) setOpenMobile(false); };

  const renderItems = (items: typeof operacao) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={(item as any).end}
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
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(operacao)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Cardápio</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(cardapio)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Configuração</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(config)}</SidebarGroupContent>
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
