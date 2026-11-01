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

## Develop

```bash
npm install
cp .env.example .env.local   # fill in the two keys, or leave empty for demo mode
npm run dev                  # http://localhost:3000
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
