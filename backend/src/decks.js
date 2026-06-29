// Saved decks (a titled {notes, quiz}) per principal ("user:<id>" or "anon:<clientId>").
import { json } from "./util.js";

// Free tier gets a taste; Pro is unlimited.
const MAX_FREE_DECKS = 5;

export async function saveDeck(env, who, body) {
  const title = (body.title || "Untitled").toString().trim().slice(0, 200) || "Untitled";
  const payload = JSON.stringify({
    notes: Array.isArray(body.notes) ? body.notes : [],
    quiz: Array.isArray(body.quiz) ? body.quiz : [],
  });
  if (payload.length > 100000) return json({ error: "Deck too large" }, 413);

  const acct = await env.DB.prepare("SELECT tier FROM accounts WHERE id = ?")
    .bind(who.principal)
    .first();
  if ((acct?.tier || "free") !== "pro") {
    const row = await env.DB.prepare("SELECT COUNT(*) AS c FROM decks WHERE account_id = ?")
      .bind(who.principal)
      .first();
    if ((row?.c ?? 0) >= MAX_FREE_DECKS) {
      return json(
        { error: `Free plan saves up to ${MAX_FREE_DECKS} decks. Upgrade for unlimited.`, limit: true },
        403,
      );
    }
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO decks (id, account_id, title, data_json, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(id, who.principal, title, payload, new Date().toISOString())
    .run();
  return json({ id, title });
}

export async function listDecks(env, who) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, created_at FROM decks WHERE account_id = ? ORDER BY created_at DESC",
  )
    .bind(who.principal)
    .all();
  return json({ decks: results || [] });
}

export async function getDeck(env, who, id) {
  const row = await env.DB.prepare(
    "SELECT id, title, data_json, created_at FROM decks WHERE id = ? AND account_id = ?",
  )
    .bind(id, who.principal)
    .first();
  if (!row) return json({ error: "Not found" }, 404);
  let data = {};
  try {
    data = JSON.parse(row.data_json);
  } catch {}
  return json({
    id: row.id,
    title: row.title,
    notes: data.notes || [],
    quiz: data.quiz || [],
    created_at: row.created_at,
  });
}

export async function deleteDeck(env, who, id) {
  await env.DB.prepare("DELETE FROM decks WHERE id = ? AND account_id = ?")
    .bind(id, who.principal)
    .run();
  return json({ ok: true });
}
