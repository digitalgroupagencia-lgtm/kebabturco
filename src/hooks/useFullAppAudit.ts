import { useCallback, useState } from "react";
import { useOperationalDiagnostics } from "@/features/ops/useOperationalDiagnostics";
import {
  loadStoredFullAuditReport,
  runFullAppAudit,
  type FullAuditReport,
} from "@/services/fullAppAuditService";

export function useFullAppAudit(storeId: string | null, tenantId?: string | null) {
  const opsDiag = useOperationalDiagnostics();
  const [report, setReport] = useState<FullAuditReport | null>(() => loadStoredFullAuditReport());
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      await opsDiag.run();
      const next = await runFullAppAudit({
        storeId,
        tenantId: tenantId ?? null,
        opsItems: opsDiag.items,
      });
      setReport(next);
      return next;
    } finally {
      setRunning(false);
    }
  }, [opsDiag, storeId, tenantId]);

  return {
    report,
    running: running || opsDiag.running,
    run,
    opsItems: opsDiag.items,
  };
}
