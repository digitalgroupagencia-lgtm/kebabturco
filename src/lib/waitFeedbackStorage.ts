const DISMISS_PREFIX = "kebab_wait_feedback_dismissed_";
const SENT_PREFIX = "kebab_wait_feedback_sent_";

export function wasWaitFeedbackDismissed(orderId: string): boolean {
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${orderId}`) === "1";
  } catch {
    return false;
  }
}

export function wasWaitFeedbackSent(orderId: string): boolean {
  try {
    return localStorage.getItem(`${SENT_PREFIX}${orderId}`) === "1";
  } catch {
    return false;
  }
}

export function markWaitFeedbackDismissed(orderId: string): void {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${orderId}`, "1");
  } catch {
    /* ignore */
  }
}

export function markWaitFeedbackSent(orderId: string): void {
  try {
    localStorage.setItem(`${SENT_PREFIX}${orderId}`, "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowWaitFeedback(orderId: string): boolean {
  return !wasWaitFeedbackDismissed(orderId) && !wasWaitFeedbackSent(orderId);
}
