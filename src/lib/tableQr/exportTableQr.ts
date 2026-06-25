import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { TABLE_QR_LABELS, type TableQrBranding, normalizeTableQrLang } from "./labels";

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

/** Gera QR de forma fiável (sem depender do React no DOM). */
async function renderQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: QR_SIZE,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#111111", light: "#ffffff" },
  });
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

  drawRoundedRect(ctx, 8, 8, CARD_W - 16, CARD_H - 16, 28);
  ctx.fillStyle = COLORS.bg;
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawRoundedRect(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 24);
  ctx.fillStyle = COLORS.card;
  ctx.fill();

  ctx.textAlign = "center";

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

  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CARD_W / 2 - 48, y);
  ctx.lineTo(CARD_W / 2 + 48, y);
  ctx.stroke();
  y += 28;

  const qrDataUrl = await renderQrDataUrl(input.url);
  const qrImg = await loadImage(qrDataUrl);
  if (!qrImg) {
    throw new Error("Não foi possível gerar o código QR");
  }

  const qrX = CARD_W / 2 - QR_SIZE / 2;
  const qrY = y;
  drawRoundedRect(ctx, qrX - 8, qrY - 8, QR_SIZE + 16, QR_SIZE + 16, 16);
  ctx.fillStyle = "#fafafa";
  ctx.fill();
  ctx.strokeStyle = "#e8e8e8";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.drawImage(qrImg, qrX, qrY, QR_SIZE, QR_SIZE);

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

  ctx.fillStyle = COLORS.text;
  ctx.font = "700 16px system-ui, -apple-system, sans-serif";
  ctx.fillText(labels.scanHint, CARD_W / 2, y);

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao exportar imagem"));
    }, "image/png");
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "mesa";
}

async function renderAllCards(inputs: TableQrExportInput[], scale = 3): Promise<HTMLCanvasElement[]> {
  const out: HTMLCanvasElement[] = [];
  for (const input of inputs) {
    out.push(await renderTableQrCardCanvas(input, scale));
  }
  return out;
}

export async function downloadTableQrPng(input: TableQrExportInput, filename: string) {
  const canvas = await renderTableQrCardCanvas(input, 3);
  const blob = await canvasToBlob(canvas);
  triggerDownload(blob, filename);
}

/** PDF multi-página, uma mesa por folha A4, pronto para gráfica. */
export async function downloadTableQrPdf(inputs: TableQrExportInput[], filename: string) {
  if (!inputs.length) return;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const cardAspect = CARD_W / CARD_H;

  const canvases = await renderAllCards(inputs, 3);

  canvases.forEach((canvas, index) => {
    if (index > 0) pdf.addPage();

    let w = maxW;
    let h = w / cardAspect;
    if (h > maxH) {
      h = maxH;
      w = h * cardAspect;
    }
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", x, y, w, h, undefined, "FAST");
  });

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/** ZIP com um PNG por mesa, mesmo visual do download individual. */
export async function downloadTableQrZip(inputs: TableQrExportInput[], filename: string) {
  if (!inputs.length) return;

  const zip = new JSZip();
  const base = sanitizeFilenamePart(inputs[0]?.branding.restaurantName ?? "restaurante");
  const canvases = await renderAllCards(inputs, 3);

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const blob = await canvasToBlob(canvases[i]);
    zip.file(`${base}-mesa-${input.tableNumber}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, filename.endsWith(".zip") ? filename : `${filename}.zip`);
}

export async function printTableQrCards(inputs: TableQrExportInput[], title: string) {
  const canvases = await renderAllCards(inputs, 3);
  const images = canvases.map((c) => c.toDataURL("image/png"));
  const w = window.open("", "_blank");
  if (!w) {
    await downloadTableQrPdf(inputs, `${title}.pdf`);
    return;
  }

  const pages = images
    .map(
      (src) =>
        `<section style="page-break-after:always;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:0;margin:0"><img src="${src}" alt="QR mesa" width="${CARD_W}" height="${CARD_H}" style="width:${CARD_W}px;height:${CARD_H}px;max-width:100%;object-fit:contain"/></section>`,
    )
    .join("");

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: system-ui, sans-serif; background: #fff; }
  section:last-child { page-break-after: auto; }
  img { display: block; }
</style></head>
<body>${pages}<script>window.onload = () => setTimeout(() => window.print(), 400);</script></body></html>`);
  w.document.close();
}

export function buildTableQrPrintHtml(inputs: TableQrExportInput[], title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>Generating…</body></html>`;
}
