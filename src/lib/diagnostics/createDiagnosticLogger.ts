export type DiagnosticDomain = "push" | "printer" | "coupon" | "loyalty" | "campaign" | "plan";

export type DiagnosticLogLevel = "info" | "warn" | "error";

export type DiagnosticLogEntry = {
  id: string;
  at: string;
  domain: DiagnosticDomain;
  stage: string;
  level: DiagnosticLogLevel;
  message: string;
  context?: string;
  details?: Record<string, unknown>;
};

export type DiagnosticLogger = {
  log: (opts: {
    stage: string;
    level: DiagnosticLogLevel;
    message: string;
    context?: string;
    details?: Record<string, unknown>;
  }) => string;
  getLogs: () => DiagnosticLogEntry[];
  clearLogs: () => void;
  subscribe: (listener: () => void) => () => void;
};

export function createDiagnosticLogger(domain: DiagnosticDomain, maxLogs = 120): DiagnosticLogger {
  const logs: DiagnosticLogEntry[] = [];
  const listeners = new Set<() => void>();
  let counter = 0;

  function notifyListeners() {
    listeners.forEach((fn) => fn());
  }

  function log(opts: {
    stage: string;
    level: DiagnosticLogLevel;
    message: string;
    context?: string;
    details?: Record<string, unknown>;
  }): string {
    const id = `${domain}-${Date.now()}-${++counter}`;
    const entry: DiagnosticLogEntry = {
      id,
      at: new Date().toISOString(),
      domain,
      stage: opts.stage,
      level: opts.level,
      message: opts.message,
      context: opts.context,
      details: opts.details && Object.keys(opts.details).length > 0 ? opts.details : undefined,
    };

    logs.unshift(entry);
    if (logs.length > maxLogs) logs.length = maxLogs;

    const prefix = `[${domain}:${opts.context ?? "system"}:${opts.stage}]`;
    if (opts.level === "error") console.error(prefix, opts.message, opts.details ?? "");
    else if (opts.level === "warn") console.warn(prefix, opts.message, opts.details ?? "");
    else console.info(prefix, opts.message, opts.details ?? "");

    notifyListeners();
    return id;
  }

  return {
    log,
    getLogs: () => [...logs],
    clearLogs: () => {
      logs.length = 0;
      notifyListeners();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
