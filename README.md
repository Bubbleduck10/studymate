# NoteJet (v1)

An AI study helper. Feed it a **screenshot** or a **transcript/notes**, and it returns
concise study notes plus a quick quiz. v1 ships as a Chrome/Edge extension backed by a
tiny Cloudflare Worker that holds your Claude API key.

```
extension/  → Chrome MV3 extension (the UI + capture)
backend/    → Cloudflare Worker: POST {text|image} → {title, notes, quiz}
web/        → Vite + React web app (same backend; the payment surface)
```

The browser never sees the API key — it talks only to your Worker, which talks to Claude.

---

## 1. Run the backend

Prereqs: Node.js, and a Claude API key from https://console.anthropic.com

```bash
cd backend
npm install
npm install --save @anthropic-ai/sdk@latest   # pull the current SDK
cp .dev.vars.example .dev.vars                 # then paste your real key into .dev.vars
```

(`cp` in PowerShell: `Copy-Item .dev.vars.example .dev.vars`)

Create the credits database (once), paste the printed `database_id` into `wrangler.toml`,
then apply the schema:

```bash
npx wrangler d1 create studymate              # copy database_id → wrangler.toml
npx wrangler d1 execute studymate --file=./schema.sql            # local dev DB
# (when deployed:  npx wrangler d1 execute studymate --remote --file=./schema.sql)
npm run dev                                     # serves http://localhost:8787
```

Quick test it works (note the client-id header — credits are tracked per id):

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" -H "X-Client-Id: test-1" \
  -d "{\"text\":\"Photosynthesis converts light, water, and CO2 into glucose and oxygen.\"}"
```

The response includes `creditsRemaining`. New ids start with 10 free credits/month
(1 credit per Haiku generation; auto-resets each calendar month).

You should get back JSON with `notes` and `quiz`.

### Deploy it (when ready)

```bash
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # paste your key
npx wrangler secret put AUTH_SECRET         # any long random string
npm run deploy
npx wrangler d1 execute studymate --remote --file=./schema.sql   # apply schema to prod DB
```

Wrangler prints a URL like `https://notejet-backend.<you>.workers.dev`.
Add the Stripe + email secrets the same way (`wrangler secret put STRIPE_SECRET_KEY`, etc.) when you wire up billing — see below.

---

## Accounts & billing

**Accounts** use email one-time codes (no passwords). Set `AUTH_SECRET` (any long random
string) in `.dev.vars`. In dev, the login code is **printed to the wrangler console** — set
`RESEND_API_KEY` + `EMAIL_FROM` to actually email it. Flow: enter email → "Sign in" →
read the code → "Verify". Anonymous credits merge into your account on first sign-in.

Endpoints: `POST /auth/request {email}`, `POST /auth/verify {email, code, clientId}`,
`POST /me`, `POST /billing/checkout {plan}`, `POST /webhook/stripe`,
`POST /decks/save|list|get|delete`.

**Saved decks:** results can be saved as decks (Decks tab in the popup) with a
flashcard study mode. Free plan saves up to 5 decks; Pro is unlimited. Anonymous
decks merge into your account on sign-in.

**Migrations:** a fresh DB just needs `schema.sql`. If you created the DB at an
earlier step, apply the catch-up files in order: `migrate-v2.sql` (accounts/Stripe),
`migrate-v3.sql` (rate limits), `migrate-v4.sql` (decks).

**Hardening:** per-IP rate limits, request size caps, and lockable CORS
(`ALLOWED_ORIGINS`) are built in; set `ALERT_WEBHOOK_URL` to get pinged on errors.

**Billing** uses Stripe Checkout. To enable it:

1. In the Stripe dashboard (test mode), create products/prices:
   - **Pro** — recurring price → `STRIPE_PRICE_PRO` (grants 500 credits/mo, tier `pro`)
   - **100 credits** — one-time price → `STRIPE_PRICE_PACK_100`
   - **300 credits** — one-time price → `STRIPE_PRICE_PACK_300`
2. Put those + `STRIPE_SECRET_KEY` and `APP_URL` in `.dev.vars` (or `wrangler secret put` for prod).
3. Add a webhook endpoint in Stripe → `https://<your-worker>/webhook/stripe`, subscribe to
   `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`, and copy its
   signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Test locally with the Stripe CLI: `stripe listen --forward-to localhost:8787/webhook/stripe`.

Credits/tier are granted by the **webhook**, never the client — so they can't be faked.

---

## 2. Load the extension

1. Put your backend URL in `extension/popup.js` → `BACKEND_URL` (default is localhost).
2. Open `chrome://extensions`, turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder.
4. Pin NoteJet and click it on any page.

**Try it:**
- **Screenshot tab** — captures the visible page and reads it (works anywhere).
- **YouTube transcript** — on a video, open *Show transcript* first, then click this.
- **Paste** — drop any transcript or notes into the box and Generate.

---

## 3. Run the web app

Same backend, browser-native. "Screenshot the tab" becomes upload / drag / paste an image.

```bash
cd web
npm install
cp .env.example .env          # set VITE_BACKEND_URL (defaults to localhost:8787)
npm run dev                    # http://localhost:5173
```

(`cp` in PowerShell: `Copy-Item .env.example .env`)

For Stripe redirects to land back on the web app, set the backend's `APP_URL` to the web
origin (e.g. `http://localhost:5173` in dev, your real domain in prod). Sign-in, credits,
decks, and Upgrade all work against the same Worker.

**Deploy:** `npm run build` → static `dist/`. Host on Cloudflare Pages or GitHub Pages.
In prod, set the backend's `ALLOWED_ORIGINS` to include the web app's origin.

---

## Config

- **Model:** `backend/src/index.js` → `MODEL`. Defaults to `claude-haiku-4-5` (cheap/fast).
  Swap to `claude-opus-4-8` for higher quality, or `claude-sonnet-4-6` for a middle ground.
- **Cost:** every Generate is one Claude API call. Add a usage cap / accounts before real users.

## What's next (v2+)

- Saved decks + spaced repetition
- Accounts and a free-tier limit (before sharing widely)
- Web app (reuse the same backend + UI)
- iOS app via Expo: Share Sheet + screenshot OCR, same "paste link or screenshot" flow
