// Structured logging (JSON lines, captured by `wrangler tail` / dashboard logs)
// and optional alerting to a webhook (Slack/Discord-style {text}).

export function logInfo(event, data = {}) {
  console.log(JSON.stringify({ level: "info", event, ...data, t: new Date().toISOString() }));
}

export function logError(event, err, data = {}) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      message: err?.message || String(err),
      ...data,
      t: new Date().toISOString(),
    }),
  );
}

// Fire-and-forget alert. Pass ctx so the request isn't held open waiting on it.
export function notify(env, ctx, message) {
  if (!env?.ALERT_WEBHOOK_URL) return;
  const p = fetch(env.ALERT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `StudyMate: ${message}` }),
  }).catch(() => {});
  if (ctx?.waitUntil) ctx.waitUntil(p);
}
