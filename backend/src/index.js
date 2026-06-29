import Anthropic from "@anthropic-ai/sdk";
import { json, safeJson, corsHeaders } from "./util.js";
import { logError, logInfo, notify } from "./log.js";
import * as auth from "./auth.js";
import * as billing from "./billing.js";
import * as decks from "./decks.js";
import { MODEL, creditCost, getOrCreateAccount, charge, listHistory } from "./credits.js";
import { fetchSourceText, isValidHttpUrl } from "./source.js";
import { enforceLimit } from "./rate.js";

const MAX_TEXT_CHARS = 50000; // ~12k tokens
const MAX_IMAGE_B64 = 7_000_000; // ~5 MB binary

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    notes: { type: "array", items: { type: "string" } },
    quiz: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "notes", "quiz"],
  additionalProperties: false,
};

const SYSTEM =
  "You are a study assistant. From the provided material, produce a short title, " +
  "4-6 concise bullet notes capturing the key ideas, and 3 quiz questions with brief " +
  "answers that test real understanding (not trivia). Keep everything tight.";

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    let res;
    try {
      res = await route(request, env, ctx);
    } catch (e) {
      logError("unhandled", e, { path: new URL(request.url).pathname });
      notify(env, ctx, `Unhandled error: ${e.message}`);
      res = json({ error: "Internal error" }, 500);
    }

    // Apply CORS centrally to every response.
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};

async function route(request, env, ctx) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

  // Stripe webhook: no client auth — verified by signature.
  if (request.method === "POST" && path === "/webhook/stripe") {
    return billing.webhook(env, request);
  }

  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  switch (path) {
    case "/auth/request": {
      const limited = await enforceLimit(env, request, "auth", 5, 15 * 60 * 1000);
      if (limited) return limited;
      const b = await safeJson(request);
      return auth.requestCode(env, b.email);
    }
    case "/auth/verify": {
      const b = await safeJson(request);
      return auth.verifyCode(env, b.email, b.code, b.clientId);
    }
    case "/auth/google": {
      const b = await safeJson(request);
      return auth.googleAuth(env, b.idToken, b.clientId);
    }
    case "/auth/username": {
      const who = await auth.resolvePrincipal(request, env);
      const b = await safeJson(request);
      return auth.setUsername(env, who, b.username);
    }
    case "/billing/checkout": {
      const who = await auth.resolvePrincipal(request, env);
      const b = await safeJson(request);
      return billing.checkout(env, who, b.plan);
    }
    case "/me": {
      const who = await auth.resolvePrincipal(request, env);
      if (!who) return json({ error: "No identity" }, 400);
      const acct = await getOrCreateAccount(env, who.principal);
      let username = null;
      if (who.userId) {
        const u = await env.DB.prepare("SELECT username FROM users WHERE id = ?")
          .bind(who.userId)
          .first();
        username = u?.username || null;
      }
      return json({
        signedIn: !!who.userId,
        email: who.email || null,
        username,
        tier: acct.tier,
        creditsRemaining: acct.credits,
      });
    }
    case "/history/list": {
      const who = await auth.resolvePrincipal(request, env);
      if (!who) return json({ error: "No identity" }, 400);
      return json({ history: await listHistory(env, who.principal) });
    }
    case "/billing/history": {
      const who = await auth.resolvePrincipal(request, env);
      if (!who?.userId) return json({ error: "Sign in" }, 401);
      return billing.history(env, who);
    }
    case "/decks/save": {
      const who = await auth.resolvePrincipal(request, env);
      if (!who) return json({ error: "No identity" }, 400);
      return decks.saveDeck(env, who, await safeJson(request));
    }
    case "/decks/list": {
      const who = await auth.resolvePrincipal(request, env);
      if (!who) return json({ error: "No identity" }, 400);
      return decks.listDecks(env, who);
    }
    case "/decks/get": {
      const who = await auth.resolvePrincipal(request, env);
      if (!who) return json({ error: "No identity" }, 400);
      return decks.getDeck(env, who, (await safeJson(request)).id);
    }
    case "/decks/delete": {
      const who = await auth.resolvePrincipal(request, env);
      if (!who) return json({ error: "No identity" }, 400);
      return decks.deleteDeck(env, who, (await safeJson(request)).id);
    }
    case "/":
    case "/generate":
      return generate(request, env, ctx);
    default:
      return json({ error: "Not found" }, 404);
  }
}

async function generate(request, env, ctx) {
  const who = await auth.resolvePrincipal(request, env);
  if (!who) return json({ error: "Missing identity (X-Client-Id or Authorization)" }, 400);

  // Per-IP throttle: 30 generations/hour, on top of the per-account credit cap.
  const limited = await enforceLimit(env, request, "gen", 30, 60 * 60 * 1000);
  if (limited) return limited;

  const { text, image, url } = await safeJson(request);
  if (text && text.length > MAX_TEXT_CHARS) {
    return json({ error: "Text too long (max ~50k characters)." }, 413);
  }
  if (image?.data && image.data.length > MAX_IMAGE_B64) {
    return json({ error: "Image too large (max ~5 MB)." }, 413);
  }

  // A pasted link is resolved to text server-side (YouTube transcript / page text).
  let inputText = text;
  if (!inputText && !image && url) {
    if (!isValidHttpUrl(url)) return json({ error: "Enter a valid http(s) link." }, 400);
    const src = await fetchSourceText(url);
    if (src.error) return json({ error: src.error }, 422);
    inputText = src.text.slice(0, MAX_TEXT_CHARS); // cap long transcripts
  }
  if (!inputText && !image) return json({ error: "Provide `text`, `image`, or a `url`." }, 400);

  const cost = creditCost({ text: inputText, image });
  const account = await getOrCreateAccount(env, who.principal);
  if (account.credits < cost) {
    return json(
      { error: "Not enough credits", creditsRemaining: account.credits, creditsNeeded: cost },
      402,
    );
  }

  const content = [];
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType || "image/png", data: image.data },
    });
  }
  content.push({
    type: "text",
    text: inputText
      ? `Here is study material (a transcript or notes). Build study notes and a short quiz from it:\n\n${inputText}`
      : "This is a screenshot of something the user is studying. Read it and build study notes and a short quiz from it.",
  });

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  let result;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });
    const raw = response.content.find((b) => b.type === "text")?.text ?? "{}";
    result = JSON.parse(raw);
  } catch (e) {
    logError("generate_failed", e, { principal: who.principal });
    notify(env, ctx, `Generation failed: ${e.message}`);
    return json({ error: e.message || "Generation failed" }, 500);
  }

  result.creditsRemaining = await charge(env, who.principal, cost, MODEL, result.title || null);
  result.creditsUsed = cost;
  logInfo("generate_ok", { signedIn: !!who.userId, model: MODEL, cost });
  return json(result, 200);
}
