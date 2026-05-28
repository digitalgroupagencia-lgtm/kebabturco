/** Covers the viewport until the first customer screen is fully painted. */
export function dismissBootShell(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("boot-fallback");
  if (!el || el.dataset.dismissed === "1") return;
  el.dataset.dismissed = "1";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.remove();
    });
  });
}
