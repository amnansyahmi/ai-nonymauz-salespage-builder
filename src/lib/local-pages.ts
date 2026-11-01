/* Device recovery and demo pages share an atomic IndexedDB store. Cloud auth stays in Supabase. */
import type { Page } from "./types";
import { clone, uid } from "./format";
import { normalizePage } from "./page";
type Row = { key: string; owner: string; page: Page; at: number };
export type LocalVersion = Row & { pageId: string };
let opening: Promise<IDBDatabase | null> | undefined;
let writes: Promise<unknown> = Promise.resolve();
const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const complete = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () =>
      reject(tx.error || new Error("Device storage failed."));
  });
function open() {
  if (!opening)
    opening = new Promise<IDBDatabase | null>((resolve) => {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const r = indexedDB.open("nonymauz-next-studio", 1);
      r.onupgradeneeded = () => {
        for (const name of ["pages", "assets", "versions"])
          r.result.createObjectStore(name, { keyPath: "key" });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.onblocked = () => resolve(null);
    });
  return opening;
}
function serial<T>(fn: () => Promise<T>) {
  const p = writes.then(fn);
  writes = p.catch(() => {});
  return p;
}
async function assetMap(db: IDBDatabase) {
  return new Map(
    (
      (await req(db.transaction("assets").objectStore("assets").getAll())) as {
        key: string;
        source: string;
      }[]
    ).map((a) => [a.key, a.source]),
  );
}
function hydrate(page: Page, assets: Map<string, string>) {
  const p = clone(page);
  function walk(o: any) {
    Object.keys(o).forEach((k) => {
      if (typeof o[k] === "string" && o[k].startsWith("asset:"))
        o[k] = assets.get(o[k]) || "";
      else if (o[k] && typeof o[k] === "object") walk(o[k]);
    });
  }
  walk(p);
  return normalizePage(p);
}
async function collectAssets(db: IDBDatabase) {
  const [pages, versions, assets] = await Promise.all(
    ["pages", "versions", "assets"].map((name) =>
      req(db.transaction(name).objectStore(name).getAll()),
    ),
  );
  const used = new Set<string>();
  function walk(o: any) {
    if (!o || typeof o !== "object") return;
    for (const value of Object.values(o)) {
      if (typeof value === "string" && value.startsWith("asset:"))
        used.add(value);
      else if (value && typeof value === "object") walk(value);
    }
  }
  pages.forEach(walk);
  versions.forEach(walk);
  const unused = assets.filter((a) => !used.has(a.key));
  if (!unused.length) return;
  const tx = db.transaction("assets", "readwrite"),
    done = complete(tx);
  unused.forEach((a) => tx.objectStore("assets").delete(a.key));
  await done;
}
async function rows(owner: string) {
  const db = await open();
  if (!db) {
    try {
      return JSON.parse(
        localStorage.getItem("nonymauz.local." + owner) || "[]",
      ) as Row[];
    } catch {
      throw new Error(
        "Device storage is unavailable. Download a backup before leaving.",
      );
    }
  }
  return (
    (await req(db.transaction("pages").objectStore("pages").getAll())) as Row[]
  ).filter((r) => r.owner === owner);
}
async function list(owner: string): Promise<Page[]> {
  const db = await open();
  let all = await rows(owner);
  if (
    owner === "demo" &&
    !all.length &&
    !localStorage.getItem("nonymauz.next.migrated")
  ) {
    const legacy =
      localStorage.getItem("nonymauz.pages.v2") ||
      localStorage.getItem("nonymauz.pages.v1");
    if (legacy) {
      const old = JSON.parse(legacy);
      if (Array.isArray(old)) {
        for (const p of old) await save(owner, normalizePage(p));
        all = await rows(owner);
      }
    }
    localStorage.setItem("nonymauz.next.migrated", "1");
  }
  const assets = db ? await assetMap(db) : new Map<string, string>();
  return all
    .map((r) => hydrate(r.page, assets))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
async function save(owner: string, page: Page) {
  return serial(async () => {
    const db = await open(),
      p = normalizePage(clone(page)),
      at = Date.now();
    p.updatedAt = at;
    if (!db) {
      const all = await rows(owner);
      const next = all
        .filter((r) => r.page.id !== p.id)
        .concat({ key: owner + ":" + p.id, owner, page: p, at });
      try {
        localStorage.setItem("nonymauz.local." + owner, JSON.stringify(next));
      } catch {
        throw new Error(
          "Browser storage is full. Download a backup and use smaller photos.",
        );
      }
      return;
    }
    const map = await assetMap(db),
      reverse = new Map(Array.from(map, ([key, source]) => [source, key])),
      additions: { key: string; source: string }[] = [],
      packed = clone(p);
    async function walk(o: any) {
      for (const key of Object.keys(o)) {
        const value = o[key];
        if (
          typeof value === "string" &&
          /^data:image\/(png|jpeg|webp);base64,/.test(value)
        ) {
          let id = reverse.get(value);
          if (!id) {
            const digest = globalThis.crypto?.subtle
              ? Array.from(
                  new Uint8Array(
                    await crypto.subtle.digest(
                      "SHA-256",
                      new TextEncoder().encode(value),
                    ),
                  ),
                )
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("")
              : uid() + uid();
            id = "asset:" + digest;
            reverse.set(value, id);
            additions.push({ key: id, source: value });
          }
          o[key] = id;
        } else if (value && typeof value === "object") await walk(value);
      }
    }
    await walk(packed);
    const previous = (await req(
      db
        .transaction("pages")
        .objectStore("pages")
        .get(owner + ":" + p.id),
    )) as Row | undefined;
    const same =
      previous &&
      JSON.stringify({ ...previous.page, updatedAt: 0 }) ===
        JSON.stringify({ ...packed, updatedAt: 0 });
    const versions = (
      (await req(
        db.transaction("versions").objectStore("versions").getAll(),
      )) as LocalVersion[]
    )
      .filter((v) => v.owner === owner && v.pageId === p.id)
      .sort((a, b) => b.at - a.at);
    const tx = db.transaction(["pages", "assets", "versions"], "readwrite"),
      finished = complete(tx);
    additions.forEach((a) => tx.objectStore("assets").put(a));
    tx.objectStore("pages").put({
      key: owner + ":" + p.id,
      owner,
      page: packed,
      at,
    });
    if (!same && (!versions.length || at - versions[0].at >= 15000))
      tx.objectStore("versions").put({
        key: owner + ":" + p.id + ":" + at + ":" + uid(),
        owner,
        pageId: p.id,
        page: packed,
        at,
      });
    versions.slice(19).forEach((v) => tx.objectStore("versions").delete(v.key));
    await finished;
    await collectAssets(db);
  });
}
async function versions(owner: string, id: string) {
  const db = await open();
  if (!db) return [];
  const a = await assetMap(db);
  return (
    (await req(
      db.transaction("versions").objectStore("versions").getAll(),
    )) as LocalVersion[]
  )
    .filter((v) => v.owner === owner && v.pageId === id)
    .sort((x, y) => y.at - x.at)
    .map((v) => ({ ...v, page: hydrate(v.page, a) }));
}
async function remove(owner: string, id: string) {
  return serial(async () => {
    const db = await open();
    if (!db) {
      localStorage.setItem(
        "nonymauz.local." + owner,
        JSON.stringify((await rows(owner)).filter((r) => r.page.id !== id)),
      );
      return;
    }
    const vs = await versions(owner, id),
      tx = db.transaction(["pages", "versions"], "readwrite"),
      finished = complete(tx);
    tx.objectStore("pages").delete(owner + ":" + id);
    vs.forEach((v) => tx.objectStore("versions").delete(v.key));
    await finished;
    await collectAssets(db);
  });
}
export const localPages = { list, save, remove, versions };
export function journalPage(owner: string, page: Page) {
  try {
    localStorage.setItem(
      "nonymauz.pending." + owner,
      JSON.stringify({ at: Date.now(), page }),
    );
    return true;
  } catch {
    return false;
  }
}
export function pendingPage(owner: string, id: string): Page | null {
  try {
    const raw = JSON.parse(
      localStorage.getItem("nonymauz.pending." + owner) || "null",
    );
    return raw?.page?.id === id
      ? normalizePage({ ...raw.page, updatedAt: raw.at })
      : null;
  } catch {
    return null;
  }
}
export function clearJournal(owner: string, page: Page) {
  try {
    const raw = JSON.parse(
      localStorage.getItem("nonymauz.pending." + owner) || "null",
    );
    if (
      raw?.page?.id === page.id &&
      JSON.stringify(raw.page) === JSON.stringify(page)
    )
      localStorage.removeItem("nonymauz.pending." + owner);
  } catch {
    /* recovery remains available */
  }
}
