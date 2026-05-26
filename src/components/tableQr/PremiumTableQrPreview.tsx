import { QRCodeSVG } from "qrcode.react";
import { TABLE_QR_LABELS, normalizeTableQrLang, type TableQrBranding } from "@/lib/tableQr/labels";

type Props = {
  tableNumber: string;
  url: string;
  branding: TableQrBranding;
  size?: number;
};

export default function PremiumTableQrPreview({ tableNumber, url, branding, size = 220 }: Props) {
  const lang = normalizeTableQrLang(branding.primaryLang);
  const labels = TABLE_QR_LABELS[lang];

  return (
    <div className="w-full max-w-[320px] rounded-[28px] border border-[#c9a227]/40 bg-[#0f0f0f] p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]">
      <div className="rounded-[22px] bg-white px-4 py-5 flex flex-col items-center text-center">
        {branding.logoUrl && (
          <img
            src={branding.logoUrl}
            alt=""
            className="h-12 w-12 object-contain mb-2 opacity-90"
            draggable={false}
          />
        )}
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {branding.restaurantName}
        </p>
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#c41e3a] mt-3">{labels.tableWord}</p>
        <p className="text-[42px] font-black leading-none text-foreground mt-1 tabular-nums">{tableNumber}</p>
        <div className="w-16 h-px bg-[#c9a227]/70 my-3" />
        <div className="relative rounded-2xl bg-[#fafafa] p-2 border border-border/40">
          <QRCodeSVG value={url} size={size} level="H" includeMargin bgColor="#fafafa" fgColor="#111111" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-xl bg-white px-2.5 py-1 border-2 border-[#c9a227] shadow-sm">
              <span className="text-lg font-black text-[#c41e3a] tabular-nums">{tableNumber}</span>
            </div>
          </div>
        </div>
        <p className="text-sm font-bold text-foreground mt-4">{labels.scanHint}</p>
      </div>
    </div>
  );
}
