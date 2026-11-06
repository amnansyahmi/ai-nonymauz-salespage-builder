"use client";
/* One interface for the builder's data. Cloud mode uses Neon through server functions; demo mode keeps pages in this browser. */
import { localPages } from "./local-pages";
import type { Page } from "./types";
import { normalizePage } from "./page";
import { clone, uid, validWhatsApp } from "./format";
import { hasCloud } from "./cloud";
/* Loaded only in cloud mode; in the browser these are calls to the server functions in app/actions/studio. */
const server = () => import("@/app/actions/studio");

export interface Order {
  id: string;
  slug: string;
  createdAt: string;
  total: number;
  items: { name: string; price: number; qty: number }[];
  shipping: { label: string; fee: number } | null;
  customer: {
    name: string;
    phone: string;
    address?: string;
    note?: string;
    variant?: string;
    date?: string;
    time?: string;
  };
}

export interface Store {
  mode: "cloud" | "demo";
  list(): Promise<Page[]>;
  get(id: string): Promise<Page | null>;
  create(page: Page): Promise<Page>;
  save(page: Page): Promise<void>;
  remove(id: string): Promise<void>;
  /** Puts the page live at /<slug>. Returns an error message the seller can act on. */
  publish(
    page: Page,
    slug: string,
  ): Promise<{ ok: true; slug: string } | { ok: false; error: string }>;
  unpublish(page: Page): Promise<void>;
  uploadImage(blob: Blob): Promise<string>;
  orders(): Promise<Order[]>;
}

/* ---------------- demo mode: this browser only ---------------- */
const demoStore: Store = {
  mode: "demo",
  async list() {
    return localPages.list("demo");
  },
  async get(id) {
    return (await localPages.list("demo")).find((p) => p.id === id) || null;
  },
  async create(page) {
    const p = { ...clone(page), id: uid(), updatedAt: Date.now() };
    await localPages.save("demo", p);
    return p;
  },
  async save(page) {
    await localPages.save("demo", page);
  },
  async remove(id) {
    await localPages.remove("demo", id);
  },
  async publish() {
    return {
      ok: false,
      error:
        "Publishing needs the online version. Ask your admin to connect the Neon database.",
    };
  },
  async unpublish() {
    /* nothing to do */
  },
  async uploadImage(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  },
  async orders() {
    return [];
  },
};

/* ---------------- cloud mode: Neon, through server functions ---------------- */
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/;
const RESERVED = new Set([
  "dashboard",
  "edit",
  "login",
  "logout",
  "auth",
  "api",
  "preview",
  "orders",
  "admin",
  "settings",
  "p",
  "_next",
  "favicon.ico",
]);

/** Unwraps a server function's answer, turning a refusal into an error the seller can read. */
async function call<T>(p: Promise<{ ok: true; data: T } | { ok: false; error: string }>): Promise<T> {
  let r;
  try {
    r = await p;
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

function fromRow(r: any): Page {
  return normalizePage({
    ...r.data,
    id: r.id,
    name: r.name,
    slug: r.slug,
    published: r.published,
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    updatedAt: new Date(r.updated_at).getTime(),
  });
}
const toData = (p: Page) => ({
  theme: p.theme,
  settings: p.settings,
  blocks: p.blocks,
});

const cloudStore: Store = {
  mode: "cloud",
  async list() {
    return (await call((await server()).listPages())).map(fromRow);
  },
  async get(id) {
    const r = await call((await server()).getPage(id));
    return r ? fromRow(r) : null;
  },
  async create(page) {
    return fromRow(await call((await server()).createPage(page.name, toData(page))));
  },
  async save(page) {
    await call((await server()).savePage(page.id, page.name, toData(page)));
  },
  async remove(id) {
    await call((await server()).removePage(id));
  },
  async publish(page, slug) {
    if (!validWhatsApp(page.settings.whatsapp))
      return { ok: false, error: "Add a valid WhatsApp destination first." };
    if (!SLUG_RE.test(slug) || RESERVED.has(slug))
      return {
        ok: false,
        error: "Use 2–48 letters, numbers or dashes, like dapur-mak-long.",
      };
    if (page.slug && page.slug !== slug)
      return {
        ok: false,
        error:
          "Keep your existing link. Duplicate the page if you need another address.",
      };
    try {
      await call((await server()).publishPage(page.id, slug, page.name, toData(page)));
      return { ok: true, slug };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  async unpublish(page) {
    await call((await server()).unpublishPage(page.id));
  },
  async uploadImage(blob) {
    const form = new FormData();
    form.append("file", blob);
    return call((await server()).uploadPhoto(form));
  },
  async orders() {
    return (await call((await server()).listOrders())).map((r: any) => ({
      id: r.id,
      slug: r.slug,
      createdAt: new Date(r.created_at).toISOString(),
      total: Number(r.total),
      items: r.items,
      shipping: r.shipping,
      customer: r.customer,
    }));
  },
};

export const store: Store = hasCloud ? cloudStore : demoStore;

/** Shrink photos before saving so pages stay light and fast. */
export async function shrinkImage(file: File, max = 1600): Promise<Blob> {
  if (
    file.size > 15 * 1024 * 1024 ||
    !/^image\/(jpeg|png|webp)$/.test(file.type)
  )
    throw new Error("That file is not a photo. Try a JPG or PNG.");
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise((res, rej) =>
    c.toBlob(
      (b) => (b ? res(b) : rej(new Error("Could not read that photo."))),
      type,
      0.85,
    ),
  );
}

export async function storageOwner() {
  if (!hasCloud) return "demo";
  return call((await server()).whoAmI());
}
export async function restoreBackup(
  data: unknown,
  mode: "copy" | "replace" | "skip",
) {
  const backup = data as { app?: string; version?: number; pages?: Page[] };
  if (
    backup?.app !== "nonymauz" ||
    ![1, 2].includes(backup.version || 0) ||
    !Array.isArray(backup.pages) ||
    backup.pages.length > 100
  )
    throw new Error("Choose a valid Nonymauz backup (up to 100 pages).");
  const existing = await store.list();
  let restored = 0,
    skipped = 0,
    failed = 0;
  for (const raw of backup.pages) {
    try {
      if (!raw || !Array.isArray(raw.blocks)) throw new Error("Invalid page");
      const p = normalizePage(raw),
        match = existing.find((x) => x.id === p.id);
      if (match && mode === "skip") {
        skipped++;
        continue;
      }
      if (match && mode === "replace")
        await store.save({
          ...p,
          id: match.id,
          slug: match.slug,
          published: match.published,
        });
      else await store.create({ ...p, slug: null, published: false });
      restored++;
    } catch {
      failed++;
    }
  }
  return { restored, skipped, failed };
}
export async function publishedVersions(id: string) {
  if (!hasCloud) return [];
  return (await call((await server()).pageReleases(id))).map((r: any) => ({
    ...r,
    created_at: new Date(r.created_at).toISOString(),
  }));
}
export async function rollbackPublished(id: string, release: string) {
  await call((await server()).rollbackPage(id, release));
}
export async function pageActivity(id: string) {
  if (!hasCloud) return [];
  return (await call((await server()).pageActivity(id))) as {
    visits: number;
    cta: number;
    whatsapp: number;
  }[];
}
