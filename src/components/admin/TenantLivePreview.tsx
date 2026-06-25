import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Globe, RefreshCw, Smartphone } from "lucide-react";
import { bumpAppCache } from "@/lib/appCacheBust";
import type { Tables } from "@/integrations/supabase/types";
import type { TenantUrlConfig } from "@/lib/tenantUrls";
import {
  buildTenantEmbedPreviewUrl,
  buildTenantPublicPreviewUrl,
  getPreviewPostMessageTarget,
  getTenantPublicDomain,
  PREVIEW_MESSAGE_TYPE,
  type TenantPreviewScreen,
} from "@/lib/tenantPreview";

type CompanySettings = Tables<"company_settings">;

type Props = {
  tenant: (TenantUrlConfig & { slug: string; name?: string }) | null;
  screen: TenantPreviewScreen;
  productId?: string | null;
  seedCheckout?: boolean;
  /** Rascunho não guardado, actualiza a prévia em tempo real via postMessage. */
  draftSettings?: Partial<CompanySettings> | null;
  className?: string;
};

export default function TenantLivePreview({
  tenant,
  screen,
  productId,
  seedCheckout,
  draftSettings,
  className,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const previewUrl = useMemo(() => {
    if (!tenant?.slug) return null;
    return buildTenantEmbedPreviewUrl({
      tenant,
      screen,
      productId,
      seedCheckout,
      cacheToken: iframeKey,
    });
  }, [tenant, screen, productId, seedCheckout, iframeKey]);

  const publicUrl = useMemo(() => {
    if (!tenant?.slug) return null;
    return buildTenantPublicPreviewUrl({ tenant, screen, productId, seedCheckout });
  }, [tenant, screen, productId, seedCheckout]);

  const publicDomain = tenant ? getTenantPublicDomain(tenant) : "";

  useEffect(() => {
    if (!previewUrl || !draftSettings) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const targetOrigin = getPreviewPostMessageTarget(previewUrl);
    const post = () => {
      iframe.contentWindow?.postMessage(
        { type: PREVIEW_MESSAGE_TYPE, payload: draftSettings },
        targetOrigin,
      );
    };

    const onLoad = () => post();
    iframe.addEventListener("load", onLoad);
    post();

    return () => iframe.removeEventListener("load", onLoad);
  }, [previewUrl, draftSettings, iframeKey]);

  if (!tenant?.slug || !previewUrl) {
    return (
      <Card className={`p-4 text-sm text-muted-foreground ${className ?? ""}`}>
        Selecione um cliente com domínio configurado para ver a pré-visualização.
      </Card>
    );
  }

  return (
    <Card className={`p-4 bg-muted/30 ${className ?? ""}`}>
      <div className="text-xs text-muted-foreground mb-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Smartphone className="h-3.5 w-3.5" />
            Pré-visualização ao vivo
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Recarregar"
              onClick={() => {
                setIframeKey((k) => k + 1);
                bumpAppCache();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="Abrir site real">
              <a href={publicUrl ?? previewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
        <p className="flex items-center gap-1 text-[11px] truncate" title={publicDomain}>
          <Globe className="h-3 w-3 shrink-0" />
          <span className="truncate">Prévia em tempo real · publicado em {publicDomain || tenant.slug}</span>
        </p>
        {draftSettings && (
          <p className="text-[10px] text-primary/80">Alterações não guardadas reflectem-se na prévia</p>
        )}
      </div>

      <div
        className="mx-auto rounded-[2rem] border-8 border-foreground/90 overflow-hidden shadow-xl bg-background"
        style={{ width: 320, height: 640 }}
      >
        <iframe
          ref={iframeRef}
          key={`${screen}-${iframeKey}`}
          src={previewUrl}
          title={`Pré-visualização ${tenant.name ?? tenant.slug}`}
          className="w-full h-full border-0"
        />
      </div>
    </Card>
  );
}
