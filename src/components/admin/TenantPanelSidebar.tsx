import {
  LayoutGrid, ShoppingBag, UtensilsCrossed, Package, BarChart3, Settings,
  Users, LogOut, Monitor, DollarSign, Palette, Image, Wallet, Printer, Copy,
  Link2, Globe, Store, Layout, Truck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function TenantPanelSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const base = `/admin/tenants/${slug}`;

  const operacao = [
    { title: "Dashboard", url: `${base}`, icon: LayoutGrid, end: true },
    { title: "Pedidos", url: `${base}/orders`, icon: ShoppingBag },
    { title: "Mapa de mesas", url: `${base}/table-map`, icon: LayoutGrid },
    { title: "Caixa", url: `${base}/cashier`, icon: DollarSign },
    { title: "Estoque", url: `${base}/stock`, icon: Package },
    { title: "Relatórios", url: `${base}/reports`, icon: BarChart3 },
  ];
  const cardapio = [
    { title: "Cardápio", url: `${base}/menu`, icon: UtensilsCrossed },
    { title: "Banners", url: `${base}/banners`, icon: Image },
    { title: "Zonas de entrega", url: `${base}/delivery-zones`, icon: Truck },
  ];
  const config = [
    { title: "Identidade", url: `${base}/branding`, icon: Palette },
    { title: "Unidades", url: `${base}/stores`, icon: Store },
    { title: "Telas do totem", url: `${base}/screens`, icon: Layout },
    { title: "Idiomas", url: `${base}/languages`, icon: Globe },
    { title: "Recebimentos", url: `${base}/finance`, icon: DollarSign },
    { title: "Pagamentos", url: `${base}/payments`, icon: Wallet },
    { title: "Impressora", url: `${base}/printer`, icon: Printer },
    { title: "Totem", url: `${base}/totem`, icon: Monitor },
    { title: "Mesas & QR", url: `${base}/tables`, icon: LayoutGrid },
    { title: "Equipe", url: `${base}/team`, icon: Users },
    { title: "Links de acesso", url: `${base}/links`, icon: Link2 },
    { title: "Configurações", url: `${base}/settings`, icon: Settings },
    { title: "Duplicar projeto", url: `${base}/duplicate`, icon: Copy },
  ];

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