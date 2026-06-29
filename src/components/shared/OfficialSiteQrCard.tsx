import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Download, Copy, Check, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getTenantTotemUrl, type TenantUrlConfig } from "@/lib/tenantUrls";
import { useTenantUrlConfig } from "@/hooks/useTenantUrlConfig";

type Props = {
  tenant?: TenantUrlConfig;
  restaurantName?: string;
  /** Quando true, não envolve em Card (útil dentro de tabs existentes). */
  embedded?: boolean;
};

function QrBody({
  url,
  fileBase,
  restaurantName,
}: {
  url: string;
  fileBase: string;
  restaurantName: string;
}) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const canvasId = `site-qr-canvas-${fileBase}`;

  const downloadPng = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qr-site-${fileBase}.png`;
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
    a.download = `qr-site-${fileBase}.svg`;
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        QR fixo do site oficial de <strong>{restaurantName}</strong>. Use em panfletos, cartazes ou redes
        sociais — o link não muda.
      </p>

      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-white p-4">
        <div ref={svgRef}>
          <QRCodeSVG value={url} size={220} level="H" includeMargin />
        </div>
        <div className="hidden">
          <QRCodeCanvas id={canvasId} value={url} size={1024} level="H" includeMargin />
        </div>
        <div className="w-full text-center">
          <p className="mb-1 text-xs text-muted-foreground">Aponta para:</p>
          <p className="break-all rounded bg-muted px-2 py-1 font-mono text-sm">{url}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button type="button" variant="outline" onClick={copyUrl} className="gap-1.5">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copiar link
        </Button>
        <Button type="button" variant="outline" onClick={downloadSvg} className="gap-1.5">
          <Download className="h-4 w-4" /> SVG
        </Button>
        <Button type="button" onClick={downloadPng} className="gap-1.5">
          <Download className="h-4 w-4" /> PNG
        </Button>
      </div>
    </div>
  );
}

export default function OfficialSiteQrCard({ tenant: tenantProp, restaurantName: nameProp, embedded }: Props) {
  const resolved = useTenantUrlConfig();
  const tenant = tenantProp ?? resolved.tenant;
  const restaurantName = nameProp ?? resolved.restaurantName;
  const url = getTenantTotemUrl(tenant);
  const fileBase = (tenant.custom_domain || tenant.slug || "site").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  if (resolved.loading && !tenantProp) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <QrCode className="h-4 w-4 animate-pulse" /> A carregar QR do site…
        </CardContent>
      </Card>
    );
  }

  const body = <QrBody url={url} fileBase={fileBase} restaurantName={restaurantName} />;

  if (embedded) return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-5 w-5 text-primary" /> QR Code do site
        </CardTitle>
        <CardDescription>Descarregue para imprimir em material de divulgação.</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
