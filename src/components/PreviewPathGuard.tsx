import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fixBrokenEditorLocation, isBrokenEditorPath } from "@/lib/appPaths";

/**
 * Corrige endereços inválidos do preview (ex.: /admin/* do selector Lovable).
 */
export default function PreviewPathGuard() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isBrokenEditorPath(pathname)) return;
    const { pathname: fixed, search } = fixBrokenEditorLocation(pathname);
    navigate({ pathname: fixed, search }, { replace: true });
  }, [pathname, navigate]);

  return null;
}
