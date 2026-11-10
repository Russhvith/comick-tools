// A fixed locale, because the server and the browser rarely agree on one
// ("PM" against "pm" is enough to fail hydration). The time zone is the
// local one on both sides when the UI runs on your own machine.
export function clockTime(ms: number) {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/** Same steps as the Python side: ms, then s, then m and s. */
export function duration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)} m ${String(whole % 60).padStart(2, "0")} s`;
}

export function relativeTime(ms: number, now = Date.now()) {
  const diff = Math.round((now - ms) / 1000);
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return new Date(ms).toLocaleDateString();
}
