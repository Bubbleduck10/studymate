# NoteJet — Resume Tomorrow

Snapshot of where we left off (2026-06-28) and what to do next.

## ✅ Live & working
- **App:** https://notejet.app (Cloudflare Pages project `notejet`; also https://notejet.pages.dev)
- **API:** https://api.notejet.app (Worker `notejet-backend`; backup https://notejet-backend.notejet.workers.dev)
- Accounts (email code), credits (10 free/mo), generate (notes+quiz), decks, rate limiting — all verified in prod
- Chrome extension restyled + pointed at the API (load unpacked from `extension/`)
- Repo: https://github.com/Bubbleduck10/notejet  · code in `C:\Users\angel\studymate`

## Key facts (so we don't re-derive)
- Cloudflare account: `71cd96081bc29e0ba0637915eeb4cd02`, workers.dev subdomain `notejet`
- D1 database name `studymate` (internal; id in `backend/wrangler.toml`)
- Secrets SET on worker: `ANTHROPIC_API_KEY`, `AUTH_SECRET`
- Secrets NOT set yet: `STRIPE_*`, `RESEND_API_KEY`/`EMAIL_FROM`
- Model: `claude-haiku-4-5` (in `backend/src/index.js`)
- ⚠️ Node isn't on PATH — prefix shells with: `export PATH="/c/Program Files/nodejs:$PATH"`

## Redeploy commands (reference)
- **Worker:** `cd backend && npx wrangler deploy`
- **Web (CF Pages):** `cd web && npm run build` then
  `node "../backend/node_modules/wrangler/bin/wrangler.js" pages deploy dist --project-name notejet --branch main`
- **Set a secret:** `cd backend && npx wrangler secret put <NAME>`

---

## 🔜 Tomorrow — in priority order

### 1. Final domain check (5 min)
- [ ] Load https://notejet.app → sign in (code prints in worker logs: `npx wrangler tail`) → generate → save deck
- [ ] Confirm www.notejet.app works (if attached)

### 2. Stripe — turn on payments (highest leverage)
- [ ] Create Stripe account; in **test mode** create products/prices:
  - [ ] Pro subscription → price id → `STRIPE_PRICE_PRO`
  - [ ] 100-credit pack (one-time) → `STRIPE_PRICE_PACK_100`
  - [ ] 300-credit pack (one-time) → `STRIPE_PRICE_PACK_300`
- [ ] `wrangler secret put` for `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PACK_100`, `STRIPE_PRICE_PACK_300`
- [ ] Add Stripe webhook → `https://api.notejet.app/webhook/stripe`; subscribe to
      `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`;
      copy signing secret → `STRIPE_WEBHOOK_SECRET`
- [ ] Test: Upgrade button → Stripe checkout → credits/tier update; test renewal + cancel
- [ ] Go live (swap to live-mode keys) when ready

### 3. Email delivery (Resend) — before real users
- [ ] Resend account; verify sending domain `notejet.app` (DNS records on Cloudflare)
- [ ] `wrangler secret put RESEND_API_KEY`; set `EMAIL_FROM` (e.g. `NoteJet <login@notejet.app>`)
- [ ] Test that login codes arrive by email (not just console)

### 4. Legal (needed for Stripe + app stores)
- [ ] Privacy policy + Terms of Service pages (add routes/links in the web app)
- [ ] Decide data retention (minimize stored transcripts/screenshots)

### 5. Housekeeping (optional)
- [ ] Retire or redirect old GitHub Pages (`bubbleduck10.github.io/notejet`)
- [ ] Re-add CI auto-deploy: either `gh auth refresh -h github.com -s workflow` + restore the Actions workflow, or connect the repo to Cloudflare Pages git integration
- [ ] USPTO trademark check on "NoteJet" (software/education class) before any filing

### 6. Product (v2 features)
- [ ] Mark known/unknown per flashcard → **spaced repetition** (the retention hook)
- [ ] History (past generations) + export (Markdown/Anki/PDF)
- [ ] Server-side transcript fetch so a pasted **video URL** works on web
- [ ] iOS app via Expo (Share Sheet + screenshot OCR) → App Store
- [ ] Publish Chrome extension to the Web Store ($5)

### 7. Analytics
- [ ] Add privacy-friendly analytics (Plausible/PostHog); watch generations + activation + API spend vs revenue
