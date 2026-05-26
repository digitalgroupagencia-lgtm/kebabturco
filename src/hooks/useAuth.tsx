import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let initialSessionLoaded = false;

    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const finishInitialLoad = (nextSession: Session | null) => {
      if (!active || initialSessionLoaded) return;
      initialSessionLoaded = true;
      applySession(nextSession);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      finishInitialLoad(nextSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      applySession(nextSession);
      finishInitialLoad(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
