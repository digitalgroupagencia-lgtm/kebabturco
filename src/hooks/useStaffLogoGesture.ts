import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { nav } from "@/lib/navPaths";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { canAccessGeneralAdmin } from "@/lib/staffPermissions";
import { resolveStaffLoginDestination } from "@/lib/staffLogin";

/**
 * Logo no cardápio:
 * - Admin geral com sessão: 1 toque → área admin (já logado)
 * - Resto: 5 toques rápidos ou pressão longa 5s → login equipa
 */
export function useStaffLogoGesture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const tapsRef = useRef<number>(0);
  const tapResetRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);

  const isLoggedInAdmin = Boolean(user && canAccessGeneralAdmin(roleData?.role));

  const openStaffArea = () => {
    if (isLoggedInAdmin && roleData?.role) {
      navigate(resolveStaffLoginDestination(roleData.role));
      return;
    }
    navigate(nav.staff());
  };

  const registerTap = () => {
    if (isLoggedInAdmin) {
      openStaffArea();
      return;
    }
    tapsRef.current += 1;
    if (tapResetRef.current) window.clearTimeout(tapResetRef.current);
    tapResetRef.current = window.setTimeout(() => {
      tapsRef.current = 0;
    }, 1500);
    if (tapsRef.current >= 5) {
      tapsRef.current = 0;
      if (tapResetRef.current) window.clearTimeout(tapResetRef.current);
      openStaffArea();
    }
  };

  const startPress = () => {
    if (isLoggedInAdmin) return;
    longPressRef.current = window.setTimeout(openStaffArea, 5000);
  };
  const endPress = () => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  return {
    onClick: registerTap,
    onTouchStart: startPress,
    onTouchEnd: endPress,
    onTouchCancel: endPress,
    onMouseDown: startPress,
    onMouseUp: endPress,
    onMouseLeave: endPress,
  };
}
