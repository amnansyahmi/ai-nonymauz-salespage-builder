/* IndexedDB keeps page records, reusable image assets, and recovery snapshots separate.
   The synchronous read cache changes only after a durable write succeeds. */
(function (SP) {
  "use strict";
  var LEGACY = "nonymauz.pages.v1",
    db,
    mem = [],
    assets = new Map(),
    sourceIds = new Map(),
    queue = Promise.resolve();
  function request(r) {
    return new Promise(function (resolve, reject) {
      r.onsuccess = function () {
        resolve(r.result);
      };
      r.onerror = function () {
        reject(r.error);
      };
    });
  }
  function done(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = function () {
        reject(tx.error || new Error("Storage write failed"));
      };
    });
  }
  function legacy() {
    try {
      var p = JSON.parse(localStorage.getItem(LEGACY) || "[]");
      return Array.isArray(p) ? p.map(SP.normalizePage) : [];
    } catch (e) {
      return [];
    }
  }
  function serial(fn) {
    var next = queue.then(fn);
    queue = next.catch(function () {});
    return next;
  }
  async function pack(page) {
    var copy = SP.clone(page),
      additions = [];
    async function walk(obj) {
      for (var k of Object.keys(obj)) {
        var v = obj[k];
        if (
          typeof v === "string" &&
          /^data:image\/(png|jpeg|webp);base64,/.test(v)
        ) {
          var existing =
            sourceIds.get(v) ||
            (
              additions.find(function (a) {
                return a.source === v;
              }) || {}
            ).id;
          if (existing) {
            obj[k] = existing;
            continue;
          }
          var hash;
          if (window.crypto && crypto.subtle) {
            var bytes = await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(v),
            );
            hash = Array.from(new Uint8Array(bytes))
              .map(function (b) {
                return b.toString(16).padStart(2, "0");
              })
              .join("");
          } else hash = SP.uid() + SP.uid();
          var id = "asset:" + hash;
          additions.push({ id: id, source: v });
          obj[k] = id;
        } else if (v && typeof v === "object") await walk(v);
      }
    }
    await walk(copy);
    return { page: copy, assets: additions };
  }
  function unpack(page) {
    var p = SP.clone(page);
    function walk(obj) {
      Object.keys(obj).forEach(function (k) {
        var v = obj[k];
        if (typeof v === "string" && v.indexOf("asset:") === 0)
          obj[k] = assets.get(v) || "";
        else if (v && typeof v === "object") walk(v);
      });
    }
    walk(p);
    return SP.normalizePage(p);
  }
  async function collectAssets() {
    var pages = await request(
      db.transaction("pages").objectStore("pages").getAll(),
    );
    var versions = await request(
      db.transaction("versions").objectStore("versions").getAll(),
    );
    var used = new Set();
    function walk(obj) {
      Object.values(obj).forEach(function (v) {
        if (typeof v === "string" && v.startsWith("asset:")) used.add(v);
        else if (v && typeof v === "object") walk(v);
      });
    }
    pages.forEach(walk);
    versions.forEach(function (v) {
      walk(v.page);
    });
    var stale = Array.from(assets.keys()).filter(function (id) {
      return !used.has(id);
    });
    if (!stale.length) return;
    var tx = db.transaction("assets", "readwrite"),
      finish = done(tx);
    stale.forEach(function (id) {
      tx.objectStore("assets").delete(id);
    });
    await finish;
    stale.forEach(function (id) {
      sourceIds.delete(assets.get(id));
      assets.delete(id);
    });
  }
  async function persistPage(page, checkpoint) {
    var p = SP.normalizePage(SP.clone(page));
    p.updatedAt = Date.now();
    if (!db) {
      var next = mem
        .filter(function (x) {
          return x.id !== p.id;
        })
        .concat(p);
      localStorage.setItem(LEGACY, JSON.stringify(next));
      mem = next;
      return true;
    }
    var packed = await pack(p),
      tx = db.transaction(["pages", "assets", "versions"], "readwrite"),
      finish = done(tx);
    packed.assets.forEach(function (a) {
      tx.objectStore("assets").put(a);
    });
    tx.objectStore("pages").put(packed.page);
    if (checkpoint)
      tx.objectStore("versions").put({
        id: p.id + ":" + p.updatedAt + ":" + SP.uid(),
        pageId: p.id,
        at: p.updatedAt,
        page: packed.page,
      });
    await finish;
    packed.assets.forEach(function (a) {
      assets.set(a.id, a.source);
      sourceIds.set(a.source, a.id);
    });
    mem = mem
      .filter(function (x) {
        return x.id !== p.id;
      })
      .concat(p);
    try {
      var journal = JSON.parse(
        localStorage.getItem("nonymauz.pending") || "null",
      );
      if (journal && journal.page.id === p.id && journal.at <= p.updatedAt)
        localStorage.removeItem("nonymauz.pending");
    } catch (e) {}
    if (checkpoint) {
      var vs = await SP.store.versions(p.id);
      if (vs.length > 20) {
        var prune = db.transaction("versions", "readwrite"),
          pruned = done(prune);
        vs.slice(20).forEach(function (v) {
          prune.objectStore("versions").delete(v.id);
        });
        await pruned;
        await collectAssets().catch(function () {});
      }
    }
    return true;
  }
  SP.store = {
    mode: "loading",
    images: function () {
      return Array.from(assets.values());
    },
    journal: function (page) {
      try {
        localStorage.setItem(
          "nonymauz.pending",
          JSON.stringify({ at: Date.now(), page: page }),
        );
        return true;
      } catch (e) {
        return false;
      }
    },
    all: function () {
      return mem.slice().sort(function (a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
    },
    get: function (id) {
      var p = mem.find(function (x) {
        return x.id === id;
      });
      return p ? SP.normalizePage(SP.clone(p)) : null;
    },
    put: function (page, checkpoint) {
      return serial(function () {
        return persistPage(page, checkpoint !== false);
      }).then(
        function () {
          return true;
        },
        function (e) {
          SP.store.lastError = e.message;
          return false;
        },
      );
    },
    remove: function (id) {
      return serial(async function () {
        if (db) {
          var versions = await SP.store.versions(id);
          var tx = db.transaction(["pages", "versions"], "readwrite"),
            finish = done(tx);
          tx.objectStore("pages").delete(id);
          versions.forEach(function (v) {
            tx.objectStore("versions").delete(v.id);
          });
          await finish;
          await collectAssets().catch(function () {});
        } else
          localStorage.setItem(
            LEGACY,
            JSON.stringify(
              mem.filter(function (x) {
                return x.id !== id;
              }),
            ),
          );
        mem = mem.filter(function (x) {
          return x.id !== id;
        });
        return true;
      }).catch(function () {
        return false;
      });
    },
    versions: async function (id) {
      if (!db) return [];
      var vs = await request(
        db.transaction("versions").objectStore("versions").getAll(),
      );
      return vs
        .filter(function (v) {
          return v.pageId === id;
        })
        .sort(function (a, b) {
          return b.at - a.at;
        });
    },
    recover: async function (version) {
      return unpack(version.page);
    },
    restoreBackup: async function (data, mode) {
      if (
        !data ||
        data.app !== "nonymauz" ||
        data.version !== 1 ||
        !Array.isArray(data.pages) ||
        data.pages.length > 100
      )
        throw new Error("Choose a valid Nonymauz backup (up to 100 pages).");
      var incoming = data.pages.map(function (p) {
        if (!p || !Array.isArray(p.blocks))
          throw new Error("The backup contains an invalid page.");
        return SP.normalizePage(p);
      });
      var restored = 0,
        skipped = 0,
        failed = 0;
      for (var p of incoming) {
        if (SP.store.get(p.id)) {
          if (mode === "skip") {
            skipped++;
            continue;
          }
          if (mode === "copy") {
            p.id = SP.uid();
            p.name += " (restored)";
          }
        }
        if (await SP.store.put(p)) restored++;
        else failed++;
      }
      return { restored: restored, skipped: skipped, failed: failed };
    },
  };
  SP.normalizePage = function (p) {
    if (!p || typeof p !== "object" || Array.isArray(p))
      throw new Error("Invalid page");
    p.id = /^[a-zA-Z0-9_-]{1,80}$/.test(p.id || "") ? p.id : SP.uid();
    p.name = String(p.name || "Untitled page").slice(0, 120);
    p.theme = Object.assign(SP.defaultTheme(), p.theme || {});
    var pre = SP.themes[p.theme.preset];
    if (pre)
      Object.assign(p.theme, {
        primary: pre.primary,
        accent: pre.accent,
        bg: pre.bg,
        text: pre.text,
        alt: pre.alt || "",
      });
    ["primary", "accent", "bg", "text", "alt"].forEach(function (k) {
      if (!/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(p.theme[k] || ""))
        p.theme[k] = k === "alt" ? "" : SP.defaultTheme()[k];
    });
    if (!SP.looks[p.theme.look]) p.theme.look = "classic";
    if (!SP.fonts[p.theme.font]) p.theme.font = "moden";
    p.settings = Object.assign(
      {
        businessName: "",
        whatsapp: "",
        lang: "ms",
        waFloat: true,
        sticky: false,
        stickyText: "Order sekarang",
        stickyLink: "#order",
        seoTitle: "",
        seoDesc: "",
        pixelId: "",
        spacing: "comfortable",
        captureOrders: false,
      },
      p.settings || {},
    );
    [
      "businessName",
      "whatsapp",
      "stickyText",
      "stickyLink",
      "seoTitle",
      "seoDesc",
      "pixelId",
    ].forEach(function (k) {
      p.settings[k] = String(p.settings[k] || "").slice(0, 2000);
    });
    p.settings.lang = p.settings.lang === "en" ? "en" : "ms";
    ["waFloat", "sticky", "captureOrders", "reviewsConfirmed"].forEach(
      function (k) {
        p.settings[k] = !!p.settings[k];
      },
    );
    p.blocks = (Array.isArray(p.blocks) ? p.blocks : [])
      .slice(0, 100)
      .map(SP.normalizeBlock)
      .filter(Boolean);
    var ids = new Set();
    p.blocks.forEach(function (b) {
      if (ids.has(b.id)) b.id = SP.uid();
      ids.add(b.id);
    });
    return p;
  };
  SP.createFromTemplate = function (tplId) {
    var t =
      SP.templates.find(function (x) {
        return x.id === tplId;
      }) || SP.templates[0];
    var p = SP.normalizePage(t.build());
    p.id = SP.uid();
    p.createdAt = Date.now();
    return p;
  };
  if (window.SP_SERVER) {
    SP.store.ready = Promise.resolve();
    return;
  }
  SP.store.ready = (async function () {
    try {
      if (!window.indexedDB) throw new Error("Unavailable");
      var op = indexedDB.open("nonymauz-studio", 1);
      op.onupgradeneeded = function () {
        var d = op.result;
        d.createObjectStore("pages", { keyPath: "id" });
        d.createObjectStore("assets", { keyPath: "id" });
        d.createObjectStore("versions", { keyPath: "id" });
      };
      db = await request(op);
      db.onversionchange = function () {
        db.close();
      };
      var a = await request(
        db.transaction("assets").objectStore("assets").getAll(),
      );
      a.forEach(function (x) {
        assets.set(x.id, x.source);
        sourceIds.set(x.source, x.id);
      });
      var pages = await request(
        db.transaction("pages").objectStore("pages").getAll(),
      );
      mem = pages.map(unpack);
      SP.store.mode = "indexeddb";
      if (!pages.length) {
        var oldPages = legacy();
        for (var p of oldPages) await persistPage(p, true);
        if (oldPages.length)
          try {
            localStorage.removeItem(LEGACY);
          } catch (e) {}
      }
    } catch (e) {
      db = null;
      mem = legacy();
      SP.store.mode = "browser";
    }
    try {
      var pending = JSON.parse(
        localStorage.getItem("nonymauz.pending") || "null",
      );
      if (
        pending &&
        pending.page &&
        (!SP.store.get(pending.page.id) ||
          pending.at > SP.store.get(pending.page.id).updatedAt)
      )
        await persistPage(pending.page, true);
    } catch (e) {
      SP.store.lastError = "A pending edit could not be recovered.";
    }
  })();
})(window.SP);
