/**
 * Avalia se uma loja está aberta agora, respeitando timezone (Europe/Madrid)
 * e mudança automática de horário de verão (DST nativo do browser via Intl).
 *
 * Estrutura dos JSONBs:
 *   { mon: { open: boolean, ranges: [["HH:MM","HH:MM"], ...] }, tue: ..., ... }
 * Range "24:00" significa fim-do-dia (00:00 do dia seguinte).
 */

export type WeeklySchedule = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  { open: boolean; ranges: Array<[string, string]> }
>;

const DAY_KEYS: Array<keyof WeeklySchedule> = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

const KEBAB_DEFAULTS: WeeklySchedule = {
  mon: { open: true, ranges: [["12:00", "24:00"]] },
  tue: { open: true, ranges: [["12:00", "24:00"]] },
  wed: { open: true, ranges: [["12:00", "24:00"]] },
  thu: { open: true, ranges: [["12:00", "24:00"]] },
  fri: { open: true, ranges: [["12:00", "24:00"]] },
  sat: { open: true, ranges: [["12:00", "24:00"]] },
  sun: { open: true, ranges: [["12:00", "24:00"]] },
};

const DELIVERY_DEFAULTS: WeeklySchedule = {
  mon: { open: true, ranges: [["12:00", "16:00"], ["19:00", "24:00"]] },
  tue: { open: true, ranges: [["12:00", "16:00"], ["19:00", "24:00"]] },
  wed: { open: true, ranges: [["12:00", "16:00"], ["19:00", "24:00"]] },
  thu: { open: true, ranges: [["12:00", "16:00"], ["19:00", "24:00"]] },
  fri: { open: true, ranges: [["12:00", "24:00"]] },
  sat: { open: true, ranges: [["12:00", "24:00"]] },
  sun: { open: true, ranges: [["12:00", "24:00"]] },
};

export const STORE_DEFAULTS = KEBAB_DEFAULTS;
export const DELIVERY_STORE_DEFAULTS = DELIVERY_DEFAULTS;

export function parseSchedule(raw: unknown, fallback: WeeklySchedule): WeeklySchedule {
  if (!raw || typeof raw !== "object") return fallback;
  try {
    const out = { ...fallback };
    for (const k of DAY_KEYS) {
      const v = (raw as any)[k];
      if (v && typeof v === "object" && Array.isArray(v.ranges)) {
        out[k] = {
          open: Boolean(v.open),
          ranges: v.ranges
            .filter((r: any) => Array.isArray(r) && r.length === 2)
            .map((r: any) => [String(r[0]), String(r[1])] as [string, string]),
        };
      }
    }
    return out;
  } catch {
    return fallback;
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
}

/** Devolve { dayIdx (0=sun..6=sat), minutes, hhmm } na timezone dada. */
function nowInTz(timezone: string, now: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayIdx = map[weekday] ?? 0;
  return { dayIdx, minutes: hour * 60 + minute };
}

export interface OpenStatus {
  open: boolean;
  nextOpenLabel: string | null; // "12:00" do próximo abrir
  nextOpenDayLabel: string | null; // "hoje" | "amanhã" | dia da semana
  currentRange: [string, string] | null;
}

export function evaluateSchedule(
  schedule: WeeklySchedule,
  timezone = "Europe/Madrid",
  now: Date = new Date(),
): OpenStatus {
  const { dayIdx, minutes } = nowInTz(timezone, now);
  const todayKey = DAY_KEYS[dayIdx];
  const today = schedule[todayKey];

  if (today?.open) {
    for (const [start, end] of today.ranges) {
      const s = toMinutes(start);
      const e = toMinutes(end);
      if (minutes >= s && minutes < e) {
        return { open: true, nextOpenLabel: null, nextOpenDayLabel: null, currentRange: [start, end] };
      }
    }
    // Procura próximo range no MESMO dia
    for (const [start, end] of today.ranges) {
      if (minutes < toMinutes(start)) {
        return { open: false, nextOpenLabel: start, nextOpenDayLabel: "hoje", currentRange: null };
      }
    }
  }

  // Procura nos próximos 7 dias
  const dayLabelsPt = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  for (let i = 1; i <= 7; i++) {
    const idx = (dayIdx + i) % 7;
    const d = schedule[DAY_KEYS[idx]];
    if (d?.open && d.ranges.length > 0) {
      return {
        open: false,
        nextOpenLabel: d.ranges[0][0],
        nextOpenDayLabel: i === 1 ? "amanhã" : dayLabelsPt[idx],
        currentRange: null,
      };
    }
  }
  return { open: false, nextOpenLabel: null, nextOpenDayLabel: null, currentRange: null };
}
