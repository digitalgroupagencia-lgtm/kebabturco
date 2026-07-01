import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { clearStaffSessionFlag } from "@/lib/staffLogin";

const AUTH_STORAGE_KEY = "kebabturco-auth";

async function purgeLocalAuthSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function withLogoutQuery(path: string): string {
  if (path.includes("logout=1")) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}logout=1`;
}

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

const listeners = new Set<(state: AuthState) => void>();
let authState: AuthState = { user: null, session: null, loading: true };
let authStarted = false;
let initialSessionResolved = false;

function publish(next: AuthState) {
  authState = next;
  listeners.forEach((listener) => listener(authState));
}

function applySession(nextSession: Session | null, loading = false) {
  publish({
    session: nextSession,
    user: nextSession?.user ?? null,
    loading,
  });
}

function startAuthStore() {
  if (authStarted) return;
  authStarted = true;

  supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
    initialSessionResolved = true;
    applySession(nextSession, false);
  });

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    // O evento inicial pode chegar como null antes do getSession() ler a sessão
    // persistida no localStorage. Não finalizar o loading nesse caso evita o
    // loop /panel → /auth → /panel → /admin visto no preview.
    if (!initialSessionResolved && !nextSession) return;
    applySession(nextSession, false);
  });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(authState);

  useEffect(() => {
    startAuthStore();
    listeners.add(setState);
    setState(authState);

    return () => {
      listeners.delete(setState);
    };
  }, []);

  const signOut = async (redirectTo: string = "/staff") => {
    clearStaffSessionFlag();

    // Limpa o estado local imediatamente para evitar sensação de travamento no clique.
    applySession(null, false);

    // No telemóvel a navegação era mais rápida que o signOut — a sessão ficava e o /staff
    // voltava a mandar para o painel. Esperar + apagar storage garante saída real.
    await Promise.race([
      purgeLocalAuthSession(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);

    if (typeof window !== "undefined") {
      window.location.replace(withLogoutQuery(redirectTo));
    }
  };

  return { user: state.user, session: state.session, loading: state.loading, signOut };
}
