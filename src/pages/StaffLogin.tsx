import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Shield, Delete, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { useUserRole } from "@/hooks/useUserRole";
import { nav } from "@/lib/navPaths";
import {
  loginWithStaffPin,
  resolveStaffLoginDestination,
} from "@/lib/staffLogin";
import { canAccessPanel, canAccessDeliveryPanel, type StaffRole } from "@/lib/staffPermissions";

const StaffLogin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const { storeId, loading: storeLoading } = useResolvedStore();
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || roleLoading || !user || !roleData?.role) return;
    const role = roleData.role as StaffRole;
    if (canAccessDeliveryPanel(role) && role === "delivery") {
      navigate(resolveStaffLoginDestination(role), { replace: true });
      return;
    }
    if (canAccessPanel(role) || role === "admin_master" || role === "seller") {
      navigate(resolveStaffLoginDestination(role), { replace: true });
    }
  }, [authLoading, roleLoading, user, roleData?.role, navigate]);

  const appendDigit = (digit: string) => {
    if (pin.length >= 8) return;
    setPin((prev) => prev + digit);
    setError(null);
  };

  const backspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!storeId) {
      setError("Loja não identificada. Actualize a página.");
      return;
    }
    if (!/^\d{6,8}$/.test(pin)) {
      setError("Introduza entre 6 e 8 dígitos");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { role } = await loginWithStaffPin(storeId, pin);
      navigate(resolveStaffLoginDestination(role), { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código incorrecto");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-4 flex items-center gap-3 border-b bg-card/80">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to={nav.home()} aria-label="Voltar ao menu">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h1 className="font-bold text-lg leading-tight">Área da equipe</h1>
            <p className="text-xs text-muted-foreground">Acesso interno — não é para clientes</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-md mx-auto w-full">
        <p className="text-sm text-muted-foreground text-center mb-6">
          Digite o código que o restaurante criou para si na área Equipe.
        </p>

        <Input
          readOnly
          value={"•".repeat(pin.length)}
          placeholder="••••••"
          className="text-center text-2xl tracking-[0.35em] h-14 mb-4 font-mono"
          aria-label="Código de acesso"
        />

        {error && (
          <p className="text-sm text-destructive font-medium mb-4 text-center" role="alert">
            {error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 w-full mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Button
              key={d}
              type="button"
              variant="outline"
              className="h-14 text-xl font-bold"
              onClick={() => appendDigit(d)}
              disabled={submitting}
            >
              {d}
            </Button>
          ))}
          <Button type="button" variant="ghost" className="h-14" disabled={submitting} aria-hidden />
          <Button
            type="button"
            variant="outline"
            className="h-14 text-xl font-bold"
            onClick={() => appendDigit("0")}
            disabled={submitting}
          >
            0
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-14"
            onClick={backspace}
            disabled={submitting || pin.length === 0}
            aria-label="Apagar"
          >
            <Delete className="h-5 w-5" />
          </Button>
        </div>

        <Button
          type="button"
          className="w-full h-12 text-base font-bold"
          onClick={() => void handleSubmit()}
          disabled={submitting || pin.length < 4}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              A entrar…
            </>
          ) : (
            "Entrar"
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center mt-6 leading-relaxed">
          Clientes: use <strong>Meus pedidos</strong> no menu para acompanhar a encomenda pelo telemóvel.
          Este ecrã é só para funcionários.
        </p>
      </main>
    </div>
  );
};

export default StaffLogin;
