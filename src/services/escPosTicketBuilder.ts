// ESC/POS Ticket Builder, adaptado do projeto Toni's Digital Kitchen.
// Gera bytes ESC/POS em base64 prontos para a fila print_jobs ser
// consumida por um Print Bridge local que envia via TCP à impressora.
const CP1252_EXTRA: Record<number, number> = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

function encodeCP1252(text: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i)!;
    if (cp <= 0x7F) bytes.push(cp);
    else if (cp >= 0xA0 && cp <= 0xFF) bytes.push(cp);
    else if (CP1252_EXTRA[cp] !== undefined) bytes.push(CP1252_EXTRA[cp]);
    else bytes.push(0x3F);
  }
  return Uint8Array.from(bytes);
}

const ESC = 0x1b, GS = 0x1d, FS = 0x1c;
const LF = Uint8Array.from([0x0a]);
const INIT = Uint8Array.from([ESC, 0x40]);
const CODEPAGE_WPC1252 = Uint8Array.from([ESC, 0x74, 0x10]);
const DISABLE_CJK = Uint8Array.from([FS, 0x2e]);
const INTL_SPAIN = Uint8Array.from([ESC, 0x52, 0x0a]);
const BOLD_ON = Uint8Array.from([ESC, 0x45, 0x01]);
const BOLD_OFF = Uint8Array.from([ESC, 0x45, 0x00]);
const ALIGN_LEFT = Uint8Array.from([ESC, 0x61, 0x00]);
const ALIGN_CENTER = Uint8Array.from([ESC, 0x61, 0x01]);
const ALIGN_RIGHT = Uint8Array.from([ESC, 0x61, 0x02]);
const DOUBLE_HEIGHT = Uint8Array.from([ESC, 0x21, 0x10]);
const DOUBLE_WH = Uint8Array.from([ESC, 0x21, 0x30]);
const NORMAL = Uint8Array.from([ESC, 0x21, 0x00]);
const FULL_CUT = Uint8Array.from([GS, 0x56, 0x00]);
const FEED_5 = Uint8Array.from([ESC, 0x64, 0x05]);
const FEED_3 = Uint8Array.from([ESC, 0x64, 0x03]);

const LINE_WIDTH = 42;

function sanitize(t: string): string {
  return t.replace(/\r\n/g, "\n").replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[–, ]/g, "-").replace(/…/g, "...").replace(/\u00A0/g, " ");
}
function enc(t: string) { return encodeCP1252(sanitize(t)); }
function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
function toBase64(b: Uint8Array): string {
  let bin = "";
  const size = 0x8000;
  for (let i = 0; i < b.length; i += size) {
    bin += Array.from(b.subarray(i, i + size), x => String.fromCharCode(x)).join("");
  }
  return btoa(bin);
}
function sep(c = "-") { return c.repeat(LINE_WIDTH); }
function padR(t: string, w: number) { return t.length >= w ? t.substring(0, w) : t + " ".repeat(w - t.length); }
function padL(t: string, w: number) { return t.length >= w ? t.substring(0, w) : " ".repeat(w - t.length) + t; }
function line2(l: string, r: string) {
  const s = LINE_WIDTH - l.length - r.length;
  return s <= 0 ? l.substring(0, LINE_WIDTH - r.length - 1) + " " + r : l + " ".repeat(s) + r;
}
function cols(c1: string, c2: string, c3: string, c4: string) {
  return padR(c1, 3) + padR(c2, 22) + padL(c3, 8) + padL(c4, 9);
}

