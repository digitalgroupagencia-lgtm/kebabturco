import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isDefaultKebabContextHost, isLovableEditorHost } from "@/lib/platformHosts";
import { isBrokenEditorPath, isReservedAppPath } from "@/lib/appPaths";

/**
 * Normaliza URLs do preview (Lovable/localhost) para abrir a loja Kebab por defeito.
 */
export default function PreviewPathGuard() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const host = window.location.hostname;

    if (isBrokenEditorPath(pathname)) {
      navigate("/", { replace: true });
      return;
    }

    if (!isLovableEditorHost(host) && !isDefaultKebabContextHost(host)) return;

    const segments = pathname.split("/").filter(Boolean);
    const first = segments[0] ?? null;

    // Editor abriu /admin/* como rota wildcard — voltar à loja
    if (first === "admin" && segments.length === 1 && pathname.endsWith("/*")) {
      navigate("/", { replace: true });
      return;
    }

    // Slug único na raiz (ex.: /kebab-turco) — OK, loja resolve pelo slug
    if (first && !isReservedAppPath(first) && segments.length === 1) return;

    // Preview não deve abrir admin/auth como página inicial sem o utilizador pedir
    const isRootLike =
      pathname === "/" ||
      pathname === "" ||
      (segments.length === 1 && !isReservedAppPath(first));

    if (isRootLike) return;

    // /admin sozinho sem sub-rota no editor: deixar (login/admin real)
    if (first === "admin") return;
    if (first === "panel" || first === "seller" || first === "auth") return;
  }, [pathname, navigate]);

  return null;
}
