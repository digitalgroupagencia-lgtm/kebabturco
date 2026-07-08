import { pushDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";
import type { DiagnosticLogEntry } from "@/lib/diagnostics/createDiagnosticLogger";

export type PushLogContext = "staff" | "customer_marketing" | "order" | "test" | "system";

export type PushLogLevel = "info" | "warn" | "error";

export type PushLogStage =
  | "init"
  | "vapid_check"
  | "browser_support"
  | "service_worker"
  | "permission"
  | "subscribe"
  | "subscription_parse"
  | "db_register"
  | "test_send"
  | "broadcast_send"
  | "unsubscribe"
  | "native_register"
  | "la_token_count"
  | "lab_orders"
  | "lab_order_create"
  | "lab_send";

export type PushLogEntry = DiagnosticLogEntry & {
  context: PushLogContext;
  stage: PushLogStage;
};

function toPushEntry(entry: DiagnosticLogEntry): PushLogEntry {
  return {
    ...entry,
    context: (entry.context ?? "system") as PushLogContext,
    stage: entry.stage as PushLogStage,
  };
}

export function pushLog(
  context: PushLogContext,
  stage: PushLogStage,
  level: PushLogLevel,
  message: string,
  details?: Record<string, unknown>,
): string {
  return pushDiagnosticLogger.log({ context, stage, level, message, details });
}

export function getPushLogs(): PushLogEntry[] {
  return pushDiagnosticLogger.getLogs().map(toPushEntry);
}

export function clearPushLogs(): void {
  pushDiagnosticLogger.clearLogs();
}

export function subscribePushLogs(listener: () => void): () => void {
  return pushDiagnosticLogger.subscribe(listener);
}

/** Classifica erros comuns de permissão / VAPID / browser para logs legíveis. */
export function describePushFailure(error: unknown, permission?: NotificationPermission): {
  message: string;
  code: string;
  details: Record<string, unknown>;
} {
  const name = error instanceof DOMException ? error.name : undefined;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const perm = permission ?? (typeof Notification !== "undefined" ? Notification.permission : "unknown");

  if (perm === "denied") {
    return {
      code: "permission_denied",
      message: "Permissão de notificações negada pelo utilizador ou pelo browser",
      details: { permission: perm, domException: name, rawMessage },
    };
  }

  if (perm === "default") {
    return {
      code: "permission_not_granted",
      message: "Permissão de notificações ainda não foi concedida",
      details: { permission: perm, domException: name, rawMessage },
    };
  }

  if (name === "InvalidAccessError" || /applicationServerKey|vapid/i.test(rawMessage)) {
    return {
      code: "vapid_invalid",
      message: "Chave VAPID inválida ou não corresponde à chave privada do servidor",
      details: { permission: perm, domException: name, rawMessage },
    };
  }

  if (name === "NotAllowedError") {
    return {
      code: "not_allowed",
      message: "Browser bloqueou a subscrição push (permissão ou política do site)",
      details: { permission: perm, domException: name, rawMessage },
    };
  }

  if (name === "AbortError") {
    return {
      code: "subscribe_aborted",
      message: "Subscrição push cancelada ou interrompida",
      details: { permission: perm, domException: name, rawMessage },
    };
  }

  if (/service worker|serviceworker|registration/i.test(rawMessage)) {
    return {
      code: "service_worker",
      message: "Falha ao registar ou activar o service worker de push",
      details: { permission: perm, domException: name, rawMessage },
    };
  }

  if (/secure context|https/i.test(rawMessage)) {
    return {
      code: "insecure_context",
      message: "Push só funciona em HTTPS (ou localhost)",
      details: { permission: perm, domException: name, rawMessage },
    };
  }

  return {
    code: "unknown",
    message: rawMessage || "Erro desconhecido na subscrição push",
    details: { permission: perm, domException: name, rawMessage },
  };
}
