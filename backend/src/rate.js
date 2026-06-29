// Per-IP fixed-window rate limiting backed by D1.
// Returns a 429 Response when the limit is exceeded, or null to proceed.
// (CORS headers are applied centrally at the fetch boundary.)

export async function enforceLimit(env, request, scope, limit, windowMs) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const window = Math.floor(Date.now() / windowMs);

  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(bucket) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start = excluded.window_start
                    THEN rate_limits.count + 1 ELSE 1 END,
       window_start = excluded.window_start
     RETURNING count`,
  )
    .bind(`${scope}:${ip}`, window)
    .first();

  const count = row?.count ?? 1;
  if (count <= limit) return null;

  const retry = Math.ceil((windowMs - (Date.now() % windowMs)) / 1000);
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
    {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(retry) },
    },
  );
}
