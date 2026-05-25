import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fixBrokenEditorPath, isBrokenEditorPath, isReservedAppPath } from "@/lib/appPaths";

/**
 * Corrige endereços inválidos do preview (ex.: /admin/* do selector Lovable).
 */
export default function PreviewPathGuard() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isBrokenEditorPath(pathname)) {
      navigate(fixBrokenEditorPath(pathname), { replace: true });
    }
  }, [pathname, navigate]);

  return null;
}
