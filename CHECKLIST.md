# StudyMate — Build Checklist & Roadmap

Living doc. Check items off as we go. Ordered roughly by dependency — earlier
sections unblock later ones. ⭐ = recommended next.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## 0. Done so far
- [x] Backend: Cloudflare Worker, `POST {text|image}` → `{title, notes, quiz}`
- [x] Extension: Chrome MV3 popup (screenshot / YouTube transcript / paste)
- [x] Claude vision + structured outputs wired in
- [x] Cloudflare D1 datastore (`accounts`, `spend_log`)
- [x] Per-install client id sent with each request
- [x] Credits: balance per id, charge per generation (model-weighted), refuse at 0
- [x] Free tier: 15 credits/mo, lazy monthly reset; remaining shown in popup badge

---

## 1. Backend hardening ⭐ (foundation for everything paid)
- [x] Move datastore in: **Cloudflare D1** (SQLite) for users/credits + rate-limit counters
- [x] Per-IP rate limit: 30 generations/hr + 5 login-code requests/15min (fixed-window in D1)
- [x] Request size cap (text ≤ ~50k chars, image ≤ ~5MB) → 413 with clear error JSON
- [x] Input validation & safe error messages (central try/catch returns generic 500, no leaks)
- [x] Structured logging (JSON lines) + optional error alert webhook (`ALERT_WEBHOOK_URL`)
- [x] CORS: lockable via `ALLOWED_ORIGINS` (defaults to `*` for dev; set origins in prod)

## 2. Accounts & auth
- [x] Auth approach: **email one-time code** built into the Worker (works on extension/web/iOS alike)
- [x] Sign in via email code (dev: code prints to console; prod: Resend) — _Google OAuth optional later_
- [x] Worker issues an HMAC-signed session token; clients send `Authorization: Bearer`
- [x] Worker verifies token → resolves a user (`user:<id>`) before generating
- [x] Anonymous (`anon:<clientId>`) credits merge into the account on first sign-in
- [x] `users` + `login_codes` tables; `/me` endpoint for account state
- [ ] Email deliverability (verify a sending domain in Resend before launch)

