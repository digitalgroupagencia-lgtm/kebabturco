import { QRCodeCanvas } from "qrcode.react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { TABLE_QR_LABELS, type TableQrBranding, type TableQrLang, normalizeTableQrLang } from "./labels";

export type TableQrExportInput = {
  tableNumber: string;
  url: string;
  branding: TableQrBranding;
};

const CARD_W = 480;
const CARD_H = 640;
const QR_SIZE = 280;

const COLORS = {
  bg: "#0f0f0f",
  card: "#ffffff",
  red: "#c41e3a",
  gold: "#c9a227",
  text: "#1a1a1a",
  muted: "#666666",
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderQrDataUrl(url: string): Promise<string> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-9999px";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    createElement(QRCodeCanvas, {
      value: url,
      size: QR_SIZE,
      level: "H",
      includeMargin: true,
      bgColor: "#ffffff",
      fgColor: "#111111",
    }),
  );
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const canvas = host.querySelector("canvas");
  const dataUrl = canvas?.toDataURL("image/png") || "";
  root.unmount();
  host.remove();
  return dataUrl;
}

export async function renderTableQrCardCanvas(input: TableQrExportInput, scale = 2): Promise<HTMLCanvasElement> {
  const lang = normalizeTableQrLang(input.branding.primaryLang);
  const labels = TABLE_QR_LABELS[lang];
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W * scale;
  canvas.height = CARD_H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.scale(scale, scale);

  // Outer premium frame
  drawRoundedRect(ctx, 8, 8, CARD_W - 16, CARD_H - 16, 28);
  ctx.fillStyle = COLORS.bg;
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner card
  drawRoundedRect(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 24);
  ctx.fillStyle = COLORS.card;
  ctx.fill();

  ctx.textAlign = "center";

  // Logo
  let y = 52;
  if (input.branding.logoUrl) {
    const logo = await loadImage(input.branding.logoUrl);
    if (logo) {
      const lw = 56;
      const lh = 56;
      ctx.drawImage(logo, CARD_W / 2 - lw / 2, 36, lw, lh);
      y = 104;
    }
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 11px system-ui, -apple-system, sans-serif";
  ctx.fillText(input.branding.restaurantName.toUpperCase(), CARD_W / 2, y);
  y += 28;

  ctx.fillStyle = COLORS.red;
  ctx.font = "900 13px system-ui, -apple-system, sans-serif";
  ctx.fillText(labels.tableWord, CARD_W / 2, y);
  y += 18;

  ctx.fillStyle = COLORS.text;
  ctx.font = "900 52px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(input.tableNumber, CARD_W / 2, y);
  ctx.textBaseline = "alphabetic";
  y += 68;

  // Gold divider
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CARD_W / 2 - 48, y);
  ctx.lineTo(CARD_W / 2 + 48, y);
  ctx.stroke();
  y += 28;

  const qrDataUrl = await renderQrDataUrl(input.url);
  const qrImg = await loadImage(qrDataUrl);
  if (qrImg) {
    const qrX = CARD_W / 2 - QR_SIZE / 2;
    const qrY = y;
    drawRoundedRect(ctx, qrX - 8, qrY - 8, QR_SIZE + 16, QR_SIZE + 16, 16);
    ctx.fillStyle = "#fafafa";
    ctx.fill();
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.drawImage(qrImg, qrX, qrY, QR_SIZE, QR_SIZE);

    // Center badge on QR
    const badgeW = 52;
    const badgeH = 36;
    const bx = CARD_W / 2 - badgeW / 2;
    const by = qrY + QR_SIZE / 2 - badgeH / 2;
    drawRoundedRect(ctx, bx, by, badgeW, badgeH, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COLORS.red;
    ctx.font = "900 18px system-ui, -apple-system, sans-serif";
    ctx.fillText(input.tableNumber, CARD_W / 2, by + 24);
    y = qrY + QR_SIZE + 28;
  }

  ctx.fillStyle = COLORS.text;
  ctx.font = "700 16px system-ui, -apple-system, sans-serif";
  ctx.fillText(labels.scanHint, CARD_W / 2, y);

  return canvas;
}

export async function downloadTableQrPng(input: TableQrExportInput, filename: string) {
  const canvas = await renderTableQrCardCanvas(input, 3);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "image/png");
}

export async function printTableQrCards(inputs: TableQrExportInput[], title: string) {
  const canvases = await Promise.all(inputs.map((input) => renderTableQrCardCanvas(input, 2)));
  const images = canvases.map((c) => c.toDataURL("image/png"));
  const w = window.open("", "_blank");
  if (!w) return;
  const pages = images
    .map(
      (src) =>
        `<section style="page-break-after:always;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:24px"><img src="${src}" alt="QR" style="width:min(92vw,480px);height:auto"/></section>`,
    )
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>@page{margin:12mm}body{margin:0;font-family:system-ui,sans-serif;background:#fff}</style></head>
<body>${pages}<script>setTimeout(()=>window.print(),600)</script></body></html>`);
  w.document.close();
}

export function buildTableQrPrintHtml(inputs: TableQrExportInput[], title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>Generating…</body></html>`;
}
