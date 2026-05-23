type DeployDebugPayload = {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  runId?: string;
};

/** Logs de diagnóstico de deploy (sessão debug 3e76ec). */
export function deployDebugLog(payload: DeployDebugPayload) {
  const body = {
    sessionId: "3e76ec",
    timestamp: Date.now(),
    runId: payload.runId ?? "pre-fix",
    hypothesisId: payload.hypothesisId,
    location: payload.location,
    message: payload.message,
    data: payload.data ?? {},
  };

  // #region agent log
  fetch("http://127.0.0.1:7896/ingest/7b5f54c5-a028-41c6-a662-fdbe561184fd", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3e76ec" },
    body: JSON.stringify(body),
  }).catch(() => {});
  // #endregion
}
