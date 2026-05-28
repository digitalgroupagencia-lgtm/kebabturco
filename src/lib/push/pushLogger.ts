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
  | "unsubscribe";

export type PushLogEntry = {
  id: string;
  at: string;
  level: PushLogLevel;
  context: PushLogContext;
  stage: PushLogStage;
  message: string;
  details?: Record<string, unknown>;
};

const MAX_LOGS = 120;
const logs: PushLogEntry[] = [];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

let logCounter = 0;

export function pushLog(
  context: PushLogContext,
  stage: PushLogStage,
  level: PushLogLevel,
  message: string,
  details?: Record<string, unknown>,
): string {
  const id = `push-${Date.now()}-${++logCounter}`;
  const entry: PushLogEntry = {
    id,
    at: new Date().toISOString(),
    level,
    context,
    stage,
    message,
    details: details && Object.keys(details).length > 0 ? details : undefined,
  };

  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;

  const prefix = `[push:${context}:${stage}]`;
  if (level === "error") console.error(prefix, message, details ?? "");
  else if (level === "warn") console.warn(prefix, message, details ?? "");
  else console.info(prefix, message, details ?? "");

  notifyListeners();
  return id;
}

export function getPushLogs(): PushLogEntry[] {
  return [...logs];
}

export function clearPushLogs(): void {
  logs.length = 0;
  notifyListeners();
}

export function subscribePushLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
