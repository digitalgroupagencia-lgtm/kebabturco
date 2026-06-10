import { Bell, CheckCircle2, Clock, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMinutesAgo,
  resolveOwnerLinkActivity,
  type OwnerLinkActivity,
} from "@/lib/payoutIntakeActivity";
import type { StoreFinancialProfile } from "@/services/orderService";
import type { StorePayoutIntake } from "@/services/payoutIntakeService";

type Props = {
  intake: StorePayoutIntake | null;
  profile: StoreFinancialProfile | null;
  onRefresh?: () => void;
  refreshing?: boolean;
};

function messageFor(activity: OwnerLinkActivity): { title: string; detail: string; tone: "blue" | "amber" | "green" } {
  const who = activity.ownerName || activity.businessName || "O dono do restaurante";
  const email = activity.ownerEmail ? ` (${activity.ownerEmail})` : "";

  if (activity.stage === "active") {
    return {
      tone: "green",
      title: "Recebimentos activos",
      detail: `${who} completou o registo pelo link WhatsApp. Os pagamentos online já estão activos.`,
    };
  }

  if (activity.stage === "verified" && activity.verifiedAt) {
    return {
      tone: "blue",
      title: "Registo completo — em análise",
      detail: `${who}${email} terminou dados e verificação ${formatMinutesAgo(activity.verifiedAt)}. A aprovação final pode demorar um pouco — volte aqui para ver quando ficar «Activos».`,
    };
  }

  if (activity.stage === "data_only" && activity.dataAt) {
    return {
      tone: "amber",
      title: "Dados recebidos pelo link WhatsApp",
      detail: `${who}${email} enviou os dados ${formatMinutesAgo(activity.dataAt)}. Se ainda não fez o passo do documento, envie o link outra vez.`,
    };
  }

  return {
    tone: "blue",
    title: "",
    detail: "",
  };
}

export default function OwnerLinkActivityBanner({ intake, profile, onRefresh, refreshing }: Props) {
  const activity = resolveOwnerLinkActivity(intake, profile);
  if (activity.stage === "none") return null;

  const msg = messageFor(activity);
  const toneClass =
    msg.tone === "green"
      ? "border-green-500/50 bg-green-500/10 text-green-900 dark:text-green-200"
      : msg.tone === "amber"
        ? "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100"
        : "border-blue-500/50 bg-blue-500/10 text-blue-950 dark:text-blue-100";

  const Icon =
    activity.stage === "active" ? CheckCircle2 : activity.stage === "verified" ? FileCheck : Bell;

  return (
    <div className={`rounded-2xl border-2 p-4 space-y-2 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-black text-sm">{msg.title}</p>
          <p className="text-xs leading-relaxed opacity-90">{msg.detail}</p>
          {activity.stage !== "active" && (
            <p className="text-[11px] flex items-center gap-1 opacity-75 pt-1">
              <Clock className="h-3 w-3" />
              Actualize esta página para ver se já passou a «Activos».
            </p>
          )}
        </div>
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 h-8 text-xs bg-background/70"
            disabled={refreshing}
            onClick={onRefresh}
          >
            {refreshing ? "A actualizar…" : "Actualizar"}
          </Button>
        )}
      </div>
    </div>
  );
}
