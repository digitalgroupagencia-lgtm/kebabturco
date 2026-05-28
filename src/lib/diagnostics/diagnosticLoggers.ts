import { createDiagnosticLogger } from "@/lib/diagnostics/createDiagnosticLogger";

export const pushDiagnosticLogger = createDiagnosticLogger("push");
export const printerDiagnosticLogger = createDiagnosticLogger("printer");
export const couponDiagnosticLogger = createDiagnosticLogger("coupon");
export const loyaltyDiagnosticLogger = createDiagnosticLogger("loyalty");
export const campaignDiagnosticLogger = createDiagnosticLogger("campaign");
export const planDiagnosticLogger = createDiagnosticLogger("plan");
