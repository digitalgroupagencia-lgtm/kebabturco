import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { nav } from "@/lib/navPaths";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { canAccessGeneralAdmin } from "@/lib/staffPermissions";
import {
  markAdminStaffAreaEntry,
  resolveStaffLoginDestination,
} from "@/lib/staffLogin";

const STAFF_LONG_PRESS_MS = 5000;

/**
 * Logo no cardápio:
 * - 5 toques (ou pressão longa 5s) → equipa; se admin já logado, abre admin directo
 * - Resto do público: mesmo gesto → login equipa
 */
export function useStaffLogoGesture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const tapsRef = useRef(0);
  const tapResetRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);

  const isLoggedInAdmin = Boolean(user && canAccessGeneralAdmin(roleData?.role));

  const openStaffArea = () => {
    if (isLoggedInAdmin && roleData?.role) {
      markAdminStaffAreaEntry();
      navigate(resolveStaffLoginDestination(roleData.role));
      return;
    }
    navigate(nav.staff());
  };

  const registerTap = () => {
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
    longPressRef.current = window.setTimeout(openStaffArea, STAFF_LONG_PRESS_MS);
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
