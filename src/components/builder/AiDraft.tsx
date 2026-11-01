"use client";
/* "Draft with AI" for the headline section. Shown only when the server has AI set up.
   The seller always reviews the draft before anything on the page changes. */
import { useEffect, useState } from "react";
import type { Page } from "@/lib/types";
import type { Draft } from "@/lib/ai-copy";
import type { Mutate } from "./Fields";
import { useToast } from "./ui";

let enabledCheck: Promise<boolean> | null = null;
const aiEnabled = () =>
  (enabledCheck ??= fetch("/api/ai/draft")
    .then((r) => r.json())
    .then((j) => !!j.enabled)
    .catch(() => false));

export function AiDraft({
  page,
  blockId,
  mutate,
}: {
  page: Page;
  blockId: string;
  mutate: Mutate;
}) {
  const toast = useToast();
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [f, setF] = useState({
    product: page.settings.businessName || "",
    benefit: "",
    audience: "",
  });
  useEffect(() => {
    let live = true;
    aiEnabled().then((v) => live && setOn(v));
    return () => {
      live = false;
    };
  }, []);
  if (!on) return null;
  // Benefits go into the first ticked point list, never a list of problems (crosses).
  const list = page.blocks.find(
    (b) =>
      b.type === "benefits" &&
      !b.hidden &&
      (b.props.style || "check") === "check",
  );

  async function run() {
    setErr("");
    if (f.product.trim().length < 2) return setErr("Say what you sell first.");
    setBusy(true);
    try {
      const r = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, lang: page.settings.lang }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) setErr(j.error || "AI is unavailable right now.");
      else setDraft(j.draft);
    } catch {
      setErr("Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!draft) return;
    mutate(null, (d) => {
      const hero = d.blocks.find((b) => b.id === blockId);
      if (hero)
        Object.assign(hero.props, { headline: draft.headline, sub: draft.sub });
      const pts = list && d.blocks.find((b) => b.id === list.id);
      if (pts) pts.props.items = draft.benefits.map((text) => ({ text }));
    });
    setDraft(null);
    setOpen(false);
    toast(
      "Draft added. Edit anything you like; Undo brings the old text back.",
    );
  }

  const fld = (k: keyof typeof f, label: string, ph: string) => (
    <div className="fld">
      <label htmlFor={"ai-" + k}>{label}</label>
      <input
        id={"ai-" + k}
        value={f[k]}
        placeholder={ph}
        maxLength={k === "benefit" ? 400 : 200}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="ai-draft">
      {!open ? (
        <button type="button" className="btn sm" onClick={() => setOpen(true)}>
          Draft with AI
        </button>
      ) : (
        <>
          <div className="ai-draft-h">
            <b>Draft with AI</b>
            <span className="fld-hint">
              Uses only what you write here. Check every claim before you
              publish.
            </span>
          </div>
          {fld(
            "product",
            "What do you sell?",
            "e.g. Sambal hitam Mak Long, 250g jar",
          )}
          {fld(
            "benefit",
            "What makes it good?",
            "e.g. Pedas sedang, tiada pengawet, sesuai dengan nasi lemak",
          )}
          {fld(
            "audience",
            "Who buys it? (optional)",
            "e.g. Working parents in Klang Valley",
          )}
          {err && (
            <p className="fld-hint ai-err" role="alert">
              {err}
            </p>
          )}
          {draft && (
            <div className="ai-out" aria-live="polite">
              <b>{draft.headline}</b>
              <p>{draft.sub}</p>
              <ul>
                {draft.benefits.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
              {!list && (
                <p className="fld-hint">
                  Add a Point list with ticks to use the benefits too.
                </p>
              )}
              <div className="ai-row">
                <button
                  type="button"
                  className="btn sm primary"
                  onClick={apply}
                >
                  Use this
                </button>
                <button
                  type="button"
                  className="btn sm tertiary"
                  onClick={() => setDraft(null)}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
          <div className="ai-row">
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={run}
            >
              {busy ? "Writing…" : draft ? "Try another" : "Write a draft"}
            </button>
            <button
              type="button"
              className="btn sm tertiary"
              onClick={() => {
                setOpen(false);
                setDraft(null);
                setErr("");
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}
