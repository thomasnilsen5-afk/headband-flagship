# HYAL — flagship store

> **HYAL is a working name.** Change it in `src/lib/brand.ts` and `src/messages/*.json`.
> Everything marked **PLACEHOLDER** in the code must be replaced before launch (list at the bottom).

A headband store built to feel like an artifact from somewhere else. Next.js (App Router) on Vercel,
Supabase for data, auth, storage and realtime, Stripe and Vipps MobilePay for payments.

---

## 1. Plan

### Architecture

```
Browser ──► Vercel Edge (proxy.ts: i18n, session refresh on /konto /kasse /admin)
              │
              ├─ Static / ISR pages (home, catalog, product)  ← cookie-less Supabase client, RLS: published only
              ├─ Server Actions / Route Handlers (cart, checkout, account, admin) ← auth-aware client
              └─ Webhooks (/api/webhooks/stripe|vipps) ← signature verified → service role → SQL functions
                                          │
Supabase Postgres ── RLS on every table ── SQL functions own every money-moving write:
  place_order (atomic stock reservation) · mark_order_paid (idempotent) · release_order
  claim_webhook_event (idempotency ledger) · pg_cron releases expired reservations every minute
Supabase Realtime ── inventory table → live stock on product pages
Supabase Storage ── product-media (public) · review-media (owner folders, visible once published)
```

**Key decisions**

| Decision                                                                                | Why                                                                                                      |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Money is integer øre everywhere; catalog prices are gross (incl. 25 % MVA)              | Norwegian retail shows gross prices; no float rounding bugs                                              |
| Pricing is a pure TS function (`src/lib/commerce/pricing.ts`), re-validated in SQL      | Exhaustively unit-testable, and a bug upstream can never sell below list price                           |
| Stock is reserved by a single conditional `UPDATE … WHERE on_hand - reserved >= qty`    | Two buyers of the last unit serialise on the row lock; no oversell, no app-level locks                   |
| Webhooks are idempotent by `(provider, event_id)` + `mark_order_paid` returns true once | Providers retry; emails and stock commits happen exactly once                                            |
| International orders are zero-rated exports; Svalbard is outside the MVA area           | Correct VAT treatment from day one (merverdiavgiftsloven § 6-21)                                         |
| Klarna through Stripe, not a separate integration                                       | One integration, one webhook, same payout; Vipps MobilePay integrated directly (Norway essential)        |
| Public pages are static/ISR; only /konto, /kasse and /admin touch cookies               | Edge-cached commerce pages keep the 95+ mobile Lighthouse budget despite the 3D                          |
| No external CMS: content blocks live in Postgres and are edited in our admin            | One source of truth, one login for the team; Sanity would add a second system without new capability     |
| Postgres full-text (Norwegian + English) + trigram fallback for search                  | Six to sixty products don't need Algolia or embeddings; pgvector can be added without new infrastructure |

**Additions beyond the required stack (one line each)**

- **Sentry**: error monitoring with source maps; client is errors-only to protect performance.
- **Vercel Analytics + Speed Insights**: cookieless, so no consent banner needed for basic analytics; real-user Web Vitals.
- **Upstash Redis** (phase 4): rate limiting for checkout, waitlist, login and review endpoints.
- **pg_cron** (built into Supabase): releases abandoned stock reservations every minute.

### Data model (public schema, all tables RLS-protected)

- **Catalog:** `collections`, `products` (i18n jsonb, gross price, VAT rate, procedural `form` params for 3D, FTS vector), `product_variants` (SKU, colour, size), `product_media`, `bundles` + `bundle_items`, `drops`
- **Inventory:** `inventory` (on_hand, reserved, generated `available`; Realtime), `inventory_reservations`, `inventory_movements` (ledger written by trigger)
- **Commerce:** `carts` + `cart_items` (anonymous carts via hashed cookie token), `discounts` + `discount_redemptions`, `shipping_rates`, `orders` + `order_items` (immutable snapshots), `payments`, `webhook_events`
- **Customers:** `profiles` (role: customer/staff/admin), `addresses`, `wishlist_items`, `waitlist_entries` (drops and back-in-stock), `returns`, `reviews` + `review_media`
- **Ops:** `content_blocks`, `store_settings`, `email_log` (one email per kind+ref), `audit_log`

### Design system: "Not from here"

