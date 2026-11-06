# Nonymauz Salespage Builder

A salespage builder for Malaysian small businesses. Sellers pick a template, edit words, photos and prices, and publish to a live link. Buyers order through a checkout that records the order and opens WhatsApp with everything filled in.

**Stack:** Next.js 16 (App Router, React 19, TypeScript) · Neon (Postgres, Neon Auth login, Object Storage for photos) · Vercel.

## What it does

- **Templates with their own layout styles**, art-directed with [taste-skill](https://github.com/Leonxlnx/taste-skill): Label (food), Chapters (ebook/class), Shape (services), Stage (one product), plus Classic.
- **Editor:** drag sections from the library, click any section to edit it in a form, undo/redo, autosave, computer and phone canvas, bottom sheets on phones.
- **Preview** renders the exact page buyers will get.
- **One-click publish** to `https://<your-domain>/<link>`, rendered on the server for fast loading, Google and WhatsApp link previews.
- **Checkout:** packages, delivery options, free-delivery threshold, live total. Each order is saved to the seller's **Orders** page, then WhatsApp opens with the message.
- **Accounts (Neon Auth):** email login link or Google. Each seller only ever sees their own pages and orders: every request runs in Postgres as that seller, and row-level security does the rest.
- Facebook Pixel (PageView + Lead) and share titles/descriptions per page.

The seller studio adds a guided setup with your own business details, a navigable section outline with hide/show controls, collapsible settings, reusable brand colours and photos, image composition/crop controls, compact spacing, and a launch checklist. Local IndexedDB recovery keeps recent draft versions and deduplicates photos. Backup restore offers copy, replace, and skip modes.

Publishing is atomic and retains a stable public address. Taking a page offline keeps recorded enquiries. You can roll the live page back to a recent release without overwriting your draft. Checkout validates prices against the published catalog in Postgres, supports pickup, variants, and preferred appointments, and deduplicates retries. Activity counts show visits and CTA/WhatsApp clicks; these are approximate counters, not confirmed messages, payments, or unique buyers.

Without the Neon settings the app runs in **demo mode**: pages are saved in the browser, publishing is off. Useful for local work.

## Set up (one time)

The live site uses the Neon project **nonymauz-salespage** (Singapore). Its database schema, login (Neon Auth with email link and Google) and the public `photos` bucket are already set up. For a new Neon project or branch:

1. **Create the tables:** put the connection string in `DATABASE_URL` and run `npm run db:setup` (or paste `db/schema.sql` into the Neon SQL Editor). Safe to re-run.
2. **Turn on Neon Auth** for the branch (Neon Console → Auth), enable the **magic link** plugin, and add your site to **trusted domains**. Google works with Neon's shared Google app; add your own Google client in the same page for your own branding.
3. **Create a public bucket** named `photos` (Neon Console → Object storage, access level `public_read`) and a storage credential with `storage:read` and `storage:write`.
4. **Add these to Vercel** (Project → Settings → Environment Variables), then redeploy:

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Neon → Connect (pooled connection string) |
| `NEON_AUTH_BASE_URL` | Neon → Auth → Configuration (Auth URL) |
| `NEON_AUTH_COOKIE_SECRET` | any random 32+ characters, e.g. `openssl rand -base64 36` |
| `NEON_STORAGE_ENDPOINT` | Neon → Object storage (branch S3 endpoint) |
| `NEON_STORAGE_REGION` | e.g. `ap-southeast-1` |
| `NEON_STORAGE_KEY_ID` / `NEON_STORAGE_SECRET` | the storage credential (`token_id` / `s3_secret_access_key`) |

All of these are server-only. The browser never talks to the database directly: the studio calls server functions (`src/app/actions/studio.ts`) that check the Neon Auth session, then run each query as the `authenticated` role with that seller's id. Buyers and visitors run as `anon` and can only read live pages and use the checkout and visit-count functions.

## AI copy drafts (optional)

Sellers can press **Draft with AI** in the Headline section to get a headline, supporting sentence and up to three benefits written from facts they type. Nothing changes on the page until they press **Use this**, and Undo brings the old text back. The panel only appears when the server has a key:

- `ANTHROPIC_API_KEY`: an Anthropic API key (Vercel → Settings → Environment Variables; server-only, never `NEXT_PUBLIC_`).
- `AI_COPY_MODEL` (optional): defaults to `claude-opus-5-5`.

Drafts need a signed-in seller, and each seller can make 10 drafts an hour. The prompt tells the model to use only the seller's facts and not to invent halal status, reviews, guarantees, prices or health claims, but sellers should still check every claim before publishing.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in the Neon settings, or leave empty for demo mode
npm run dev                  # http://localhost:3000
npm test                     # unit, IndexedDB and real PostgreSQL/RLS checks (PGlite)
npm run db:setup             # apply db/schema.sql to DATABASE_URL
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
src/app/actions/        server functions for the studio (session check, then database)
src/lib/server/         database access by role (db.ts, data.ts) and photo uploads
src/lib/auth/           Neon Auth (server and browser)
src/lib/                blocks (schema), templates, themes, store (server or browser)
src/styles/             salespage.css (shared), builder.css
db/schema.sql           tables, roles, row-level security and RPCs (Neon Postgres)
legacy/                 the first static version, kept for reference
```

### Add a section type

Add an entry to `BLOCKS` in `src/lib/blocks.ts` (label, icon, defaults, fields) and its markup to `BlockBody` in `src/components/page/SalesPage.tsx`. The edit form is generated from `fields`.

Local verification covers demo browser storage and an isolated PostgreSQL engine. Production login, storage permissions, and email delivery still need a smoke test against your configured Supabase project after applying the migration. Appointment times use Malaysia time on the database.
