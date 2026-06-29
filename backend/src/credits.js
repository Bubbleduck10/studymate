// Credits accounting against D1. `id` is a principal: "user:<id>" or "anon:<clientId>".
import { FREE_CREDITS } from "./util.js";

export const MODEL = "claude-haiku-4-5";
export const MODEL_COST = {
  "claude-haiku-4-5": 1,
  "claude-sonnet-4-6": 3,
  "claude-opus-4-8": 3,
};
export const COST = MODEL_COST[MODEL] ?? 1;

function curPeriod() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

// Returns the account row, creating it with the free allotment on first sight
// and lazily resetting free-tier credits at the start of each calendar month.
export async function getOrCreateAccount(env, id) {
  const now = new Date().toISOString();
  const period = curPeriod();

  const existing = await env.DB.prepare(
    "SELECT id, credits, tier, period FROM accounts WHERE id = ?",
  )
    .bind(id)
    .first();

  if (!existing) {
    await env.DB.prepare(
      "INSERT INTO accounts (id, credits, tier, period, created_at) VALUES (?, ?, 'free', ?, ?)",
    )
      .bind(id, FREE_CREDITS, period, now)
      .run();
    return { id, credits: FREE_CREDITS, tier: "free", period };
  }

  if (existing.tier === "free" && existing.period !== period) {
    await env.DB.prepare("UPDATE accounts SET credits = ?, period = ? WHERE id = ?")
      .bind(FREE_CREDITS, period, id)
      .run();
    return { ...existing, credits: FREE_CREDITS, period };
  }

  return existing;
}

export async function getBalance(env, id) {
  const row = await env.DB.prepare("SELECT credits FROM accounts WHERE id = ?").bind(id).first();
  return row?.credits ?? 0;
}

// Atomic decrement (guards against going negative) + spend log. Returns new balance.
export async function charge(env, id, cost, model) {
  const res = await env.DB.prepare(
    "UPDATE accounts SET credits = credits - ? WHERE id = ? AND credits >= ?",
  )
    .bind(cost, id, cost)
    .run();

  if (res.meta?.changes === 1) {
    await env.DB.prepare(
      "INSERT INTO spend_log (account_id, cost, model, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(id, cost, model, new Date().toISOString())
      .run();
  }
  return getBalance(env, id);
}

export async function addCredits(env, id, amount) {
  await getOrCreateAccount(env, id);
  await env.DB.prepare("UPDATE accounts SET credits = credits + ? WHERE id = ?")
    .bind(amount, id)
    .run();
  return getBalance(env, id);
}

export async function setTier(env, id, tier) {
  await getOrCreateAccount(env, id);
  await env.DB.prepare("UPDATE accounts SET tier = ? WHERE id = ?").bind(tier, id).run();
}
