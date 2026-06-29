import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getTenantTotemUrl, type TenantUrlConfig } from "@/lib/tenantUrls";

interface Props {
  tenantName: string;
  tenantSlug: string;
  customDomain?: string | null;
  pathSlug?: string | null;
  masterDomain?: string | null;
  useMasterDomain?: boolean;
  trigger?: React.ReactNode;
}

export default function TenantQrDialog({
  tenantName,
  tenantSlug,
  customDomain,
  pathSlug,
  masterDomain,
  useMasterDomain,
  trigger,
}: Props) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const tenant: TenantUrlConfig = {
    slug: tenantSlug,
    custom_domain: customDomain,
    path_slug: pathSlug,
    master_domain: masterDomain,
    use_master_domain: useMasterDomain,
  };

  const url = getTenantTotemUrl(tenant);
  const hasStableDomain = !!customDomain || (!!useMasterDomain && !!pathSlug);

  const fileBase = (customDomain || tenantSlug).replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  const downloadPng = () => {
    const canvas = document.getElementById(`qr-canvas-${tenantSlug}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qr-${fileBase}.png`;
    a.click();
  };

  const downloadSvg = () => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const str = serializer.serializeToString(svg);
    const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${fileBase}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <QrCode className="w-3.5 h-3.5" /> QR Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code, {tenantName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Este QR Code aponta para a loja pública do cliente. Configure o domínio antes de imprimir em material definitivo.
          </p>

          <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl border-2 border-dashed">
            <div ref={svgRef}>
              <QRCodeSVG value={url} size={240} level="H" includeMargin />
            </div>
            <div className="hidden">
              <QRCodeCanvas id={`qr-canvas-${tenantSlug}`} value={url} size={1024} level="H" includeMargin />
            </div>
            <div className="text-center w-full">
              <p className="text-xs text-muted-foreground mb-1">Aponta para:</p>
              <p className="text-sm font-mono break-all bg-muted px-2 py-1 rounded">{url}</p>
            </div>
          </div>

          {!hasStableDomain && (
            <div className="text-xs p-3 rounded-lg bg-accent/10 border border-accent/30 text-foreground">
              ⚠️ Este cliente ainda não tem domínio ou subcaminho estável. Configure em <strong>Domínios & Links</strong> antes de imprimir.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={copyUrl} className="gap-1.5">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copiar
            </Button>
            <Button variant="outline" onClick={downloadSvg} className="gap-1.5">
              <Download className="w-4 h-4" /> SVG
            </Button>
            <Button onClick={downloadPng} className="gap-1.5">
              <Download className="w-4 h-4" /> PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
