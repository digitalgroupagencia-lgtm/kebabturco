import {
  LayoutGrid, ShoppingBag, UtensilsCrossed, Package, BarChart3, Settings,
  Users, LogOut, Monitor, DollarSign, Palette, Image as ImageIcon, Wallet,
  Printer, Globe, Store, Layout, Truck, UserCog, BookOpen, Activity, Layers,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { nav } from "@/lib/navPaths.ts";

const operacao = [
  { title: "Pedidos", url: nav.panel(), icon: ShoppingBag, end: true },
  { title: "Dashboard", url: nav.panel("dashboard"), icon: LayoutGrid },
  { title: "Mapa de mesas", url: nav.panel("table-map"), icon: LayoutGrid },
  { title: "Caixa", url: nav.panel("cashier"), icon: DollarSign },
  { title: "Estoque", url: nav.panel("stock"), icon: Package },
  { title: "Relatórios", url: nav.panel("reports"), icon: BarChart3 },
];
const cardapio = [
  { title: "Cardápio", url: nav.panel("menu"), icon: UtensilsCrossed },
  { title: "Personalização", url: nav.panel("modifiers"), icon: Layers },
  { title: "Banners", url: nav.panel("banners"), icon: ImageIcon },
  { title: "Zonas de entrega", url: nav.panel("delivery-zones"), icon: Truck },
  { title: "Cupões", url: nav.panel("coupons"), icon: Wallet },
  { title: "Fidelidade", url: nav.panel("loyalty"), icon: Users },
];
const config = [
  { title: "Identidade", url: nav.panel("branding"), icon: Palette },
  { title: "Unidades", url: nav.panel("stores"), icon: Store },
  { title: "Telas do totem", url: nav.panel("screens"), icon: Layout },
  { title: "Idiomas", url: nav.panel("languages"), icon: Globe },
  { title: "Recebimentos", url: nav.panel("finance"), icon: DollarSign },
  { title: "Pagamentos", url: nav.panel("payments"), icon: Wallet },
  { title: "Impressoras", url: nav.panel("printers"), icon: Printer },
  { title: "Totem", url: nav.panel("totem"), icon: Monitor },
  { title: "Mesas & QR", url: nav.panel("tables"), icon: LayoutGrid },
  { title: "Equipe", url: nav.panel("team"), icon: Users },
  { title: "Vendedores", url: nav.panel("sellers"), icon: UserCog },
  { title: "Guia", url: nav.panel("guide"), icon: BookOpen },
  { title: "Diagnóstico", url: nav.panel("diagnostics"), icon: Activity },
  { title: "Configurações", url: nav.panel("settings"), icon: Settings },
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
