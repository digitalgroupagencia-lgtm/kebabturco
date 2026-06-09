import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Força tema escuro nas áreas internas do staff (Admin, Painel, Vendedor,
 * Entregador, KDS). Aplica uma vez ao montar o layout. O cliente final
 * (/, /menu, /checkout) continua com tema claro.
 */
export function useForceDarkTheme() {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);
}