function writer() {
  const chunks: Uint8Array[] = [INIT, DISABLE_CJK, CODEPAGE_WPC1252, INTL_SPAIN];
  return {
    cmd: (...c: Uint8Array[]) => chunks.push(...c),
    text: (v: string) => chunks.push(enc(v)),
    line: (v = "") => { if (v) chunks.push(enc(v)); chunks.push(LF); },
    done: () => concat(chunks),
  };
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type W = ReturnType<typeof writer>;

function detectUnitIndex(label: string): number | null {
  const l = label.toLowerCase();
  const m =
    l.match(/(?:pan\s*pita|pita|unidad|item|hamburguesa|burger|durum|wrap|d[oö]ner|kebab)\s*(\d+)/i) ||
    l.match(/del\s*(\d+)\s*[º°ª\.]?\s*(?:pan|pita|unidad|item)/i) ||
    l.match(/\b(\d+)\s*[º°ª]\b/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stripUnitPrefix(label: string): string {
  return label
    .replace(/^.*?(?:pan\s*pita|pita|unidad|item|hamburguesa|burger|durum|wrap|d[oö]ner|kebab)\s*\d+\s*[:\-–]\s*/i, "")
    .replace(/^.*?del\s*\d+\s*[º°ª\.]?\s*(?:pan|pita|unidad|item|hamburguesa)[^:]*[:\-–]\s*/i, "")
    .trim();
}

function classifyChoice(label: string): { type: "carne" | "verdura" | "salsa" | "otro"; value: string; isRemoval: boolean } {
  const l = label.toLowerCase();
  const isRemoval = /\b(sin|sem|no|sans|without)\b/.test(l);
  const value = stripUnitPrefix(label);
  if (/carne|meat|viande|pollo|ternera|cordero|mixto|mixed|mixte|kebab|d[oö]ner/.test(l)) return { type: "carne", value, isRemoval };
  if (/verdura|veggie|lechuga|tomate|cebol|col\b|salad|pepin|pimien/.test(l)) return { type: "verdura", value, isRemoval };
  if (/salsa|sauce|molho|ali[oñ]l[ií]|mayo|ketchup|barbacoa|bbq/.test(l)) return { type: "salsa", value, isRemoval };
  return { type: "otro", value, isRemoval };
}

function isSpicyYes(label: string): boolean {
  const l = label.toLowerCase();
  return /\b(con|com|s[ií]|yes|with|avec)\b/.test(l) && !/\b(sin|sem|no|sans|without)\b/.test(l);
}

function renderItemExtras(w: W, it: TicketItem) {
  const extras = it.extras ?? [];
  const perUnit = new Map<number, typeof extras>();
  const shared: typeof extras = [];
  let spicyShared: string | null = null;
  const spicyPerUnit = new Map<number, string>();

  for (const e of extras) {
    const lbl = e.name || "";
    const idx = detectUnitIndex(lbl);
    if (/picant|spicy|piquant/i.test(lbl)) {
      const val = `PICANTE: ${isSpicyYes(lbl) ? "SÍ" : "NO"}`;
      if (idx !== null) spicyPerUnit.set(idx, val);
      else spicyShared = val;
      continue;
    }
    if (idx !== null) {
      const arr = perUnit.get(idx) ?? [];
      arr.push(e);
      perUnit.set(idx, arr);
    } else {
      shared.push(e);
    }
  }

  for (const e of shared) {
    const ex = e.price ? `+ ${e.name} (${e.price.toFixed(2)}€)` : `+ ${e.name}`;
    w.line(`    ${sanitize(ex)}`);
  }
  if (spicyShared) {
    w.cmd(BOLD_ON);
    w.line(`    >> ${spicyShared}`);
    w.cmd(BOLD_OFF);
  }
  if (it.removed?.length) w.line(`    - sin ${it.removed.map(sanitize).join(", ")}`);

  const indices = Array.from(perUnit.keys()).sort((a, b) => a - b);
  for (const idx of indices) {
    w.line();
    w.cmd(BOLD_ON);
    w.line(`  >> PAN PITA ${idx}`);
    w.cmd(BOLD_OFF);
    const items = perUnit.get(idx) ?? [];
    const carnes: string[] = [];
    const verduras: string[] = [];
    const salsas: string[] = [];
    const otros: string[] = [];
    for (const e of items) {
      const c = classifyChoice(e.name || "");
      const display = c.isRemoval
        ? `Sin ${c.value.replace(/^(sin|sem|no|sans)\s+/i, "")}`
        : c.value;
      if (c.type === "carne") carnes.push(display);
      else if (c.type === "verdura") verduras.push(display);
      else if (c.type === "salsa") salsas.push(display);
      else otros.push(display);
    }
    if (carnes.length) w.line(`     Carne: ${sanitize(carnes.join(", "))}`);
    if (verduras.length) w.line(`     Verduras: ${sanitize(verduras.join(", "))}`);
    if (salsas.length) w.line(`     Salsas: ${sanitize(salsas.join(", "))}`);
    for (const o of otros) w.line(`     ${sanitize(o)}`);
    const sp = spicyPerUnit.get(idx);
    if (sp) {
      w.cmd(BOLD_ON);
      w.line(`     ${sp}`);
      w.cmd(BOLD_OFF);
    }
  }

  if (it.notes?.trim()) w.line(`    >> ${sanitize(it.notes.trim())}`);
}

export interface TicketItem {
  name: string;
  price: number;
  quantity: number;
  size?: string | null;
  extras?: { name: string; price?: number }[];
  removed?: string[];
  notes?: string;
}

export interface TicketOrder {
  id?: string;
  order_number?: string;
  customer_name?: string;
  seller_name?: string;
  order_type: "dine_in" | "takeaway" | "delivery" | string;
  table_number?: string | null;
  address?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  items: TicketItem[];
  total: number;
  subtotal?: number;
  created_at?: string;
  payment_method?: string | null;
  paid_via_app?: boolean;
  company_name: string;
  company_phone?: string;
  company_address?: string;
  company_cif?: string;
  company_url?: string;
}

function buildBytes(order: TicketOrder): Uint8Array {
  const now = order.created_at ? new Date(order.created_at) : new Date();
  const date = now.toLocaleDateString("es-ES");
  const time = now.toLocaleTimeString("es-ES");
  const num = order.order_number || (order.id ? order.id.substring(0, 8).toUpperCase() : "---");
  const total = order.total;
  const base = total / 1.1;
  const iva = total - base;

  const labels: Record<string, string> = {
    dine_in: "MESA", takeaway: "PARA LLEVAR", delivery: "DOMICILIO",
  };
  const zone = labels[order.order_type] || order.order_type.toUpperCase();

  const w = writer();
  w.cmd(ALIGN_CENTER, DOUBLE_WH, BOLD_ON);
  w.line(order.company_name.toUpperCase());
  w.cmd(NORMAL, BOLD_OFF);
  if (order.company_phone) w.line(`Tel: ${order.company_phone}`);
  if (order.company_address) w.line(order.company_address);
  if (order.company_cif) w.line(`CIF: ${order.company_cif}`);
  w.line();

  w.cmd(ALIGN_CENTER, DOUBLE_WH, BOLD_ON);
  if (order.order_type === "dine_in") w.line(order.table_number ? `*** MESA ${order.table_number} ***` : "*** MESA ***");
  else if (order.order_type === "takeaway") w.line("*** PARA LLEVAR ***");
  else if (order.order_type === "delivery") w.line("*** DOMICILIO ***");
  else w.line(`*** ${zone} ***`);
  w.cmd(NORMAL, BOLD_OFF, ALIGN_LEFT);

  w.line(sep("="));
  w.line(line2("PEDIDO:", `#${num}`));
  w.line(line2("FECHA:", date));
  w.line(line2("DÍA:", DAYS[now.getDay()]));
  w.line(line2("HORA:", time));
  w.line(line2("ZONA:", zone));
  if (order.order_type === "delivery" && order.address) w.line(line2("DIRECCIÓN:", sanitize(order.address)));
  if (order.contact_phone) w.line(line2("TEL CLIENTE:", order.contact_phone));
  if (order.customer_name) w.line(line2("CLIENTE:", sanitize(order.customer_name)));
  if (order.seller_name) w.line(line2("LE ATENDIÓ:", sanitize(order.seller_name)));
  w.line(sep("="));

  w.cmd(BOLD_ON);
  w.line(cols("UN", "DESCRIPCIÓN", "PRECIO", "IMPORTE"));
  w.cmd(BOLD_OFF);
  w.line(sep("-"));

  for (const it of order.items) {
    const name = it.size ? `${it.name} (${it.size})` : it.name;
    w.line(cols(it.quantity.toString(), sanitize(name), it.price.toFixed(2), (it.price * it.quantity).toFixed(2)));
    renderItemExtras(w, it);
  }


  w.line(sep("-"));
  w.line(line2("BASE IMPONIBLE:", `${base.toFixed(2)}€`));
  w.line(line2("IVA 10%:", `${iva.toFixed(2)}€`));
  w.line(sep("-"));

  w.cmd(ALIGN_RIGHT, DOUBLE_HEIGHT, BOLD_ON);
  w.line(`TOTAL: ${total.toFixed(2)}€`);
  w.cmd(NORMAL, BOLD_OFF, ALIGN_LEFT);
  w.line(sep("="));

  if (order.payment_method) {
    w.line();
    w.cmd(BOLD_ON);
    w.line(`FORMA DE PAGO: ${order.payment_method.toUpperCase()}`);
    w.cmd(BOLD_OFF);
    w.line(sep("-"));
  }

  if (order.notes?.trim()) {
    w.line();
    w.cmd(BOLD_ON); w.line("OBSERVACIONES:"); w.cmd(BOLD_OFF);
    w.line(sanitize(order.notes.trim()));
    w.line(sep("-"));
  }

  w.line();
  w.cmd(ALIGN_CENTER, BOLD_ON);
  if (order.paid_via_app) {
    w.cmd(DOUBLE_HEIGHT); w.line("*** PAGO VIA APP ***"); w.cmd(NORMAL);
  } else if (order.payment_method) {
    w.cmd(DOUBLE_HEIGHT); w.line("*** PAGADO ***"); w.cmd(NORMAL);
  } else {
    w.line("*** COMANDA PENDIENTE DE COBRO ***");
  }
  w.cmd(BOLD_OFF);
  w.line();
  w.line("¡Gracias por su visita!");
  if (order.company_url) w.line(order.company_url);
  w.cmd(FEED_5, FULL_CUT);

  return w.done();
}

function buildTestBytes(name: string, ip: string, port: number): Uint8Array {
  const now = new Date();
  const w = writer();
  w.cmd(ALIGN_CENTER, DOUBLE_WH, BOLD_ON);
  w.line(name.toUpperCase());
  w.cmd(NORMAL, BOLD_OFF);
  w.line();
  w.line(sep("="));
  w.cmd(BOLD_ON, DOUBLE_HEIGHT); w.line("TEST LAN PRINT"); w.cmd(NORMAL, BOLD_OFF);
  w.line(sep("="));
  w.line();
  w.cmd(ALIGN_LEFT);
  w.line(line2("FECHA:", now.toLocaleDateString("es-ES")));
  w.line(line2("HORA:", now.toLocaleTimeString("es-ES")));
  w.line(line2("IP:", ip));
  w.line(line2("PUERTO:", String(port)));
  w.line();
  w.cmd(ALIGN_CENTER);
  w.line("¡Impresión LAN correcta!");
  w.line("á é í ó ú ñ €");
  w.line(sep("-"));
  w.line();
  w.cmd(FEED_3, FULL_CUT);
  return w.done();
}

export function buildEscPosTicket(order: TicketOrder): string {
  return toBase64(buildBytes(order));
}
export function buildTestTicket(name: string, ip: string, port: number): string {
  return toBase64(buildTestBytes(name, ip, port));
}

export const sampleOrder = (companyName: string): TicketOrder => ({
  id: "TEST0001",
  order_number: "TEST",
  customer_name: "Juan García",
  seller_name: "Cocina",
  order_type: "dine_in",
  table_number: "5",
  notes: "Sin cebolla, extra queso",
  items: [
    { name: "Pizza Margarita", price: 8.5, quantity: 2 },
    { name: "Coca-Cola 33cl", price: 2, quantity: 3 },
    { name: "Hamburguesa Clásica", price: 6.5, quantity: 1, notes: "Punto medio" },
  ],
  total: 30.5,
  company_name: companyName,
});
