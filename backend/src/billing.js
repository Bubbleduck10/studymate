// Stripe Checkout + webhook, called via fetch (no SDK needed on Workers).
import { json, hmacHex, timingSafeEqual } from "./util.js";
import { addCredits, setTier } from "./credits.js";

// Plan catalog: maps a plan key → Stripe price id (from env) + what it grants.
function plans(env) {
  return {
    pro: { price: env.STRIPE_PRICE_PRO, mode: "subscription", credits: 500, tier: "pro" },
    pack_100: { price: env.STRIPE_PRICE_PACK_100, mode: "payment", credits: 100 },
    pack_300: { price: env.STRIPE_PRICE_PACK_300, mode: "payment", credits: 300 },
  };
}

function encodeForm(obj, prefix) {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") {
      const nested = encodeForm(v, key);
      if (nested) parts.push(nested);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.join("&");
}

async function stripe(env, method, path, params) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  };
  if (params) {
    opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
    opts.body = encodeForm(params);
  }
  const res = await fetch(`https://api.stripe.com/v1/${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe error");
  return data;
}

export async function checkout(env, auth, planKey) {
  if (!auth?.userId) return json({ error: "Sign in to upgrade" }, 401);
  const plan = plans(env)[planKey];
  if (!plan || !plan.price) return json({ error: "Unknown or unconfigured plan" }, 400);

  const appUrl = env.APP_URL || "https://example.com";
  const params = {
    mode: plan.mode,
    "line_items[0][price]": plan.price,
    "line_items[0][quantity]": 1,
    success_url: `${appUrl}/?checkout=success`,
    cancel_url: `${appUrl}/?checkout=cancel`,
    client_reference_id: auth.userId,
    customer_email: auth.email,
    metadata: { userId: auth.userId, plan: planKey },
  };
  if (plan.mode === "subscription") {
    // Stamp metadata on the subscription too, so renewals can be attributed.
    params["subscription_data[metadata][userId]"] = auth.userId;
    params["subscription_data[metadata][plan]"] = planKey;
  }

  try {
    const session = await stripe(env, "POST", "checkout/sessions", params);
    return json({ url: session.url });
  } catch (e) {
    return json({ error: e.message || "Checkout failed" }, 500);
  }
}

export async function webhook(env, request) {
  const sig = request.headers.get("Stripe-Signature") || "";
  const payload = await request.text();
  if (!(await verifyStripeSig(env.STRIPE_WEBHOOK_SECRET, payload, sig))) {
    return new Response("bad signature", { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("bad payload", { status: 400 });
  }

  try {
    await handleEvent(env, event);
  } catch (e) {
    // 500 makes Stripe retry — good for transient failures.
    return new Response("handler error: " + (e.message || ""), { status: 500 });
  }
  return new Response("ok", { status: 200 });
}

async function verifyStripeSig(secret, payload, header) {
  if (!secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i), kv.slice(i + 1)];
    }),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // Reject deliveries older than 5 minutes (replay protection).
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = await hmacHex(secret, `${t}.${payload}`);
  return timingSafeEqual(expected, v1);
}

async function handleEvent(env, event) {
  const catalog = plans(env);

  if (event.type === "checkout.session.completed") {
    // Initial grant for both subscriptions and one-time packs.
    const s = event.data.object;
    const userId = s.metadata?.userId || s.client_reference_id;
    const planKey = s.metadata?.plan;
    const plan = catalog[planKey];
    if (!userId || !plan) return;

    const principal = `user:${userId}`;
    if (plan.tier) await setTier(env, principal, plan.tier);
    await addCredits(env, principal, plan.credits);
    if (s.customer) {
      await env.DB.prepare("UPDATE accounts SET stripe_customer_id = ? WHERE id = ?")
        .bind(s.customer, principal)
        .run();
    }
    return;
  }

  if (event.type === "invoice.paid") {
    // Recurring renewal top-up. Skip the first invoice (checkout already granted it).
    const inv = event.data.object;
    if (inv.billing_reason !== "subscription_cycle") return;
    if (!inv.subscription) return;

    const sub = await stripe(env, "GET", `subscriptions/${inv.subscription}`);
    const userId = sub.metadata?.userId;
    const planKey = sub.metadata?.plan;
    const plan = catalog[planKey];
    if (!userId || !plan) return;

    await addCredits(env, `user:${userId}`, plan.credits);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const userId = sub.metadata?.userId;
    if (userId) await setTier(env, `user:${userId}`, "free");
    return;
  }
}
