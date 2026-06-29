import { useState } from "react";
import { api } from "./api.js";

const PRO_PERIODS = {
  monthly: {
    plan: "pro_monthly",
    price: "$6.99",
    cadence: "/ month",
    credits: "500 credits / month",
    note: null,
  },
  sixmo: {
    plan: "pro_6mo",
    price: "$40.99",
    cadence: "/ 6 months",
    credits: "3,500 credits up front",
    note: "≈ $6.83/mo · includes +500 bonus credits",
  },
  annual: {
    plan: "pro_annual",
    price: "$79.99",
    cadence: "/ year",
    credits: "7,500 credits up front",
    note: "Save 5% · ≈ $6.67/mo · includes +1,500 bonus credits",
  },
};

const PRO_FEATURES = [
  "Higher-quality model option",
  "Unlimited saved decks",
  "Priority everything",
  "Cancel anytime",
];

export default function Pricing({ account, onSignIn }) {
  const [period, setPeriod] = useState("annual");
  const pro = PRO_PERIODS[period];

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

      <div className="billing-toggle reveal">
        <button className={period === "monthly" ? "active" : ""} onClick={() => setPeriod("monthly")}>
          Monthly
        </button>
        <button className={period === "sixmo" ? "active" : ""} onClick={() => setPeriod("sixmo")}>
          6 months
        </button>
        <button className={period === "annual" ? "active" : ""} onClick={() => setPeriod("annual")}>
          Annual <span className="save">–5%</span>
        </button>
      </div>

      <div className="tiers">
        {/* Free */}
        <div className="tier reveal" style={{ animationDelay: "0.1s" }}>
          <h3 className="tier-name">Free</h3>
          <div className="tier-price">
            <span className="tier-amount">$0</span> <span className="tier-cadence">forever</span>
          </div>
          <ul className="tier-feats">
            <li>10 credits / month</li>
            <li>Notes + quizzes</li>
            <li>Save up to 5 decks</li>
            <li>Flashcard study mode</li>
          </ul>
          <button className="btn ghost full" disabled>
            Current plan
          </button>
        </div>

        {/* Pro */}
        <div className="tier featured reveal" style={{ animationDelay: "0.18s" }}>
          <div className="tier-tag">Most popular</div>
          <h3 className="tier-name">Pro</h3>
          <div className="tier-price">
            <span className="tier-amount">{pro.price}</span>{" "}
            <span className="tier-cadence">{pro.cadence}</span>
          </div>
          {pro.note && <div className="tier-note">{pro.note}</div>}
          <ul className="tier-feats">
            <li>{pro.credits}</li>
            {PRO_FEATURES.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <button className="btn primary full" onClick={() => buy(pro.plan)}>
            Go Pro
          </button>
        </div>

        {/* Credit packs */}
        <div className="tier reveal" style={{ animationDelay: "0.26s" }}>
          <h3 className="tier-name">Credit packs</h3>
          <div className="tier-price">
            <span className="tier-amount">from $4.99</span>{" "}
            <span className="tier-cadence">one-time</span>
          </div>
          <ul className="tier-feats">
            <li>100 credits — $4.99</li>
            <li>300 credits — $9.99</li>
            <li>Never expire</li>
            <li>No subscription</li>
          </ul>
          <div className="pack-buttons">
            <button className="btn ghost full" onClick={() => buy("pack_100")}>
              Buy 100
            </button>
            <button className="btn ghost full" onClick={() => buy("pack_300")}>
              Buy 300
            </button>
          </div>
        </div>
      </div>

      <div className="credits-note reveal">
        <h3>How credits work</h3>
        <p>
          Each generation uses credits based on length — a screenshot or short note is
          <strong> 1 credit</strong>, a medium video or long article is <strong>2</strong>,
          and a long video or large document is <strong>3</strong>. Saving and studying
          decks is always free.
        </p>
      </div>

      <p className="fine center">
        Prices are early estimates and may change. Billed securely via Stripe.
      </p>
    </div>
  );
}
