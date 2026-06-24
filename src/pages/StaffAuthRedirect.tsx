import { Navigate, useLocation } from "react-router-dom";
import { nav } from "@/lib/navPaths";

/** Legado: /auth → único ecrã de login em /staff (mantém ?next= e ?signup=). */
export default function StaffAuthRedirect() {
  const { search } = useLocation();
  return <Navigate to={`${nav.staff()}${search}`} replace />;
}
