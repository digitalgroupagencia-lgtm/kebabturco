import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { nav } from "@/lib/navPaths";
import { ensureStaffLoginStoreId } from "@/lib/resolveStaffLoginStore";

/** 5 toques rápidos OU pressão longa de 5s na logo → /staff. */
export function useStaffLogoGesture() {
  const navigate = useNavigate();
  const tapsRef = useRef<number>(0);
  const tapResetRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);

  const trigger = () => {
    void ensureStaffLoginStoreId()
      .catch(() => null)
      .finally(() => {
        navigate(nav.staff());
      });
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
      trigger();
    }
  };

  const startPress = () => {
    longPressRef.current = window.setTimeout(trigger, 5000);
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
