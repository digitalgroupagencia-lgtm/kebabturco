import { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  ChefHat,
  CreditCard,
  DollarSign,
  FileText,
  Headphones,
  Home,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import { nav } from "@/lib/navPaths";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: nav.admin(), icon: Home, group: "Operação" },
  { label: "Restaurantes", href: nav.admin("stores"), icon: Store, group: "Operação" },
  { label: "Faturamento", href: nav.admin("finance"), icon: DollarSign, group: "Financeiro" },
  { label: "Pedidos", href: nav.panel("live"), icon: ShoppingBag, group: "Operação" },
  { label: "Clientes", href: nav.admin("users"), icon: Users, group: "Gestão" },
  { label: "Produtos", href: nav.admin("menu"), icon: Package, group: "Gestão" },
  { label: "Comissões", href: nav.admin("monitoring"), icon: CreditCard, group: "Financeiro" },
  { label: "Relatórios", href: nav.admin("reports"), icon: BarChart3, group: "Financeiro" },
  { label: "Suporte", href: nav.admin("guide"), icon: Headphones, group: "Sistema" },
  { label: "Configurações", href: nav.admin("settings"), icon: Settings, group: "Sistema" },
  { label: "Integrações", href: nav.admin("payments"), icon: Boxes, group: "Sistema" },
  { label: "Logs", href: nav.admin("diagnostics"), icon: FileText, group: "Sistema" },
];

type PremiumShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  activeHref?: string;
  mode?: "dark" | "light";
};

export function PremiumShell({
  children,
  title,
  subtitle,
  activeHref = "/admin",
  mode = "dark",
}: PremiumShellProps) {
  const isDark = mode === "dark";
  const groups = Array.from(new Set(navItems.map((i) => i.group)));

  return (
    <div
      className={cn(
        "min-h-screen",
        isDark ? "bg-[#050505] text-white" : "bg-[#F8F9FB] text-slate-950",
      )}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r px-4 py-5 lg:flex",
          isDark ? "border-white/10 bg-[#080808]" : "border-slate-200 bg-white",
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D62300] to-[#8B0F1A]">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight">
              Proprio<span className="text-[#D62300]">App</span>
            </div>
            <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
              Internal System
            </div>
          </div>
        </div>

        <nav className="mt-8 space-y-6">
          {groups.map((group) => (
            <div key={group}>
              <p
                className={cn(
                  "mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em]",
                  isDark ? "text-zinc-600" : "text-slate-400",
                )}
              >
                {group}
              </p>
              <div className="space-y-1">
                {navItems
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = item.icon;
                    const active = item.href === activeHref;

                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                          active
                            ? "bg-gradient-to-r from-[#8B0F1A] to-[#D62300] text-white shadow-lg shadow-red-950/30"
                            : isDark
                              ? "text-zinc-300 hover:bg-white/5 hover:text-white"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                        {item.label}
                      </NavLink>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <div
            className={cn(
              "rounded-2xl border p-4",
              isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.14em]",
                isDark ? "text-zinc-500" : "text-slate-500",
              )}
            >
              Plano atual
            </p>
            <p className="mt-2 text-sm font-bold">Enterprise</p>
            <div className="mt-3 h-2 rounded-full bg-zinc-800">
              <div className="h-2 w-[47%] rounded-full bg-gradient-to-r from-[#8B0F1A] to-[#D62300]" />
            </div>
            <p className={cn("mt-2 text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
              47 / 100 restaurantes
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3",
              isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white",
            )}
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">Administrador</p>
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                Master
              </p>
            </div>
            <LogOut className="h-4 w-4 text-zinc-500" />
          </div>
        </div>
      </aside>

      <main className="lg:pl-[260px]">
        <header
          className={cn(
            "sticky top-0 z-20 flex h-[76px] items-center justify-between border-b px-6 backdrop-blur-xl",
            isDark ? "border-white/10 bg-[#050505]/80" : "border-slate-200 bg-white/80",
          )}
        >
          <div>
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
            {subtitle && (
              <p className={cn("mt-1 text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              className={cn(
                "h-11 rounded-xl border px-4 text-sm font-semibold",
                isDark ? "border-white/10 bg-[#111111] text-white" : "border-slate-200 bg-white",
              )}
            >
              <option>Kebab House</option>
              <option>Kebab Turco</option>
            </select>

            <button
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-xl border",
                isDark ? "border-white/10 bg-[#111111]" : "border-slate-200 bg-white",
              )}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D62300] text-[10px] font-bold text-white">
                3
              </span>
            </button>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
