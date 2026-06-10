import type { StoreFinancialProfile } from "@/services/orderService";
import type { StorePayoutIntake } from "@/services/payoutIntakeService";
import { isStripeConnectReady } from "@/lib/stripeConnectReady";

type IntakeMeta = {
  linkAt: string | null;
  verifyAt: string | null;
};

function parseNotesMeta(notes: string | null | undefined): IntakeMeta {
  const out: IntakeMeta = { linkAt: null, verifyAt: null };
  if (!notes?.trim()) return out;
  for (const part of notes.split("|")) {
    const p = part.trim();
    if (p.startsWith("link_at:")) out.linkAt = p.slice(8).trim() || null;
    if (p.startsWith("verify_at:")) out.verifyAt = p.slice(10).trim() || null;
  }
  return out;
}

export type OwnerLinkActivity = {
  dataAt: string | null;
  verifiedAt: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  businessName: string | null;
  ready: boolean;
  stage: "none" | "data_only" | "verified" | "active";
};

export function resolveOwnerLinkActivity(
  intake: StorePayoutIntake | null | undefined,
  profile: StoreFinancialProfile | null | undefined,
): OwnerLinkActivity {
  const meta = parseNotesMeta(intake?.notes);
  const dataAt = intake?.whatsapp_data_at ?? meta.linkAt ?? null;
  const verifiedAt = intake?.whatsapp_verified_at ?? meta.verifyAt;
  const ready = isStripeConnectReady(profile);

  let stage: OwnerLinkActivity["stage"] = "none";
  if (ready) stage = "active";
  else if (verifiedAt) stage = "verified";
  else if (dataAt) stage = "data_only";

  return {
    dataAt: dataAt ?? null,
    verifiedAt: verifiedAt ?? null,
    ownerName: intake?.owner_full_name ?? null,
    ownerEmail: intake?.owner_email ?? null,
    businessName: intake?.business_name ?? null,
    ready,
    stage,
  };
}

export function formatMinutesAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "agora mesmo";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "há menos de 1 minuto";
  if (min === 1) return "há 1 minuto";
  if (min < 60) return `há ${min} minutos`;
  const h = Math.floor(min / 60);
  if (h === 1) return "há 1 hora";
  if (h < 24) return `há ${h} horas`;
  const d = Math.floor(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}
