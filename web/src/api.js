// Backend client + identity. Mirrors the extension: a session token when signed
// in, otherwise a per-browser client id.
const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8787";

function clientId() {
  let id = localStorage.getItem("clientId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("clientId", id);
  }
  return id;
}

function token() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : { "X-Client-Id": clientId() };
}

async function post(path, body, withAuth = true) {
  const headers = { "Content-Type": "application/json", ...(withAuth ? authHeaders() : {}) };
  const res = await fetch(BASE + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, data };
}

export const api = {
  me: () => post("/me", {}),
  requestCode: (email) => post("/auth/request", { email }, false),
  verifyCode: (email, code) => post("/auth/verify", { email, code, clientId: clientId() }, false),
  generate: (payload) => post("/generate", payload),
  checkout: (plan) => post("/billing/checkout", { plan }),
  listDecks: () => post("/decks/list", {}),
  getDeck: (id) => post("/decks/get", { id }),
  saveDeck: (deck) => post("/decks/save", deck),
  deleteDeck: (id) => post("/decks/delete", { id }),
  setToken: (t) => localStorage.setItem("token", t),
  signOut: () => localStorage.removeItem("token"),
};
