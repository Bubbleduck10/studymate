import { api } from "./api.js";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    plan: null,
    highlight: false,
    cta: "Current plan",
    features: ["15 credits / month", "Notes + quizzes", "Save up to 5 decks", "Flashcard study mode"],
  },
  {
    name: "Pro",
    price: "$6.99",
    cadence: "/ month",
    plan: "pro",
    highlight: true,
    cta: "Go Pro",
    features: ["500 credits / month", "Higher-quality model option", "Unlimited saved decks", "Priority everything", "Cancel anytime"],
  },
  {
    name: "Credit packs",
    price: "from $4.99",
    cadence: "one-time",
    plan: "pack_100",
    highlight: false,
    cta: "Buy credits",
    features: ["100 credits — $4.99", "300 credits — $9.99", "Never expire", "No subscription"],
  },
];

export default function Pricing({ account, onSignIn }) {
  async function buy(plan) {
    if (!plan) return;
    if (!account.signedIn) return onSignIn();
    const { ok, data } = await api.checkout(plan);
    if (ok && data.url) window.location.href = data.url;
    else alert(data.error || "Checkout failed");
  }

  return (
    <div className="container narrow">
      <h1 className="section-title reveal">Simple pricing</h1>
      <p className="section-sub reveal" style={{ animationDelay: "0.05s" }}>
        Start free. Upgrade when you're studying for real.
      </p>

      <div className="tiers">
        {TIERS.map((t, i) => (
          <div
            className={"tier reveal" + (t.highlight ? " featured" : "")}
            style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            key={t.name}
          >
            {t.highlight && <div className="tier-tag">Most popular</div>}
            <h3 className="tier-name">{t.name}</h3>
            <div className="tier-price">
              <span className="tier-amount">{t.price}</span>{" "}
              <span className="tier-cadence">{t.cadence}</span>
            </div>
            <ul className="tier-feats">
              {t.features.map((f, j) => (
                <li key={j}>{f}</li>
              ))}
            </ul>
            <button
              className={"btn " + (t.highlight ? "primary" : "ghost") + " full"}
              disabled={!t.plan}
              onClick={() => buy(t.plan)}
            >
              {t.cta}
            </button>
          </div>
        ))}
      </div>

      <p className="fine center">
        Prices are early estimates and may change. Subscriptions are billed securely via Stripe.
      </p>
    </div>
  );
}
