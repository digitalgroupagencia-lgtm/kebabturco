import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isAdminMasterHost } from "@/lib/platformHosts";

/**
 * No domínio reservado admin.snaporder.es (futuro):
 * - / → /admin
 * - rotas públicas do totem → /admin
 * Mantém /admin/* e /auth.
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