- **Palette:** blue-black void layers (`void`, `abyss`, `strata`), warm `bone` ink, two unnatural accents: **ichor** (oklch 0.88 0.17 170, a cyan outside sRGB on P3 screens) and **ultraviolet** (oklch 0.68 0.26 300). Gold only exists inside thin-film gradients.
- **Type:** **Anybody** (variable width 50–150 and weight) at width 150 and weight 220 for display, tight tracking, plus **Azeret Mono** for prices, specs and labels. Self-hosted, no layout shift.
- **Motion:** custom easings `fluid`, `tide`, `drift`. Nothing bounces. Lenis + GSAP ScrollTrigger on one ticker. View Transitions between pages (old page sinks into the void, new page surfaces). Everything collapses gracefully under `prefers-reduced-motion`.
- **Signature objects:** the WebGL band (liquid chrome + thin-film interference shader), its CSS twin (`.band-css`) used as poster, fallback and reduced-motion state, film grain, a cursor halo that trails rather than replaces the cursor, an optional ambient layer synthesised live with WebAudio (off by default).

### Phases

1. **Foundation:** repo, CI, Supabase schema + RLS + SQL commerce functions + seed, design system, i18n, security headers ✅
2. **Hero + landing:** real-time WebGL band, scroll choreography, screenshot moments ✅
3. **Catalog + product pages:** 3D viewer, variants, live stock, bundles, drops with countdown + waitlist
4. **Cart + checkout + payments:** Stripe (cards, Apple/Google Pay, Klarna), Vipps MobilePay, Bring/Posten shipping, rate limiting, strict CSP
5. **Accounts + emails + admin:** Supabase Auth, order history, addresses, returns, wishlist, Resend + React Email flows, role-based admin
6. **Polish:** performance, WCAG 2.2 AA audit, SEO (JSON-LD, sitemap, OG per product), consent, security review
7. **Launch checklist**

### Assumptions

- NOK is the only settlement currency at launch; international customers pay NOK, shipped DAP (they may pay import VAT/duty on delivery). IOSS registration for the EU can be added later.
- 30-day returns as a brand promise; the statutory 14-day angrerett is the enforced minimum (`store_settings.return_window_days` can never go below 14).
- Dark mode only (light mode is optional in the brief). Forced-colors mode is supported.

---

## 2. Setup

```bash
pnpm install
cp .env.example .env.local     # fill in NEXT_PUBLIC_SUPABASE_URL + publishable key at minimum
pnpm dev                       # http://localhost:3000
```

| Command                                        | What                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`       | Next.js                                                                                        |
| `pnpm typecheck` · `pnpm lint` · `pnpm format` | Quality                                                                                        |
| `pnpm test`                                    | Unit tests (pricing, VAT, stock, shipping)                                                     |
| `pnpm e2e`                                     | Playwright (desktop, mobile, reduced-motion). Set `PW_CHROMIUM_PATH` to reuse a local Chromium |
| `pnpm lhci`                                    | Lighthouse CI with enforced budgets (after `pnpm build`)                                       |
| `pnpm db:types`                                | Regenerate `src/lib/supabase/database.types.ts` (needs `SUPABASE_PROJECT_REF`)                 |
| `supabase start && supabase db reset`          | Local Postgres with migrations + seed (Docker)                                                 |

### Environment variables

See `.env.example`. Public variables are validated at startup (`src/lib/env.ts`); server secrets are
read lazily (`src/lib/env.server.ts`) so a preview without payment keys still builds, and the
feature fails loudly when it is used.

| Variable                                                                  | Where                                             | Required from |
| ------------------------------------------------------------------------- | ------------------------------------------------- | ------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`        | all envs                                          | phase 1       |
| `NEXT_PUBLIC_SITE_URL`                                                    | production (previews derive it from `VERCEL_URL`) | phase 1       |
| `SUPABASE_SECRET_KEY`                                                     | server, all envs                                  | phase 3       |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                              | server                                            | phase 4       |
| `VIPPS_*`                                                                 | server                                            | phase 4       |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CART_TOKEN_PEPPER` | server                                            | phase 4       |
| `BRING_*`                                                                 | server                                            | phase 4       |
| `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`                             | server                                            | phase 5       |
| `SENTRY_*`, `NEXT_PUBLIC_SENTRY_DSN`                                      | all envs                                          | phase 6       |

GitHub Actions needs repository **variables** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_PROJECT_REF` and **secrets** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` (production environment).

---

## 3. Repository layout

```
src/
  app/[locale]/        routes (nb at /, en at /en), localised pathnames in src/i18n/routing.ts
  components/shell/    header, footer, cursor halo, smooth scroll, page transitions, sound
  lib/commerce/        pure money, VAT, pricing, shipping, stock logic (100 % unit tested)
  lib/supabase/        public (cacheable), server (auth-aware), admin (service role), browser clients
  lib/security/        CSP and security headers
  messages/            nb.json, en.json
  proxy.ts             i18n routing + Supabase session refresh for auth areas
