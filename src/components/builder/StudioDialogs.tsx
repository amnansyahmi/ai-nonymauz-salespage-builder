"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { Page } from "@/lib/types";
import { buildTemplate, TEMPLATES } from "@/lib/templates";
import { makeBlock } from "@/lib/blocks";
import {
  store,
  shrinkImage,
  restoreBackup,
  storageOwner,
  pageActivity,
} from "@/lib/store";
import { localPages } from "@/lib/local-pages";
import { downloadJSON, money, nonnegative, validWhatsApp } from "@/lib/format";
import { Icon } from "./ui";

export function StudioModal({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("button,input,select,textarea")
      ?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
      }
      if (e.key === "Tab") {
        const els = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input,select,textarea,a[href]",
          ) || [],
        ).filter((el) => el.getClientRects().length);
        const first = els[0],
          last = els[els.length - 1];
        if (!first) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay modal-wrap"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={"modal studio-modal" + (wide ? " wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function SetupDialog({
  templateId,
  onClose,
}: {
  templateId: string;
  onClose: () => void;
}) {
  const router = useRouter(),
    t = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState(""),
    [photoBusy, setPhotoBusy] = useState(false);
  const [form, setForm] = useState({
    business: "",
    product: "",
    price: "39",
    delivery: "8",
    whatsapp: "",
    benefit: "",
    lang: "ms",
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((x) => ({ ...x, [key]: e.target.value }));
  async function create(sample = false) {
    setBusy(true);
    setError("");
    try {
      const p = buildTemplate(templateId);
      if (!sample) {
        if (!validWhatsApp(form.whatsapp))
          throw new Error(
            "Enter a valid WhatsApp number, with a country code for numbers outside Malaysia.",
          );
        const en = form.lang === "en",
          service = templateId === "service",
          digital = templateId === "digital";
        p.name = form.product.trim();
        Object.assign(p.settings, {
          businessName: form.business.trim(),
          whatsapp: form.whatsapp,
          lang: en ? "en" : "ms",
          seoTitle: form.product + " · " + form.business,
          seoDesc: form.benefit,
          stickyText: en ? "Place an order" : "Order sekarang",
        });
        const hero =
            p.blocks.find((b) => b.type === "hero") || makeBlock("hero"),
          order =
            p.blocks.find((b) => b.type === "order") || makeBlock("order"),
          footer =
            p.blocks.find((b) => b.type === "footer") || makeBlock("footer");
        Object.assign(hero.props, {
          headline: form.product,
          sub: form.benefit,
          image: photo,
          artwork: "none",
          eyebrow: form.business,
          btnText: en ? "Choose your package" : "Pilih pakej anda",
        });
        Object.assign(order.props, {
          items: [
            {
              name: form.product,
              price: nonnegative(form.price),
              oldPrice: 0,
              desc: "",
              badge: "",
              image: "",
            },
          ],
          heading: en ? "Place an enquiry" : "Buat tempahan",
          sub: "",
          btnText: en ? "Order on WhatsApp" : "Order melalui WhatsApp",
          askSchedule: service,
          askAddress: !service && !digital,
          freeShipMin: 0,
          shipping:
            service || digital
              ? []
              : [
                  {
                    label: en ? "Delivery" : "Penghantaran",
                    fee: nonnegative(form.delivery),
                    pickup: false,
                  },
                ],
          shipLabel: en ? "Delivery" : "Penghantaran",
          payNote: en
            ? "The seller will confirm availability and payment on WhatsApp."
            : "Penjual akan sahkan stok dan bayaran melalui WhatsApp.",
        });
        Object.assign(footer.props, {
          business: form.business,
          reg: "",
          contact: en
            ? "Get in touch on WhatsApp."
            : "Hubungi kami di WhatsApp.",
        });
        p.blocks = [
          hero,
          ...(form.benefit
            ? [
                makeBlock("benefits", {
                  heading: en ? "Why choose us" : "Kenapa pilih kami",
                  items: [{ text: form.benefit }],
                  bg: "soft",
                }),
              ]
            : []),
          order,
          makeBlock("cta", {
            heading: en ? "Ready to order?" : "Sedia untuk order?",
            text: "",
            btnText: en ? "Order now" : "Order sekarang",
            btnLink: "#order",
            bg: "primary",
          }),
          footer,
        ];
      }
      const created = await store.create(p);
      onClose();
      router.push("/edit/" + created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create your page.");
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    await create();
  }
  return (
    <StudioModal title="Make it yours" onClose={onClose} wide>
      <p className="studio-intro">
        A few details. A page that feels like your business.
      </p>
      <form className="setup-grid" onSubmit={submit}>
        <div className="setup-preview">
          <span className="setup-step">01 / Your starting point</span>
          <h3>{t.name}</h3>
          <p>{t.desc}</p>
          <div className="setup-example">
            Your photo.
            <br />
            Your words.
            <br />
            Your next order.
          </div>
          <p className="fine">You can change every section afterward.</p>
        </div>
        <div className="setup-fields">
          <label className="fld">
            <span>Business name</span>
            <input
              required
              maxLength={100}
              autoComplete="organization"
              placeholder="e.g. Dapur Amnan"
              value={form.business}
              onChange={set("business")}
            />
          </label>
          <label className="fld">
            <span>Product or service name</span>
            <input
              required
              maxLength={120}
              placeholder="What are you selling?"
              value={form.product}
              onChange={set("product")}
            />
          </label>
          <div className="setup-row">
            <label className="fld">
              <span>Price (RM)</span>
              <input
                required
                type="number"
                min={0}
                max={1000000}
                step="0.01"
                value={form.price}
                onChange={set("price")}
              />
            </label>
            <label className="fld">
              <span>WhatsApp number</span>
              <input
                required
                type="tel"
                placeholder="012-345 6789"
                value={form.whatsapp}
                onChange={set("whatsapp")}
              />
            </label>
          </div>
          <label className="fld">
            <span>What makes it useful?</span>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="One honest reason to choose your product"
              value={form.benefit}
              onChange={set("benefit")}
            />
          </label>
          {!["service", "digital"].includes(templateId) && (
            <label className="fld">
              <span>Delivery fee (RM)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.delivery}
                onChange={set("delivery")}
              />
            </label>
          )}
          <label className="fld">
            <span>Product photo (optional)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={photoBusy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPhotoBusy(true);
                try {
                  setPhoto(await store.uploadImage(await shrinkImage(file)));
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not read this photo.",
                  );
                } finally {
                  setPhotoBusy(false);
                }
              }}
            />
            {photo && (
              <img
                src={photo}
                className="setup-photo"
                alt="Your product preview"
              />
            )}
          </label>
          <label className="fld">
            <span>Page language</span>
            <select value={form.lang} onChange={set("lang")}>
              <option value="ms">Bahasa Melayu</option>
              <option value="en">English</option>
            </select>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="setup-actions">
            <button className="btn primary" disabled={busy || photoBusy}>
              {busy ? "Creating…" : "Create my page"}
              <Icon name="link" />
            </button>
            <button
              className="btn tertiary"
              type="button"
              disabled={busy || photoBusy}
              onClick={() => create(true)}
            >
              Use sample content
            </button>
          </div>
        </div>
      </form>
    </StudioModal>
  );
}
export function RestoreDialog({
  data,
  onClose,
  onDone,
}: {
  data: unknown;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"copy" | "replace" | "skip">("copy"),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState("");
  return (
    <StudioModal title="Restore your pages" onClose={onClose}>
      <p>
        Choose what happens when a page already exists in this account or
        browser.
      </p>
      <label className="fld">
        <span>Existing pages</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          <option value="copy">Keep both — restore as a copy</option>
          <option value="replace">Replace with the backup version</option>
          <option value="skip">Keep existing — skip duplicates</option>
        </select>
      </label>
      <p role="status">{result}</p>
      <button
        className="btn primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await restoreBackup(data, mode);
            setResult(
              `${r.restored} restored · ${r.skipped} skipped · ${r.failed} failed`,
            );
            onDone();
          } catch (e) {
            setResult(e instanceof Error ? e.message : "Restore failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Restore pages
      </button>
    </StudioModal>
  );
}
export function HistoryDialog({
  page,
  onClose,
  onRestore,
}: {
  page: Page;
  onClose: () => void;
  onRestore: (p: Page) => Promise<void>;
}) {
  const [versions, setVersions] = useState<
      Awaited<ReturnType<typeof localPages.versions>>
    >([]),
    [err, setErr] = useState("");
  useEffect(() => {
    let active = true;
    storageOwner()
      .then((owner) => localPages.versions(owner, page.id))
      .then((v) => {
        if (active) setVersions(v);
      })
      .catch((e) => {
        if (active) setErr(e.message);
      });
    return () => {
      active = false;
    };
  }, [page.id]);
  return (
    <StudioModal title="Version history" onClose={onClose}>
      <p>
        Recent recovery versions on this device. Restoring changes your draft;
        the public page stays unchanged until you publish.
      </p>
      {err && <p role="alert">{err}</p>}
      <div className="version-list">
        {versions.map((v) => (
          <button
            className="version-row"
            key={v.key}
            onClick={async () => {
              try {
                await onRestore(v.page);
                onClose();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Could not restore.");
              }
            }}
          >
            <span>{new Date(v.at).toLocaleString()}</span>
            <span>
              {v.page.name}
              <Icon name="undo" />
            </span>
          </button>
        ))}
        {!versions.length && <p>No earlier device versions yet.</p>}
      </div>
      <button
        className="btn"
        onClick={() =>
          downloadJSON("nonymauz-recovery.json", {
            app: "nonymauz",
            version: 2,
            pages: [page],
          })
        }
      >
        Download current draft
      </button>
    </StudioModal>
  );
}
export function ActivityDialog({
  page,
  onClose,
}: {
  page: Page;
  onClose: () => void;
}) {
  const [counts, setCounts] = useState({ visits: 0, cta: 0, whatsapp: 0 }),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    pageActivity(page.id)
      .then((rows) => {
        if (active)
          setCounts(
            rows.reduce(
              (a, r) => ({
                visits: a.visits + r.visits,
                cta: a.cta + r.cta,
                whatsapp: a.whatsapp + r.whatsapp,
              }),
              { visits: 0, cta: 0, whatsapp: 0 },
            ),
          );
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [page.id]);
  return (
    <StudioModal title="Page activity" onClose={onClose}>
      <p>
        Visits and handoffs are activity signals. They do not confirm a
        delivered message, payment, or completed sale.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="studio-stats">
        {Object.entries(counts).map(([name, value]) => (
          <div key={name}>
            <span>
              {name === "whatsapp"
                ? "WhatsApp handoffs"
                : name === "cta"
                  ? "CTA clicks"
                  : "Visits"}
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="fine">
        Recorded checkout enquiries remain available in Orders.
      </p>
    </StudioModal>
  );
}
