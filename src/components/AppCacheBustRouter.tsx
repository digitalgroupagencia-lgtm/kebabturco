import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  APP_BUILD_ID,
  bumpAppCache,
  checkForDeployedUpdate,
  subscribeAppCacheBust,
} from "@/lib/appCacheBust";

type Props = {
  children: ReactNode;
};

/**
 * Força remount do subtree do router quando há nova versão deployada ou
 * alterações vindas do admin/Lovable, evitando UI antiga e componentes duplicados.
 */
const AppCacheBustRouter = ({ children }: Props) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [cacheEpoch, setCacheEpoch] = useState(0);

  useEffect(
    () =>
      subscribeAppCacheBust(() => {
        setCacheEpoch((value) => value + 1);
        queryClient.clear();
      }),
    [queryClient],
  );

  useEffect(() => {
    void checkForDeployedUpdate();
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForDeployedUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Sincroniza abas abertas (admin + totem) após publicação no Lovable.
  useEffect(() => {
    if (import.meta.env.DEV) return;

    const interval = window.setInterval(() => {
      void checkForDeployedUpdate();
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  const routeKey = `${location.pathname}${location.search}:${cacheEpoch}:${APP_BUILD_ID}`;

  return (
    <div key={routeKey} className="contents">
      {children}
    </div>
  );
};

export default AppCacheBustRouter;
