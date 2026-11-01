# Nonymauz Salespage Builder

A drag-and-drop salespage builder for small businesses (SME), made for people who don't code.
Pick a template, click any part to change the words, photos and prices, then download one HTML file and put it online.
Orders go straight to the seller's WhatsApp with the items, delivery fee, total and customer details already filled in.

## Try it

Open `index.html` in Chrome, Edge, Safari or Firefox. There's nothing to install or build.

To host the builder itself, upload the whole folder to any static host (Netlify, Vercel, GitHub Pages, cPanel).

## What sellers can do

- **Start from a template:** food and homemade products, ebook or class, service booking, or a simple blank page. Example copy is in Bahasa Melayu.
- **Add sections** by dragging them from the left panel, or tap to add. There are 15 section types:
  headline, countdown, video, order form, price box, bonuses, guarantee, call to action,
  point list (ticks, crosses or numbers), reviews, photo grid, questions (FAQ), text, photo, space/line and footer.
- **Edit in a simple form:** click a section on the page and its fields open on the right. Changes show up straight away.
- **Reorder:** drag the handle, or use the up/down arrows. Sections can also be duplicated and deleted, with undo and redo.
- **Order form with automatic totals:** packages with old/new prices, quantity buttons, delivery options, free delivery above a set amount, and a WhatsApp checkout message.
- **Style:** 6 colour presets (Pandan, Kunyit, Teh Tarik, Laut, Ros, Malam) or your own colours, 4 font styles and 3 corner styles.
- **Extras:** floating WhatsApp button, sticky order button for phones, a countdown that is either fixed-date or per-visitor, page language (BM/EN), share title and description, and a Facebook Pixel ID (tracks `PageView` and `Lead` on WhatsApp checkout).
- **Computer and phone preview**, plus a full preview mode where the order form can be tested.
- **Publish:** download one self-contained `.html` file, or copy the code.
- **Backup and restore** all pages as a `.json` file.

Pages are saved automatically in the browser (localStorage). Photos are shrunk to 1200px before saving.

## Interface design

The builder's interface follows the [taste-skill](https://github.com/Leonxlnx/taste-skill) app rules, style **Framed sheet**
(sheet saved in `.taste-skill/app/direction.json`):

- a pale pandan green-grey frame, the work on white sheets, 1px edges, no shadows on anything at rest
- one typeface (IBM Plex Sans) and a near-black primary button; colour is kept for status and the seller's own page
- the home screen answers "which of my pages can take orders?", showing each page's prices, WhatsApp number and status
- beside the order form and WhatsApp settings, a live preview of the exact message customers will send

Check changes with the skill's `inspect.mjs --app` and `lint.mjs --app`.

## Project layout

```
index.html        app shell
css/app.css       builder interface
js/core.js        helpers, colour themes, fonts, page words (BM/EN)
js/blocks.js      every section type: default content, edit fields, HTML output
js/page-css.js    styles for the salespage (shared by editor and exported file)
js/runtime.js     order form + countdown logic (copied into every exported page)
js/templates.js   starter templates
js/store.js       saving pages in the browser
js/export.js      builds the standalone HTML file
js/editor.js      home screen, drag-and-drop editor, preview, publish
```

### Adding a new section type

Add an entry to `SP.blocks` in `js/blocks.js` with `label`, `icon`, `hint`, `defaults()`, `fields` and `render(props, ctx)`,
then list it in `SP.libraryGroups`. The edit form is generated from `fields` automatically.

## Ideas for next steps

- Accounts and cloud saving (so pages are not tied to one browser)
- One-click publishing to a `yourname.nonymauz.my/page` link, plus custom domains
- Payment gateway checkout (e.g. ToyyibPay, Billplz, Stripe) as an option next to WhatsApp
- Order list and simple sales dashboard for the seller
- Visitor and conversion stats