## 3. Credits system
- [x] Decide the unit: **1 generation = 1 credit** (Haiku); **Pro-quality = 3 credits** (Opus/Sonnet)
- [x] `credits` balance per id in D1; decrement atomically on each successful generate
- [x] Refuse + friendly "out of credits" response at 0 (don't call Claude)
- [x] Monthly free-tier reset (lazy reset on first request each month — no cron needed)
- [x] Show remaining credits in the UI (header badge)
- [x] Log every spend (`spend_log` — audit + usage history later)
- [ ] Re-key credits from install-id → real user id once accounts land (§2)

## 4. Pricing tiers & payments
- [x] **Stripe Checkout** code: `/billing/checkout {plan}` → Checkout Session URL (Pro / credit packs)
- [x] **Webhook** `/webhook/stripe` (signature-verified) → grant credits / set tier in D1
- [x] Renewal top-ups (`invoice.paid` cycle) + downgrade on `customer.subscription.deleted`
- [x] Plan catalog (Pro = 500 cr/mo + tier; packs = 100 / 300 cr); `stripe_customer_id` stored
- [x] Upgrade button in the extension → opens Checkout
- [ ] Create the actual Stripe products/prices + webhook in the dashboard, fill env vars
- [ ] Manage-subscription portal link (Stripe Billing portal — cancel/upgrade, no UI to build)
- [ ] ⚠️ Sell subscriptions on **web** (Stripe), honor on all platforms — avoids Apple/Google's 15–30% IAP cut
- [ ] Finalize prices (tune against real API cost — Haiku makes a generation cost well under 1¢):
  - **Free** — ~15 credits/mo, Haiku only, no saved decks
  - **Pro ~$6.99/mo or $49/yr** — ~500 credits/mo, Pro-quality option, saved decks, spaced repetition, export
  - **Credit packs (one-time)** — e.g. 100 / $4.99, 300 / $9.99 for non-subscribers
- [ ] Gate Pro-only features by tier in the backend (source of truth — never trust the client)

## 5. UI / design
- [ ] Name + logo + color palette + type (currently placeholder "StudyMate", indigo accent)
- [ ] Design the extension popup properly (states: empty, loading, result, error, out-of-credits)
- [ ] Loading/skeleton states + nicer error toasts
- [ ] Result view polish: collapsible notes, quiz cards, "reveal answer", copy/export buttons
- [ ] Onboarding (first-run: 2-line "how it works")
- [ ] Settings panel (model quality toggle, account, credits, sign out)
- [ ] Accessibility pass (contrast, keyboard, focus)
- [ ] Dark mode

## 6. Core features (beyond v1)
- [x] Save results as **decks** (titled collections of notes + quiz; `decks` table, Decks tab)
- [x] **Flashcard / study mode** (step through quiz cards, flip to reveal)
- [ ] Mark known/unknown per card (groundwork for spaced repetition)
- [ ] **Spaced repetition** (resurface due cards — the real retention hook)
- [ ] History (past generations, searchable)
- [ ] Export (Markdown / Anki / PDF)
- [ ] Difficulty / length controls (quiz size, note depth)
- [ ] Better source capture: paste a URL → fetch transcript server-side (YouTube etc.)
- [ ] Multiple question types (MCQ, fill-in-blank, not just Q/A)

## 7. Web app
- [x] Scaffold (Vite + React) reusing the same backend (`web/`)
- [x] Flow: upload / drag / paste a screenshot, or paste text → notes + quiz
- [x] Account (email code) + credits badge + Upgrade (in-page Stripe redirect) + decks + flashcards
- [x] Stripe success/cancel redirect handled via `?checkout=` banner
- [x] Deployed to GitHub Pages → https://bubbleduck10.github.io/studymate/ (built locally → `gh-pages` branch)
- [ ] Deploy the **backend Worker** + set web `VITE_BACKEND_URL` to it + Worker `ALLOWED_ORIGINS` to the Pages origin (until then the live UI loads but sign-in/generate/decks won't work)
- [ ] Re-add the Actions auto-deploy workflow (removed — token lacked `workflow` scope); for now redeploy with `cd web && npm run build && npx gh-pages -d dist`
- [ ] Server-side transcript fetch so a pasted video URL works on web (no DOM scrape here) — v2

## 8. iOS app (App Store)
- [ ] Expo project reusing the shared core/logic
- [ ] Share Sheet target (share a YouTube link / image into StudyMate)
- [ ] Screenshot → on-device OCR (Apple Vision) or send image to backend vision
- [ ] Sign-in + restore web subscription entitlement
- [ ] App Store assets (icon, screenshots, description) + review submission
- [ ] Apple Developer Program enrollment ($99/yr)

## 9. Launch & legal
- [ ] Privacy policy + Terms of Service (required by stores; you handle user data)
- [ ] Decide data retention (store transcripts? screenshots? — minimize)
- [ ] Chrome Web Store listing + $5 dev registration
- [ ] Google Play (if Android) — $25 once
- [ ] Landing page (what it is, pricing, sign up)

## 10. Analytics & ops
- [ ] Privacy-friendly analytics (PostHog / Plausible) — track activation & generation counts
- [ ] Monitor Claude API spend vs. revenue (margin dashboard)
- [ ] Feedback channel (in-app "report" / email)

---

## Suggested sequence
1. **§1 Backend hardening** → 2. **§2 Accounts** → 3. **§3 Credits** → 4. **§4 Payments**
   (this chain is what turns it into a real product you can charge for)
2. In parallel: **§5 UI polish** + **§6 first real feature (saved decks)**
3. Then **§7 Web app**, then **§8 iOS**, then **§9 launch**.
