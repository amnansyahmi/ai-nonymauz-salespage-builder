"use server";
/* Server functions behind the seller studio. Each one checks the Neon Auth session first,
   then runs as that seller, so the database only ever returns or changes their own rows. */
import { revalidatePath } from "next/cache";
import { sellerId } from "@/lib/auth/server";
import { orders as orderData, pages } from "@/lib/server/data";
import { pgCode, pgMessage } from "@/lib/server/db";
import { photosConfigured, savePhoto } from "@/lib/server/photos";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const UUID = /^[0-9a-f-]{36}$/i;

async function asSeller<T>(fn: (uid: string) => Promise<T>, explain?: (code: string, e: unknown) => string | undefined): Promise<Result<T>> {
  const uid = await sellerId();
  if (!uid) return { ok: false, error: "Please log in again." };
  try {
    return { ok: true, data: await fn(uid) };
  } catch (e) {
    const code = pgCode(e);
    const message =
      explain?.(code, e) ||
      (code === "42501" ? "You can't change this page." : code === "22023" ? pgMessage(e) : "Could not save. Check your connection and try again.");
    if (!code || !["42501", "22023", "23505"].includes(code)) console.error("studio action failed", e);
    return { ok: false, error: message };
  }
}

const ensureId = (id: string) => {
  if (!UUID.test(id)) throw Object.assign(new Error("Invalid id"), { code: "22023" });
};
const pageData = (d: unknown) => {
  const s = JSON.stringify(d ?? null);
  if (!d || typeof d !== "object" || s.length > 4_000_000) throw Object.assign(new Error("This page is too large to save."), { code: "22023" });
  return d;
};
const refresh = (slug: string | null) => {
  if (slug) revalidatePath("/" + slug);
};

export async function listPages() {
  return asSeller((uid) => pages.list(uid));
}
export async function getPage(id: string) {
  return asSeller(async (uid) => (UUID.test(id) ? pages.get(uid, id) : null));
}
export async function createPage(name: string, data: unknown) {
  return asSeller((uid) => pages.create(uid, String(name).slice(0, 120), pageData(data)));
}
export async function savePage(id: string, name: string, data: unknown) {
  return asSeller(async (uid) => {
    ensureId(id);
    if (!(await pages.save(uid, id, String(name).slice(0, 120), pageData(data))))
      throw Object.assign(new Error("Page not found"), { code: "42501" });
    return true;
  });
}
export async function removePage(id: string) {
  return asSeller(async (uid) => {
    ensureId(id);
    const slug = await pages.slugOf(uid, id);
    await pages.remove(uid, id);
    refresh(slug);
    return true;
  });
}
export async function publishPage(id: string, slug: string, name: string, data: unknown) {
  return asSeller(
    async (uid) => {
      ensureId(id);
      await pages.publish(uid, id, slug, String(name).slice(0, 120), pageData(data));
      refresh(slug);
      return slug;
    },
    (code) => (code === "23505" ? "That link is already taken. Choose another." : undefined),
  );
}
export async function unpublishPage(id: string) {
  return asSeller(async (uid) => {
    ensureId(id);
    await pages.unpublish(uid, id);
    refresh(await pages.slugOf(uid, id));
    return true;
  });
}
export async function rollbackPage(id: string, release: string) {
  return asSeller(async (uid) => {
    ensureId(id);
    ensureId(release);
    await pages.rollback(uid, id, release);
    refresh(await pages.slugOf(uid, id));
    return true;
  });
}
export async function pageReleases(id: string) {
  return asSeller(async (uid) => (UUID.test(id) ? pages.releases(uid, id) : []));
}
export async function pageActivity(id: string) {
  return asSeller(async (uid) => (UUID.test(id) ? pages.activity(uid, id) : []));
}
export async function listOrders() {
  return asSeller((uid) => orderData.list(uid));
}
export async function uploadPhoto(form: FormData) {
  return asSeller(async (uid) => {
    if (!photosConfigured()) throw Object.assign(new Error("Photo uploads are not set up yet. Ask your admin."), { code: "22023" });
    const file = form.get("file");
    if (!(file instanceof Blob) || file.size > 4 * 1024 * 1024)
      throw Object.assign(new Error("That photo is too large. Try a smaller one."), { code: "22023" });
    const type = file.type as "image/jpeg" | "image/png" | "image/webp";
    if (!["image/jpeg", "image/png", "image/webp"].includes(type))
      throw Object.assign(new Error("That file is not a photo. Try a JPG or PNG."), { code: "22023" });
    return savePhoto(uid, new Uint8Array(await file.arrayBuffer()), type);
  }, (code) => (code === "22023" ? undefined : "Could not upload the photo. Check your connection and try again."));
}
/** The signed-in seller's id, used to keep per-seller things (like the brand kit) apart on a shared device. */
export async function whoAmI() {
  return asSeller(async (uid) => uid);
}
