"use client";
/* One interface for the builder's data. Cloud mode uses Supabase; demo mode keeps pages in this browser. */
import { localPages } from "./local-pages";
import type { Page } from "./types";
import { normalizePage } from "./page";
import { clone, uid, validWhatsApp } from "./format";
import { hasSupabase } from "./supabase/env";
import { supabaseBrowser } from "./supabase/client";

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
        "Publishing needs the online version. Ask your admin to connect Supabase.",
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

/* ---------------- cloud mode: Supabase ---------------- */
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

function fromRow(r: any): Page {
  return normalizePage({
    ...r.data,
    id: r.id,
    name: r.name,
    slug: r.slug,
    published: r.published,
    publishedAt: r.published_at,
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
    const { data, error } = await supabaseBrowser()
      .from("pages")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
  },
  async get(id) {
    const { data, error } = await supabaseBrowser()
      .from("pages")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
  },
  async create(page) {
    const { data, error } = await supabaseBrowser()
      .from("pages")
      .insert({ name: page.name, data: toData(page) })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return fromRow(data);
  },
  async save(page) {
    const { error } = await supabaseBrowser()
      .from("pages")
      .update({
        name: page.name,
        data: toData(page),
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
  },
  async remove(id) {
    const { error } = await supabaseBrowser()
      .from("pages")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
  async publish(page, slug) {
    if (!validWhatsApp(page.settings.whatsapp))
      return { ok: false, error: "Add a valid WhatsApp destination first." };
    if (!SLUG_RE.test(slug) || RESERVED.has(slug))
      return {
        ok: false,
        error: "Use 2–48 letters, numbers or dashes, like dapur-mak-long.",
      };
    const sb = supabaseBrowser();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return { ok: false, error: "Please log in again." };
    if (page.slug && page.slug !== slug)
      return {
        ok: false,
        error:
          "Keep your existing link. Duplicate the page if you need another address.",
      };
    const { error } = await sb.rpc("publish_page", {
      p_page_id: page.id,
      p_slug: slug,
      p_name: page.name,
      p_data: toData(page),
    });
    if (error)
      return {
        ok: false,
        error:
          error.code === "23505"
            ? "That link is already taken. Choose another."
            : error.code === "PGRST202"
              ? "Database setup needs updating before publishing. See the README."
              : error.message,
      };
    await refreshLive(page.id);
    return { ok: true, slug };
  },
  async unpublish(page) {
    const { error } = await supabaseBrowser().rpc("unpublish_page", {
      p_page_id: page.id,
    });
    if (error) throw new Error(error.message);
    await refreshLive(page.id);
  },
  async uploadImage(blob) {
    const sb = supabaseBrowser();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) throw new Error("Please log in again.");
    const ext = blob.type === "image/png" ? "png" : "jpg";
    const path = `${user.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage
      .from("photos")
      .upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
  },
  async orders() {
    const { data, error } = await supabaseBrowser()
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
      id: r.id,
      slug: r.slug,
      createdAt: r.created_at,
      total: Number(r.total),
      items: r.items,
      shipping: r.shipping,
      customer: r.customer,
    }));
  },
};

export const store: Store = hasSupabase ? cloudStore : demoStore;

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
  if (!hasSupabase) return "demo";
  const {
    data: { user },
  } = await supabaseBrowser().auth.getUser();
  if (!user) throw new Error("Please log in again.");
  return user.id;
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
  if (!hasSupabase) return [];
  const { data, error } = await supabaseBrowser()
    .from("page_releases")
    .select("id,name,data,created_at")
    .eq("page_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data || [];
}
/** Ask the server to refresh the cached live page straight away (best effort). */
async function refreshLive(pageId: string) {
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageId }),
    });
  } catch {
    /* the cache expires on its own within 5 minutes */
  }
}
export async function rollbackPublished(id: string, release: string) {
  const { error } = await supabaseBrowser().rpc("rollback_page", {
    p_page_id: id,
    p_release: release,
  });
  if (error) throw new Error(error.message);
  await refreshLive(id);
}
export async function pageActivity(id: string) {
  if (!hasSupabase) return [];
  const { data, error } = await supabaseBrowser()
    .from("page_activity")
    .select("visits,cta,whatsapp")
    .eq("page_id", id);
  if (error) throw new Error(error.message);
  return data || [];
}
