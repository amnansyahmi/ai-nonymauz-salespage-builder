"use client";
/* Preview (the real buyer page in a frame) and Publish (one click to a live link). */
import { useEffect, useRef, useState } from "react";
import type { Page } from "@/lib/types";
import { store, publishedVersions, rollbackPublished } from "@/lib/store";
import { slugify } from "@/lib/format";
import { launchChecks } from "@/lib/launch";
import { StudioModal } from "./StudioDialogs";
import { copyText, Icon, useToast } from "./ui";

function useEscape(onClose: () => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
}

export function PreviewOverlay({
  page,
  device,
  onClose,
}: {
  page: Page;
  device: "desktop" | "mobile";
  onClose: () => void;
}) {
  const [dev, setDev] = useState(device);
  const [stamp] = useState(() => Date.now());
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscape(onClose);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  return (
    <div
      className="overlay preview"
      role="dialog"
      aria-modal="true"
      aria-label="Preview"
    >
      <div className="ov-bar">
        <h2>Preview</h2>
        <span className="ov-note">
          Exactly what buyers see. The order form and buttons work.
        </span>
        <div className="seg">
          <button
            type="button"
            className={dev === "desktop" ? "on" : ""}
            onClick={() => setDev("desktop")}
          >
            <Icon name="desktop" />
            <span>Computer</span>
          </button>
          <button
            type="button"
            className={dev === "mobile" ? "on" : ""}
            onClick={() => setDev("mobile")}
          >
            <Icon name="mobile" />
            <span>Phone</span>
          </button>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="btn primary"
          onClick={onClose}
        >
          Back to editing
        </button>
      </div>
      <div className="ov-body">
        <div className={"pv-frame" + (dev === "mobile" ? " mobile" : "")}>
          <iframe
            title={"Preview of " + page.name}
            src={`/preview/${page.id}?v=${stamp}`}
          />
        </div>
      </div>
    </div>
  );
}

export function PublishDialog({
  page,
  onClose,
  onPublished,
  onReviewed,
}: {
  page: Page;
  onClose: () => void;
  onPublished: (slug: string | null) => void;
  onReviewed: (value: boolean) => void;
}) {
  const toast = useToast(),
    [slug, setSlug] = useState(
      page.slug || slugify(page.settings.businessName || page.name),
    ),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const [releases, setReleases] = useState<
    { id: string; created_at: string }[]
  >([]);
  const checks = launchChecks(page),
    blocked = checks.some((c) => c.blocking && !c.ok),
    origin = typeof window !== "undefined" ? location.origin : "";
  useEffect(() => {
    let active = true;
    if (store.mode === "cloud" && page.slug)
      publishedVersions(page.id)
        .then((v) => {
          if (active) setReleases(v);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [page.id, page.slug]);
  async function publish() {
    setBusy(true);
    setErr("");
    try {
      const result = await store.publish(page, slug);
      if (!result.ok) throw new Error(result.error);
      onPublished(result.slug);
      toast("Your live page is updated");
      setReleases(await publishedVersions(page.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not publish. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function unpublish() {
    setBusy(true);
    try {
      await store.unpublish(page);
      onPublished(null);
      toast("Page taken offline. Recorded orders are retained.");
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "Could not take the page offline.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <StudioModal title="Ready for your next order?" onClose={onClose} wide>
      <p className="studio-intro">Check the details. Share with confidence.</p>
      <div className="publish-layout">
        <div>
          <h3>Launch check</h3>
          <div className="launch-list">
            {checks.map((c) => (
              <div
                key={c.key}
                className={
                  "launch-item " +
                  (c.ok ? "pass" : c.blocking ? "error" : "warning")
                }
              >
                <span className="check-icon">
                  {c.ok ? "✓" : c.blocking ? "!" : "○"}
                </span>
                <div>
                  <b>{c.title}</b>
                  {!c.ok && <p>{c.detail}</p>}
                </div>
              </div>
            ))}
          </div>
          <label className="switch review-confirm">
            <input
              type="checkbox"
              checked={!!page.settings.reviewsConfirmed}
              onChange={(e) => onReviewed(e.target.checked)}
            />
            <span className="knob" />
            <span>I checked the copy and customer reviews</span>
          </label>
        </div>
        <div className="publish-destination">
          <span className="setup-step">Your public page</span>
          <h3>
            {page.published ? "Update your live page" : "A link you can share"}
          </h3>
          {store.mode === "demo" ? (
            <p>
              Demo mode keeps pages on this device. Connect the Neon database to enable
              publishing with your account.
            </p>
          ) : (
            <>
              <label className="fld">
                <span>Page link</span>
                <div className="slug-row">
                  <span className="slug-pre">
                    {origin.replace(/^https?:\/\//, "")}/
                  </span>
                  <input
                    aria-label="Page link"
                    value={slug}
                    readOnly={!!page.slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-"),
                      )
                    }
                  />
                </div>
              </label>
              <p className="fine">
                {page.slug
                  ? "Your address stays the same across updates and when taking the page offline."
                  : "Choose a short address with letters, numbers and dashes."}
              </p>
              {page.published && page.slug && (
                <div className="pub-link">
                  <a href={"/" + page.slug} target="_blank" rel="noopener">
                    {origin}/{page.slug}
                  </a>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={async () =>
                      toast(
                        (await copyText(origin + "/" + page.slug))
                          ? "Link copied"
                          : "Select the link to copy it.",
                      )
                    }
                  >
                    Copy link
                  </button>
                </div>
              )}
              <button
                type="button"
                className="btn primary"
                onClick={publish}
                disabled={busy || blocked || !slug}
              >
                {busy
                  ? "Working…"
                  : page.published
                    ? "Update live page"
                    : "Publish page"}
                <Icon name="globe" />
              </button>
              {page.published && (
                <button
                  type="button"
                  className="btn tertiary danger"
                  onClick={unpublish}
                  disabled={busy}
                >
                  Take offline
                </button>
              )}
              <p className="fine">
                Edits stay private until you publish. Taking a page offline
                keeps its recorded orders.
              </p>
              {releases.length > 0 && (
                <div>
                  <h4>Published versions</h4>
                  {releases.map((r) => (
                    <button
                      type="button"
                      className="version-row"
                      key={r.id}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await rollbackPublished(page.id, r.id);
                          toast(
                            "Live version restored. Your draft is unchanged.",
                          );
                          onPublished(page.slug);
                          setReleases(await publishedVersions(page.id));
                        } catch (e) {
                          setErr(
                            e instanceof Error
                              ? e.message
                              : "Could not restore.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      <span>Restore live</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {err && (
            <p className="form-error" role="alert">
              {err}
            </p>
          )}
        </div>
      </div>
    </StudioModal>
  );
}
