// Email one-time-code auth. No passwords. Works identically for extension/web/iOS.
import { json, sha256Hex, signSession, verifySession, FREE_CREDITS, b64urlToBytes } from "./util.js";

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
        from: env.EMAIL_FROM || "NoteJet <onboarding@resend.dev>",
        to: email,
        subject: "Your NoteJet sign-in code",
        text: `Your code is ${code}. It expires in 10 minutes.`,
      }),
    });
  } else {
    // Dev: no email provider configured — read the code from the wrangler console.
    console.log(`[dev] NoteJet login code for ${email}: ${code}`);
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
  return authResponse(env, userId, email, remaining);
}

// Google Sign-In: verify the Google ID token server-side, then issue our session
// (same path as the email flow). GOOGLE_CLIENT_ID must be set in the Worker env.
export async function googleAuth(env, idToken, clientId) {
  // Accept tokens minted for the web client OR the iOS client.
  const allowedAuds = [env.GOOGLE_CLIENT_ID, env.GOOGLE_IOS_CLIENT_ID].filter(Boolean);
  const payload = await verifyGoogleIdToken(idToken, allowedAuds);
  if (!payload) return json({ error: "Google sign-in failed" }, 401);
  if (!payload.email || payload.email_verified === false) {
    return json({ error: "Google email not verified" }, 401);
  }
  const email = payload.email.toLowerCase();
  const userId = await ensureUser(env, email);
  const remaining = await mergeAnonIntoUser(env, userId, clientId);
  return authResponse(env, userId, email, remaining);
}

// Issue a session and tell the client whether a username still needs to be chosen.
async function authResponse(env, userId, email, remaining) {
  const u = await env.DB.prepare("SELECT username FROM users WHERE id = ?").bind(userId).first();
  const username = u?.username || null;
  const token = await signSession(env.AUTH_SECRET, { sub: userId, email });
  return json({ token, email, username, needsUsername: !username, creditsRemaining: remaining });
}

// Set the signed-in user's username (3–20 chars; letters, numbers, underscore; unique).
export async function setUsername(env, who, raw) {
  if (!who?.userId) return json({ error: "Sign in" }, 401);
  const username = String(raw || "").trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return json({ error: "Username must be 3–20 letters, numbers, or underscores." }, 400);
  }
  try {
    await env.DB.prepare("UPDATE users SET username = ? WHERE id = ?")
      .bind(username, who.userId)
      .run();
  } catch (e) {
    if (String(e.message || "").toUpperCase().includes("UNIQUE")) {
      return json({ error: "That username is taken." }, 409);
    }
    throw e;
  }
  return json({ ok: true, username });
}

async function verifyGoogleIdToken(idToken, allowedAuds) {
  const auds = Array.isArray(allowedAuds) ? allowedAuds : [allowedAuds];
  if (!idToken || auds.length === 0) return null;
  try {
    const [h, p, s] = idToken.split(".");
    if (!h || !p || !s) return null;
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
    const certs = await (await fetch("https://www.googleapis.com/oauth2/v3/certs")).json();
    const jwk = (certs.keys || []).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64urlToBytes(s),
      new TextEncoder().encode(`${h}.${p}`),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
    if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") return null;
    if (!auds.includes(payload.aud)) return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
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
  }
  // For an EXISTING user we deliberately do NOT fold the anon balance in —
  // otherwise signing out and back in would farm the free allotment each time.
  // (Anonymous accounts can only ever hold free credits; nothing to preserve.)

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
