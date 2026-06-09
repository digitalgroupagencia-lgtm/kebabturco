import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Define tema escuro como PADRÃO inicial nas áreas internas do staff
 * (Admin, Painel, Vendedor, Entregador, KDS) apenas quando o utilizador
 * ainda não escolheu um tema. A partir daí o toggle Sol/Lua funciona
 * normalmente e a escolha é persistida em localStorage.
 */
export function useForceDarkTheme() {
  const { setTheme } = useTheme();
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("kiosk-theme") : null;
      if (!saved) {
        setTheme("dark");
        window.localStorage.setItem("kiosk-theme", "dark");
      }
    } catch {
      setTheme("dark");
    }
  }, [setTheme]);
}