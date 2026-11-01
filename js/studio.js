/* Seller workflows shared by the dashboard and editor. No framework or build step. */
(function (SP) {
  "use strict";
  var esc = SP.esc;
  SP.dialog = function (title, html, wide) {
    var previous = document.activeElement,
      wrap = document.createElement("div");
    wrap.className = "overlay modal-wrap";
    wrap.innerHTML =
      '<section class="modal studio-modal' +
      (wide ? " wide" : "") +
      '" role="dialog" aria-modal="true" aria-label="' +
      esc(title) +
      '"><header class="modal-head"><h2>' +
      esc(title) +
      '</h2><button class="icon-btn" type="button" data-dismiss aria-label="Close">' +
      SP.icon("close") +
      "</button></header>" +
      html +
      "</section>";
    function close() {
      wrap.remove();
      if (previous && previous.isConnected) previous.focus();
    }
    wrap.querySelector("[data-dismiss]").onclick = close;
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap) close();
    });
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
      if (e.key === "Tab") {
        var els = Array.from(
          wrap.querySelectorAll("button,input,select,textarea,a[href]"),
        ).filter(function (x) {
          return !x.disabled && x.getClientRects().length;
        });
        var first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    document.body.appendChild(wrap);
    wrap.querySelector("[data-dismiss]").focus();
    return {
      root: wrap,
      close: close,
      find: function (s) {
        return wrap.querySelector(s);
      },
    };
  };
  SP.launchChecks = function (page) {
    var visible = page.blocks.filter(function (b) {
        return !b.hidden;
      }),
      order = visible.find(function (b) {
        return b.type === "order";
      }),
      hero = visible.find(function (b) {
        return b.type === "hero";
      });
    var checks = [];
    function add(ok, title, detail, level) {
      checks.push({
        ok: !!ok,
        title: title,
        detail: detail,
        level: level || "warning",
      });
    }
    add(
      SP.validWa(page.settings.whatsapp),
      "WhatsApp destination",
      "Add a valid number so customers can reach you.",
      "error",
    );
    add(
      order && order.props.items.length,
      "An order form with products",
      "Add an order form and at least one package.",
      "error",
    );
    add(
      hero && hero.props.image,
      "Your product photo",
      "Replace template artwork with a real photo.",
    );
    var text = JSON.stringify(visible);
    add(
      !/Nama pelanggan|Pelanggan kedua|Tulis apa yang|Nama Perniagaan Anda|masukkan no|Tulis tajuk|Produk baru|Nama produk anda/i.test(
        text,
      ),
      "Example content replaced",
      "Check names, registration details, product copy and reviews.",
    );
    add(
      !visible.some(function (b) {
        return b.type === "testimonials" && (b.props.items || []).length;
      }) || !!page.settings.reviewsConfirmed,
      "Reviews checked",
      "Confirm that published quotes are real and you have permission to use them.",
    );
    var targets = new Set(
      visible
        .map(function (b) {
          return b.anchor;
        })
        .filter(Boolean),
    );
    if (order) targets.add("order");
    var links = [];
    visible.forEach(function (b) {
      if (b.props.btnText) links.push(b.props.btnLink || "#order");
    });
    if (page.settings.sticky) links.push(page.settings.stickyLink || "#order");
    add(
      links.every(function (l) {
        return (
          SP.safeLink(l, "#invalid") !== "#invalid" &&
          (l[0] !== "#" || targets.has(l.slice(1)))
        );
      }),
      "Buttons have destinations",
      "Point each button at a visible section or a valid web link.",
      "error",
    );
    add(
      !!(page.settings.seoTitle && page.settings.seoDesc),
      "Share title and description",
      "Help your page look good when shared.",
    );
    return checks;
  };
  SP.openSetup = function (templateId) {
    var t =
      SP.templates.find(function (t) {
        return t.id === templateId;
      }) || SP.templates[0];
    var d = SP.dialog(
      "Make it yours",
      '<p class="studio-intro">A few details. A page that feels like your business.</p><form id="setup-form" class="setup-grid">' +
        '<div class="setup-preview"><span class="setup-step">01 / Your starting point</span><h3>' +
        esc(t.name) +
        "</h3><p>" +
        esc(t.desc) +
        '</p><div class="setup-example">Your photo.<br>Your words.<br>Your next order.</div><p class="fine">You can change every section afterward.</p></div><div class="setup-fields">' +
        '<label class="fld"><span>Business name</span><input name="business" required maxlength="100" placeholder="e.g. Dapur Amnan" autocomplete="organization"></label>' +
        '<label class="fld"><span>' +
        (t.id === "service" ? "Service" : "Product") +
        ' name</span><input name="product" required maxlength="120" placeholder="What are you selling?"></label>' +
        '<div class="setup-row"><label class="fld"><span>Price (RM)</span><input name="price" type="number" min="0" max="10000000" step="0.01" value="39" required></label><label class="fld"><span>WhatsApp number</span><input name="whatsapp" type="tel" placeholder="012-345 6789" required></label></div>' +
        '<label class="fld"><span>What makes it useful?</span><textarea name="benefit" rows="2" maxlength="500" placeholder="One honest reason to choose your product"></textarea></label>' +
        '<label class="fld"><span>Product photo <small>(optional)</small></span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"><img class="setup-photo" hidden alt="Your product preview"></label>' +
        '<label class="fld"><span>Page language</span><select name="lang"><option value="ms">Bahasa Melayu</option><option value="en">English</option></select></label>' +
        '<p class="form-error" role="alert" hidden></p><div class="setup-actions"><button class="btn primary" type="submit">Create my page ' +
        SP.icon("right") +
        '</button><button class="btn tertiary" type="button" data-skip>Use sample content</button></div></div></form>',
      true,
    );
    var photo = "",
      aiDraft = null;
    var aiButton = document.createElement("button");
    aiButton.type = "button";
    aiButton.className = "btn sm";
    aiButton.textContent = "Draft wording with AI";
    aiButton.hidden = true;
    d.find("[name=benefit]").closest("label").appendChild(aiButton);
    SP.cloud.status().then(function (status) {
      if (d.root.isConnected) aiButton.hidden = !(status.ai && SP.cloud.key());
    });
    aiButton.onclick = async function () {
      this.disabled = true;
      var er = d.find(".form-error");
      try {
        var form = d.find("form");
        aiDraft = await SP.cloud.request("copy", {
          product: form.elements.product.value,
          benefit: form.elements.benefit.value,
          lang: form.elements.lang.value,
        });
        var preview = SP.dialog(
          "Review your draft",
          "<p>Check the wording against your product facts before applying it.</p><h3>" +
            esc(aiDraft.headline) +
            "</h3><p>" +
            esc(aiDraft.sub) +
            "</p><ul>" +
            aiDraft.benefits
              .map(function (v) {
                return "<li>" + esc(v) + "</li>";
              })
              .join("") +
            '</ul><button type="button" class="btn primary" data-apply>Use this wording</button>',
        );
        preview.find("[data-apply]").onclick = function () {
          form.elements.product.value = aiDraft.headline;
          form.elements.benefit.value = aiDraft.sub;
          preview.close();
        };
      } catch (e) {
        er.textContent = e.message;
        er.hidden = false;
      }
      this.disabled = false;
    };

    d.find("[name=photo]").onchange = async function (e) {
      var file = e.target.files[0];
      if (!file) return;
      try {
        photo = await SP.readImage(file);
        var im = d.find(".setup-photo");
        im.src = photo;
        im.hidden = false;
      } catch (x) {
        var er = d.find(".form-error");
        er.textContent = "Use a JPG, PNG or WebP photo.";
        er.hidden = false;
      }
    };
    async function create(p) {
      if (!(await SP.store.put(p))) {
        throw new Error(
          "Page could not be saved. Download a backup and free some storage.",
        );
      }
      d.close();
      location.hash = "edit-" + p.id;
    }
    d.find("[data-skip]").onclick = async function () {
      try {
        await create(SP.createFromTemplate(t.id));
      } catch (e) {
        var er = d.find(".form-error");
        er.textContent = e.message;
        er.hidden = false;
      }
    };
    d.find("form").onsubmit = async function (e) {
      e.preventDefault();
      var form = e.target,
        v = function (k) {
          return form.elements[k].value.trim();
        },
        er = d.find(".form-error");
      if (!SP.validWa(v("whatsapp"))) {
        er.textContent =
          "Enter a valid WhatsApp number, including the country code for numbers outside Malaysia.";
        er.hidden = false;
        return;
      }
      var p = SP.createFromTemplate(t.id),
        en = v("lang") === "en";
      p.name = v("product");
      Object.assign(p.settings, {
        businessName: v("business"),
        whatsapp: v("whatsapp"),
        lang: v("lang"),
        seoTitle: v("product") + " · " + v("business"),
        seoDesc: v("benefit"),
        stickyText: en ? "Place an order" : "Order sekarang",
      });
      p.blocks = p.blocks.filter(function (b) {
        return ![
          "testimonials",
          "countdown",
          "guarantee",
          "bonus",
          "pricing",
          "text",
          "faq",
        ].includes(b.type);
      });
      p.blocks.forEach(function (b) {
        if (b.type === "hero")
          Object.assign(b.props, {
            headline: v("product"),
            sub: v("benefit"),
            image: photo,
            artwork: "none",
            eyebrow: v("business"),
            btnText: en ? "Choose your package" : "Pilih pakej anda",
          });
        if (b.type === "order")
          Object.assign(b.props, {
            items: [
              {
                name: v("product"),
                price: SP.nonnegative(v("price")),
                oldPrice: 0,
                desc: "",
                image: "",
                badge: "",
              },
            ],
            heading: en ? "Make it yours" : "Buat tempahan",
            sub: "",
            btnText: en ? "Order on WhatsApp" : "Order melalui WhatsApp",
            freeShipMin: 0,
            payNote: en
              ? "WhatsApp opens with your enquiry. The seller will confirm availability and payment."
              : "WhatsApp akan dibuka dengan maklumat tempahan. Penjual akan sahkan stok dan bayaran.",
            shipLabel: en ? "Delivery" : "Penghantaran",
            askSchedule: t.id === "service",
            askAddress: t.id !== "digital" && t.id !== "service",
            shipping:
              t.id === "digital" || t.id === "service"
                ? []
                : [
                    {
                      label: en ? "Delivery" : "Penghantaran",
                      fee: 0,
                      pickup: false,
                    },
                  ],
          });
        if (b.type === "footer")
          Object.assign(b.props, {
            business: v("business"),
            reg: "",
            contact: en
              ? "Get in touch on WhatsApp."
              : "Hubungi kami di WhatsApp.",
          });
        if (b.type === "benefits")
          Object.assign(b.props, {
            heading: en ? "Why choose us" : "Kenapa pilih kami",
            style: "check",
            items: [
              {
                text:
                  v("benefit") ||
                  (en
                    ? "Add a product benefit"
                    : "Tambah kelebihan produk anda"),
              },
            ],
          });
        if (b.type === "faq") b.props.items = [];
        if (b.type === "cta")
          Object.assign(b.props, {
            heading: en ? "Ready to order?" : "Sedia untuk order?",
            text: "",
            btnText: en ? "Choose your package" : "Pilih pakej anda",
          });
      });
      var seenBenefits = false;
      p.blocks = p.blocks.filter(function (b) {
        if (b.type !== "benefits") return true;
        if (seenBenefits) return false;
        seenBenefits = true;
        return true;
      });
      var button = form.querySelector("[type=submit]");
      button.disabled = true;
      try {
        await create(p);
      } catch (x) {
        er.textContent = x.message;
        er.hidden = false;
        button.disabled = false;
      }
    };
  };
  SP.openRestore = function (data, after) {
    var d = SP.dialog(
      "Restore your pages",
      '<p>Choose what happens when a page is already in this browser.</p><label class="fld"><span>Existing pages</span><select id="restore-mode"><option value="copy">Keep both — restore as a copy</option><option value="replace">Replace with the backup version</option><option value="skip">Keep existing — skip duplicates</option></select></label><p data-result role="status"></p><button class="btn primary" data-run>Restore pages</button>',
    );
    d.find("[data-run]").onclick = async function () {
      var button = this;
      button.disabled = true;
      try {
        var r = await SP.store.restoreBackup(data, d.find("select").value);
        d.find("[data-result]").textContent =
          r.restored +
          " restored · " +
          r.skipped +
          " skipped · " +
          r.failed +
          " failed";
        after();
        button.textContent = "Done";
        button.onclick = d.close;
      } catch (e) {
        d.find("[data-result]").textContent = e.message;
        button.disabled = false;
      }
    };
  };
  var recoveryKey = "nonymauz.workspace";
  SP.cloud = {
    key: function () {
      try {
        return localStorage.getItem(recoveryKey) || "";
      } catch (e) {
        return "";
      }
    },
    request: async function (action, body) {
      var r = await fetch("/api/workspace?action=" + action, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + SP.cloud.key(),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      var data = await r.json();
      if (!r.ok) throw new Error(data.error || "Cloud request failed");
      return data;
    },
    status: async function () {
      try {
        var r = await fetch("/api/workspace?action=status");
        return await r.json();
      } catch (e) {
        return { configured: false };
      }
    },
  };
  SP.openWorkspace = async function (after) {
    var d = SP.dialog(
      "Your cloud workspace",
      '<p class="studio-intro">Back up online. Continue on another device.</p><p data-status role="status">Checking availability…</p><div class="workspace-controls" hidden><label class="fld"><span>Recovery key</span><input id="workspace-key" type="password" autocomplete="off" placeholder="Paste your workspace recovery key"></label><p class="fine">This key gives access to your cloud pages. Keep it somewhere private. Use the same key on another device.</p><div class="row"><button class="btn primary" data-connect>Connect</button><button class="btn" data-create>Create workspace</button></div><div class="row"><button class="btn" data-upload>Back up all pages</button><button class="btn" data-pull>Restore cloud pages</button><button class="btn tertiary" data-disconnect>Disconnect</button></div></div>',
    );
    var st = await SP.cloud.status();
    if (!d.root.isConnected) return;
    if (!st.configured) {
      d.find("[data-status]").textContent =
        "Cloud publishing is not configured on this host yet. Your local editor, backup files and HTML exports work independently.";
      return;
    }
    d.find("[data-status]").textContent = SP.cloud.key()
      ? "Workspace connected."
      : "Create a workspace or connect with your recovery key.";
    d.find(".workspace-controls").hidden = false;
    async function action(fn) {
      try {
        d.find("[data-status]").textContent = "Working…";
        await fn();
        if (after) after();
      } catch (e) {
        d.find("[data-status]").textContent = e.message;
      }
    }
    d.find("[data-create]").onclick = function () {
      action(async function () {
        var b = new Uint8Array(32);
        crypto.getRandomValues(b);
        var key = Array.from(b)
          .map(function (x) {
            return x.toString(16).padStart(2, "0");
          })
          .join("");
        localStorage.setItem(recoveryKey, key);
        try {
          await SP.cloud.request("connect", {});
        } catch (e) {
          localStorage.removeItem(recoveryKey);
          throw e;
        }
        d.find("input").type = "text";
        d.find("input").value = key;
        d.find("[data-status]").textContent =
          "Workspace created. Save this recovery key before closing.";
      });
    };
    d.find("[data-connect]").onclick = function () {
      action(async function () {
        var key = d.find("input").value.trim();
        if (!/^[a-f0-9]{64}$/.test(key))
          throw new Error("Enter a 64-character recovery key.");
        var prev = SP.cloud.key();
        localStorage.setItem(recoveryKey, key);
        try {
          await SP.cloud.request("list");
        } catch (e) {
          if (prev) localStorage.setItem(recoveryKey, prev);
          else localStorage.removeItem(recoveryKey);
          throw e;
        }
        d.find("[data-status]").textContent = "Workspace connected.";
      });
    };
    d.find("[data-upload]").onclick = function () {
      action(async function () {
        var n = 0;
        for (var p of SP.store.all()) {
          await SP.cloud.request("save", { page: p });
          n++;
        }
        d.find("[data-status]").textContent = n + " pages backed up online.";
      });
    };
    d.find("[data-pull]").onclick = function () {
      action(async function () {
        var result = await SP.cloud.request("list");
        var pages = [];
        for (var item of result.pages) {
          var r = await SP.cloud.request("load", { id: item.id });
          pages.push(r.page);
        }
        SP.openRestore(
          { app: "nonymauz", version: 1, pages: pages },
          after || function () {},
        );
        d.close();
      });
    };
    d.find("[data-disconnect]").onclick = function () {
      localStorage.removeItem(recoveryKey);
      d.close();
      if (after) after();
    };
  };
  SP.openHistory = async function (page, onRestore) {
    var vs = await SP.store.versions(page.id),
      d = SP.dialog(
        "Version history",
        '<p>Recent saved versions stay on this device. Restore one to continue editing; your current page is saved first.</p><div class="version-list">' +
          (vs.length
            ? vs
                .map(function (v, i) {
                  return (
                    '<button class="version-row" data-version="' +
                    i +
                    '"><span>' +
                    new Date(v.at).toLocaleString() +
                    "</span><span>" +
                    esc(v.page.name) +
                    " " +
                    SP.icon("undo") +
                    "</span></button>"
                  );
                })
                .join("")
            : "<p>No recovery snapshots yet.</p>") +
          "</div>",
      );
    d.root.querySelectorAll("[data-version]").forEach(function (b) {
      b.onclick = async function () {
        try {
          var p = await SP.store.recover(vs[+b.dataset.version]);
          await onRestore(p);
          d.close();
        } catch (e) {
          var er = document.createElement("p");
          er.setAttribute("role", "alert");
          er.textContent = e.message;
          d.find(".modal").appendChild(er);
        }
      };
    });
  };
  SP.openPublish = async function (page, refresh) {
    var checks = SP.launchChecks(page),
      errors = checks.filter(function (c) {
        return !c.ok && c.level === "error";
      });
    var d = SP.dialog(
      "Ready for your next order?",
      '<p class="studio-intro">Check the details. Share with confidence.</p><div class="publish-layout"><div><h3>Launch check</h3><div class="launch-list">' +
        checks
          .map(function (c) {
            return (
              '<div class="launch-item ' +
              (c.ok ? "pass" : c.level) +
              '"><span class="check-icon">' +
              (c.ok ? "✓" : c.level === "error" ? "!" : "○") +
              "</span><div><b>" +
              esc(c.title) +
              "</b>" +
              (!c.ok ? "<p>" + esc(c.detail) + "</p>" : "") +
              "</div></div>"
            );
          })
          .join("") +
        '</div><label class="switch review-confirm"><input type="checkbox" ' +
        (page.settings.reviewsConfirmed ? "checked" : "") +
        '><span class="knob"></span><span>I checked the copy and customer reviews</span></label></div><div class="publish-destination"><span class="setup-step">Your public page</span><h3>' +
        (page.publish && page.publish.slug
          ? "Update your live page"
          : "A link you can share") +
        '</h3><p>Publish here, then share the same link in your bio, status and ads.</p><p data-cloud role="status">Checking publishing…</p><div class="pub-link" hidden></div><button class="btn primary" data-live disabled>Publish page ' +
        SP.icon("right") +
        '</button><button class="btn" data-workspace>Cloud workspace</button><div data-releases></div><hr><h3>Take your page with you</h3><p class="fine">A standalone HTML file for your own hosting.</p><div class="row"><button class="btn" data-download>Download HTML</button><button class="btn tertiary" data-copy>Copy code</button></div></div></div>',
      true,
    );
    d.find(".review-confirm input").onchange = function () {
      page.settings.reviewsConfirmed = this.checked;
      refresh();
    };
    d.find("[data-download]").onclick = function () {
      SP.download(SP.slug(page.name) + ".html", SP.exportHTML(page));
    };
    d.find("[data-copy]").onclick = async function () {
      try {
        await navigator.clipboard.writeText(SP.exportHTML(page));
        this.textContent = "Copied";
      } catch (e) {
        d.find("[data-cloud]").textContent =
          "Clipboard unavailable. Download the HTML instead.";
      }
    };
    d.find("[data-workspace]").onclick = function () {
      SP.openWorkspace(function () {
        refresh();
        d.close();
        SP.openPublish(page, refresh);
      });
    };
    function showURL(slug) {
      var box = d.find(".pub-link");
      box.hidden = false;
      box.textContent = "";
      var a = document.createElement("a");
      a.href = "/p/" + slug;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = location.origin + "/p/" + slug;
      box.appendChild(a);
    }
    if (page.publish && page.publish.slug) showURL(page.publish.slug);
    var status = await SP.cloud.status();
    if (!d.root.isConnected) return;
    d.find("[data-cloud]").textContent = !status.configured
      ? "Hosting setup needed. Connect cloud storage on Vercel to enable publishing."
      : !SP.cloud.key()
        ? "Connect your cloud workspace to publish."
        : errors.length
          ? "Fix the WhatsApp, order form or button errors before publishing."
          : "Ready to publish. Your existing link stays the same.";
    d.find("[data-live]").disabled =
      !status.configured || !SP.cloud.key() || errors.length > 0;
    async function releases() {
      if (!page.publish || !SP.cloud.key()) return;
      try {
        var result = await SP.cloud.request("releases", { id: page.id });
        var box = d.find("[data-releases]");
        box.innerHTML =
          "<h4>Published versions</h4>" +
          result.releases
            .map(function (r) {
              return (
                '<button class="version-row" data-release="' +
                esc(r.id) +
                '"><span>' +
                new Date(r.at).toLocaleString() +
                "</span><span>Restore live</span></button>"
              );
            })
            .join("");
        box.querySelectorAll("button").forEach(function (b) {
          b.onclick = async function () {
            b.disabled = true;
            try {
              await SP.cloud.request("rollback", {
                id: page.id,
                release: b.dataset.release,
              });
              d.find("[data-cloud]").textContent =
                "Live page restored. Your editor draft is unchanged.";
            } catch (e) {
              d.find("[data-cloud]").textContent = e.message;
            }
            b.disabled = false;
          };
        });
      } catch (e) {
        d.find("[data-cloud]").textContent = e.message;
      }
    }
    d.find("[data-live]").onclick = async function () {
      this.disabled = true;
      try {
        var r = await SP.cloud.request("publish", { page: page });
        page.publish = { slug: r.slug, at: r.at };
        refresh();
        showURL(r.slug);
        d.find("[data-cloud]").textContent =
          "Your page is live. Share the link above.";
        this.textContent = "Update live page";
        await releases();
      } catch (e) {
        d.find("[data-cloud]").textContent = e.message;
      }
      this.disabled = false;
    };
    if (status.configured) await releases();
  };
  SP.openInsights = async function (page) {
    var d = SP.dialog(
      "Page activity",
      '<p class="studio-intro">See how visitors move toward an enquiry.</p><p data-status role="status">Loading…</p><div data-insights></div>',
      true,
    );
    try {
      var r = await SP.cloud.request("stats", { id: page.id });
      if (!d.root.isConnected) return;
      d.find("[data-status]").textContent =
        "Visits and handoffs are activity signals. They do not confirm a sent message, payment or completed sale.";
      d.find("[data-insights]").innerHTML =
        '<div class="studio-stats">' +
        [
          ["Visits", r.stats.visit || 0],
          ["CTA clicks", r.stats.cta || 0],
          ["WhatsApp handoffs", r.stats.whatsapp || 0],
        ]
          .map(function (x) {
            return (
              "<div><span>" +
              x[0] +
              "</span><strong>" +
              x[1] +
              "</strong></div>"
            );
          })
          .join("") +
        '</div><h3>Recent order enquiries</h3><p class="fine">Customer details appear only when enquiry capture is enabled before publishing.</p><div class="enquiry-list">' +
        (r.orders.length
          ? r.orders
              .map(function (o) {
                return (
                  "<details><summary><b>" +
                  esc(o.customer.name) +
                  "</b><span>" +
                  esc(SP.money(o.total)) +
                  " · " +
                  new Date(o.at).toLocaleString() +
                  "</span></summary><p>" +
                  esc(o.customer.phone) +
                  "</p><p>" +
                  esc(o.customer.address || "") +
                  "</p><p>" +
                  esc(
                    o.items
                      .map(function (i) {
                        return i.quantity + " × " + i.name;
                      })
                      .join(", "),
                  ) +
                  "</p><p>" +
                  esc(o.customer.note || "") +
                  "</p></details>"
                );
              })
              .join("")
          : "<p>No recorded enquiries yet.</p>") +
        "</div>";
    } catch (e) {
      d.find("[data-status]").textContent = SP.cloud.key()
        ? e.message
        : "Connect a cloud workspace and publish this page to see activity.";
    }
  };
})(window.SP);
