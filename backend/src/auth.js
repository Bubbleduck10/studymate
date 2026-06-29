// Email one-time-code auth. No passwords. Works identically for extension/web/iOS.
import { json, sha256Hex, signSession, verifySession, FREE_CREDITS } from "./util.js";

const CODE_TTL_MS = 10 * 60 * 1000;

export const principalForUser = (userId) => `user:${userId}`;
export const principalForAnon = (clientId) => `anon:${clientId}`;

// Who is making this request: a signed-in user (Bearer token) or anonymous (X-Client-Id).
export async function resolvePrincipal(request, env) {
  const authz = request.headers.get("Authorization") || "";
  if (authz.startsWith("Bearer ")) {
    const body = await verifySession(env.AUTH_SECRET, authz.slice(7).trim());
    if (body?.sub) {
      return { principal: principalForUser(body.sub), userId: body.sub, email: body.email };
    }
  }
  const clientId = (request.headers.get("X-Client-Id") || "").trim();
  if (clientId && clientId.length <= 100) {
    return { principal: principalForAnon(clientId), userId: null };
  }
  return null;
}

export async function requestCode(env, email) {
  email = (email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Invalid email" }, 400);

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  const codeHash = await sha256Hex(`${email}:${code}:${env.AUTH_SECRET}`);
  const expires = Date.now() + CODE_TTL_MS;

  await env.DB.prepare(
    "INSERT INTO login_codes (email, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0) " +
      "ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0",
  )
    .bind(email, codeHash, expires)
    .run();

  await sendCode(env, email, code);
  return json({ ok: true });
}

async function sendCode(env, email, code) {
  if (env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || "StudyMate <onboarding@resend.dev>",
        to: email,
        subject: "Your StudyMate sign-in code",
        text: `Your code is ${code}. It expires in 10 minutes.`,
      }),
    });
  } else {
    // Dev: no email provider configured — read the code from the wrangler console.
    console.log(`[dev] StudyMate login code for ${email}: ${code}`);
  }
}

export async function verifyCode(env, email, code, clientId) {
  email = (email || "").trim().toLowerCase();
  const row = await env.DB.prepare(
    "SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?",
  )
    .bind(email)
    .first();

  if (!row) return json({ error: "Request a code first" }, 400);
  if (row.attempts >= 5) return json({ error: "Too many attempts — request a new code" }, 429);
  if (Date.now() > row.expires_at) return json({ error: "Code expired" }, 400);

  const codeHash = await sha256Hex(`${email}:${String(code || "").trim()}:${env.AUTH_SECRET}`);
  if (codeHash !== row.code_hash) {
    await env.DB.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?")
      .bind(email)
      .run();
    return json({ error: "Incorrect code" }, 401);
  }

  await env.DB.prepare("DELETE FROM login_codes WHERE email = ?").bind(email).run();

  const userId = await ensureUser(env, email);
  const remaining = await mergeAnonIntoUser(env, userId, clientId);
  const token = await signSession(env.AUTH_SECRET, { sub: userId, email });
  return json({ token, email, creditsRemaining: remaining });
}

async function ensureUser(env, email) {
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)")
    .bind(id, email, new Date().toISOString())
    .run();
  return id;
}

// On first login, seed the user account from the anon balance (no free-credit stacking);
// thereafter, fold any remaining anon credits in. Then retire the anon row.
async function mergeAnonIntoUser(env, userId, clientId) {
  const period = new Date().toISOString().slice(0, 7);
  const now = new Date().toISOString();
  const userPrincipal = `user:${userId}`;

  const user = await env.DB.prepare("SELECT credits FROM accounts WHERE id = ?")
    .bind(userPrincipal)
    .first();

  let anonCredits = null;
  if (clientId) {
    const anon = await env.DB.prepare("SELECT credits FROM accounts WHERE id = ?")
      .bind(`anon:${clientId}`)
      .first();
    anonCredits = anon?.credits ?? null;
  }

  if (!user) {
    const seed = anonCredits != null ? anonCredits : FREE_CREDITS;
    await env.DB.prepare(
      "INSERT INTO accounts (id, credits, tier, period, created_at) VALUES (?, ?, 'free', ?, ?)",
    )
      .bind(userPrincipal, seed, period, now)
      .run();
  } else if (anonCredits != null) {
    await env.DB.prepare("UPDATE accounts SET credits = credits + ? WHERE id = ?")
      .bind(anonCredits, userPrincipal)
      .run();
  }

  if (clientId) {
    // Carry any saved decks over to the account, then retire the anon row.
    await env.DB.prepare("UPDATE decks SET account_id = ? WHERE account_id = ?")
      .bind(userPrincipal, `anon:${clientId}`)
      .run();
    await env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(`anon:${clientId}`).run();
  }

  const finalRow = await env.DB.prepare("SELECT credits FROM accounts WHERE id = ?")
    .bind(userPrincipal)
    .first();
  return finalRow?.credits ?? 0;
}
