// Shared helpers: CORS, JSON responses, hashing, HMAC, session tokens.

export const FREE_CREDITS = 10;

// CORS headers, computed per-request. If ALLOWED_ORIGINS is unset, allow "*"
// (handy in dev; the extension bypasses CORS anyway via host_permissions).
// In prod, set ALLOWED_ORIGINS to a comma-separated list (your web app origin,
// and "chrome-extension://<id>") to lock it down.
export function corsHeaders(request, env) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Client-Id, Authorization",
  };
  const allow = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allow.length === 0) {
    headers["Access-Control-Allow-Origin"] = "*";
    return headers;
  }
  const origin = request.headers.get("Origin");
  if (origin && allow.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

// CORS is applied centrally at the fetch boundary, so json() only sets Content-Type.
export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

const enc = new TextEncoder();

function b64urlEncode(bytes) {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function hmacSignB64url(secret, data) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64urlEncode(sig);
}

export async function hmacHex(secret, data) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// --- Session tokens (compact HMAC-signed: payload.signature) ---

export async function signSession(secret, payload, ttlSeconds = 60 * 60 * 24 * 30) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = b64urlEncode(enc.encode(JSON.stringify(body)));
  const sig = await hmacSignB64url(secret, data);
  return `${data}.${sig}`;
}

export async function verifySession(secret, token) {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = await hmacSignB64url(secret, data);
  if (!timingSafeEqual(expected, sig)) return null;
  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(b64urlToBytes(data)));
  } catch {
    return null;
  }
  if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}
