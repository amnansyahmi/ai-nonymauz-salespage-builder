# Nonymauz Salespage Builder

A salespage builder for Malaysian small businesses. Sellers pick a template, edit words, photos and prices, and publish to a live link. Buyers order through a checkout that records the order and opens WhatsApp with everything filled in.

**Stack:** Next.js 15 (App Router, React 19, TypeScript) · Supabase (login, Postgres, photo storage) · Vercel.

## What it does

- **Templates with their own layout styles**, art-directed with [taste-skill](https://github.com/Leonxlnx/taste-skill): Label (food), Chapters (ebook/class), Shape (services), Stage (one product), plus Classic.
- **Editor:** drag sections from the library, click any section to edit it in a form, undo/redo, autosave, computer and phone canvas, bottom sheets on phones.
- **Preview** renders the exact page buyers will get.
- **One-click publish** to `https://<your-domain>/<link>`, rendered on the server for fast loading, Google and WhatsApp link previews.
- **Checkout:** packages, delivery options, free-delivery threshold, live total. Each order is saved to the seller's **Orders** page, then WhatsApp opens with the message.
- **Accounts:** email login link or Google. Each seller only ever sees their own pages and orders (row-level security).
- Facebook Pixel (PageView + Lead) and share titles/descriptions per page.

The seller studio adds a guided setup with your own business details, a navigable section outline with hide/show controls, collapsible settings, reusable brand colours and photos, image composition/crop controls, compact spacing, and a launch checklist. Local IndexedDB recovery keeps recent draft versions and deduplicates photos. Backup restore offers copy, replace, and skip modes.

Publishing is atomic and retains a stable public address. Taking a page offline keeps recorded enquiries. You can roll the live page back to a recent release without overwriting your draft. Checkout validates prices against the published catalog in Postgres, supports pickup, variants, and preferred appointments, and deduplicates retries. Activity counts show visits and CTA/WhatsApp clicks; these are approximate counters, not confirmed messages, payments, or unique buyers.

Without Supabase keys the app runs in **demo mode**: pages are saved in the browser, publishing is off. Useful for local work.

## Set up (one time, about 10 minutes)

1. **Create a Supabase project** at supabase.com (free tier is fine).
2. **Create the tables:** Supabase → SQL Editor → paste `supabase/schema.sql` → Run.
3. **Login settings:** Supabase → Authentication → URL Configuration
   - Site URL: `https://ai-nonymauz-salespage-builder.vercel.app`
   - Redirect URLs: add `https://ai-nonymauz-salespage-builder.vercel.app/auth/callback` (and `http://localhost:3000/auth/callback` for local work)
   - Optional: Authentication → Providers → Google, to show "Continue with Google".
4. **Add the keys to Vercel:** Project → Settings → Environment Variables (Supabase → Project Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Redeploy.

## Upgrade an existing Supabase project

Before deploying this branch, run [`supabase/migrations/20261101_seller_studio.sql`](supabase/migrations/20261101_seller_studio.sql) in the Supabase SQL Editor. New projects can run `supabase/schema.sql` once; it already includes this migration. The migration is safe to rerun and keeps existing pages, accounts, photos, and orders. It adds release history, daily activity, offline publication state, and validated publishing/checkout RPCs. The application uses the existing two public Supabase environment variables; it does not require a service-role key.

Then run [`supabase/migrations/20261102_consent_ai_drafts.sql`](supabase/migrations/20261102_consent_ai_drafts.sql). It makes checkout save buyer details only when the buyer ticks the consent box (PDPA), lets a seller turn saved orders off (**Page settings → Helpful extras → Save orders in my Orders list**), and adds the hourly allowance for AI drafts. `schema.sql` already includes it.

## AI copy drafts (optional)

Sellers can press **Draft with AI** in the Headline section to get a headline, supporting sentence and up to three benefits written from facts they type. Nothing changes on the page until they press **Use this**, and Undo brings the old text back. The panel only appears when the server has a key:

- `ANTHROPIC_API_KEY`: an Anthropic API key (Vercel → Settings → Environment Variables; server-only, never `NEXT_PUBLIC_`).
- `AI_COPY_MODEL` (optional): defaults to `claude-opus-5-5`.

Drafts need a signed-in seller (Supabase), and each seller can make 10 drafts an hour. The prompt tells the model to use only the seller's facts and not to invent halal status, reviews, guarantees, prices or health claims, but sellers should still check every claim before publishing.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in the two keys, or leave empty for demo mode
npm run dev                  # http://localhost:3000
npm test                     # unit, IndexedDB and real PostgreSQL/RLS checks (PGlite)
npm run typecheck
npm run build && npm start   # production build
```

## Project layout

```
src/app/(builder)/      dashboard, editor (edit/[id]), orders, login
src/app/(site)/[slug]   published salespages (server-rendered)
src/app/(site)/preview  the draft exactly as buyers see it
src/app/api/orders      records orders from published pages
src/components/page/    the salespage: SalesPage, OrderForm, countdown, motion
src/components/builder/ the builder UI
src/lib/                blocks (schema), templates, themes, store (Supabase or browser)
src/styles/             salespage.css (shared), builder.css
supabase/schema.sql     tables, row-level security, photo bucket
legacy/                 the first static version, kept for reference
```

### Add a section type

Add an entry to `BLOCKS` in `src/lib/blocks.ts` (label, icon, defaults, fields) and its markup to `BlockBody` in `src/components/page/SalesPage.tsx`. The edit form is generated from `fields`.

Local verification covers demo browser storage and an isolated PostgreSQL engine. Production login, storage permissions, and email delivery still need a smoke test against your configured Supabase project after applying the migration. Appointment times use Malaysia time on the database.