supabase/
  migrations/          schema, RLS, SQL commerce functions, storage, realtime, cron
  seed.sql             PLACEHOLDER catalog: 6 products, 27 variants, drop, bundles, shipping, codes
tests/unit · tests/e2e
.github/workflows/     ci.yml, pr-title.yml (conventional commits), db-deploy.yml
```

---

## 4. Runbook

**Deploys.** Every PR gets a Vercel preview (noindex). `main` deploys to production. Database
migrations deploy from `main` via `db-deploy.yml` (Supabase CLI), never by hand in production.

**Workflow.** Trunk-based: short-lived branches, one PR per feature, conventional-commit PR titles
(`feat:`, `fix:`, `chore:` …), squash merge. CI must be green: typecheck, lint, format, unit tests
with coverage thresholds on commerce logic, migrations applied to a fresh Postgres with an RLS check,
build, Playwright, Lighthouse budgets.

**New table checklist.** `enable row level security` + policies in the same migration; foreign keys
indexed; money as integer øre; run `get_advisors` (security + performance) after applying.

**A payment succeeded but the order is still pending.** Look up the event in `webhook_events`
(`last_error`, `attempts`). Replays are safe: `mark_order_paid` is idempotent. If the reservation
expired first, the order is re-reserved when stock allows, otherwise it is flagged in `orders.notes`
with "refund required".

**Stock looks wrong.** `inventory_movements` is the ledger (every on_hand change with reason, ref and
actor). `reserved` should equal the sum of `inventory_reservations` with status `active`.

**Rotate a secret.** Update it in Vercel (and GitHub if used by CI), redeploy. Supabase keys rotate
independently (publishable/secret keys).

**Performance budget.** Lighthouse runs twice in CI. `ci.yml` measures the local production
build (`next start`: HTTP/1.1 + gzip, which Lighthouse's simulation penalises) as a regression
guard: performance ≥ 90, accessibility/best practices/SEO ≥ 95. `lighthouse-preview.yml` measures
the real Vercel preview (HTTP/2 + Brotli + edge) and enforces performance ≥ 95 and LCP ≤ 2.5 s on
mobile. It needs the repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Project →
Settings → Deployment Protection → Protection Bypass for Automation).

How the hero stays fast: the headline is plain HTML/CSS and is the LCP element; the CSS band
paints instantly; three.js (~250 KB gz) loads only on capable devices, after first interaction or
browser idle (touch devices wait for a touch or scroll), and crossfades in. Sentry's browser SDK
loads after `load`. CSS is inlined. Fonts are subset variable fonts (49 KB + 21 KB).

**Accepted advisor findings.** `request_return` is SECURITY DEFINER on purpose (it is the only door
into `returns` and enforces ownership + the return window). Catalog tables keep a staff "for all"
write policy next to the public read policy; the cost is one cached `is_staff()` call per statement.

---

## 5. What you must provide

| Item                                                                        | Where it goes                                                     |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Brand name, wordmark (SVG), org.nr., address, support email                 | `src/lib/brand.ts`, `src/components/shell/Wordmark.tsx`, messages |
| Real products: names, copy, materials, prices, sizes, colours, stock        | Admin panel (phase 5) or `supabase/seed.sql`                      |
| Product photography / 3D scans (optional: the 3D is procedural)             | Supabase Storage `product-media`                                  |
| Stripe account (Norway) with Klarna enabled; Vipps MobilePay merchant (MSN) | Vercel env                                                        |
| Bring API user + customer number                                            | Vercel env                                                        |
| Resend account + verified sending domain                                    | Vercel env                                                        |
| Final legal texts reviewed by counsel (terms, privacy, angrerett)           | phase 6 pages                                                     |
