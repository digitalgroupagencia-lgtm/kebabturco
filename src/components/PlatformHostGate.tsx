import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isAdminMasterHost } from "@/lib/platformHosts";

/**
 * Nos domínios reservados da plataforma (ex.: snaporder.digitalgroupsti.com):
 * - / → /admin
 * - loja pública, painel restaurante, etc. → /admin
 * Mantém /admin/*, /auth e /install.
 */
export default function PlatformHostGate() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdminMasterHost(window.location.hostname)) return;

    const path = location.pathname;
    if (path === "/" || path === "") {
      navigate("/admin", { replace: true });
      return;
    }

    const allowed =
      path.startsWith("/admin") ||
      path === "/auth" ||
      path.startsWith("/auth/") ||
      path === "/install";

    if (!allowed) {
      navigate("/admin", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
