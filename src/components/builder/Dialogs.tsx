'use client';
/* Preview (the real buyer page in a frame) and Publish (one click to a live link). */
import { useEffect, useRef, useState } from 'react';
import type { Page } from '@/lib/types';
import { store } from '@/lib/store';
import { slugify, waNumber } from '@/lib/format';
import { copyText, Icon, useToast } from './ui';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
}

export function PreviewOverlay({ page, device, onClose }: { page: Page; device: 'desktop' | 'mobile'; onClose: () => void }) {
  const [dev, setDev] = useState(device);
  const [stamp] = useState(() => Date.now());
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscape(onClose);
  useEffect(() => { closeRef.current?.focus(); }, []);
  return (
    <div className="overlay preview" role="dialog" aria-modal="true" aria-label="Preview">
      <div className="ov-bar">
        <h2>Preview</h2>
        <span className="ov-note">Exactly what buyers see. The order form and buttons work.</span>
        <div className="seg">
          <button type="button" className={dev === 'desktop' ? 'on' : ''} onClick={() => setDev('desktop')}><Icon name="desktop" /><span>Computer</span></button>
          <button type="button" className={dev === 'mobile' ? 'on' : ''} onClick={() => setDev('mobile')}><Icon name="mobile" /><span>Phone</span></button>
        </div>
        <button ref={closeRef} type="button" className="btn primary" onClick={onClose}>Back to editing</button>
      </div>
      <div className="ov-body">
        <div className={'pv-frame' + (dev === 'mobile' ? ' mobile' : '')}>
          <iframe title={'Preview of ' + page.name} src={`/preview/${page.id}?v=${stamp}`} />
        </div>
      </div>
    </div>
  );
}

export function PublishDialog({ page, onClose, onPublished }: { page: Page; onClose: () => void; onPublished: (slug: string | null) => void }) {
  const toast = useToast();
  const [slug, setSlug] = useState(page.slug || slugify(page.settings.businessName || page.name));
  const [state, setState] = useState<'idle' | 'busy' | 'done'>(page.published ? 'done' : 'idle');
  const [err, setErr] = useState('');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const firstRef = useRef<HTMLInputElement>(null);
  useEscape(onClose);
  useEffect(() => { firstRef.current?.focus(); }, []);

  const warn: string[] = [];
  if (!waNumber(page.settings.whatsapp) && page.blocks.some((b) => b.type === 'order')) warn.push('Add your WhatsApp number in Page settings, or orders will have nowhere to go.');
  if (page.blocks.some((b) => b.type === 'hero' && !b.props.image)) warn.push('Your headline has no product photo yet. Pages with a real photo sell better.');

  async function publish() {
    setErr(''); setState('busy');
    const res = await store.publish(page, slug.trim().toLowerCase());
    if (!res.ok) { setErr(res.error); setState('idle'); return; }
    setState('done'); onPublished(res.slug); toast(page.published ? 'Live page updated' : 'Your page is live');
  }
  async function unpublish() {
    await store.unpublish(page); onPublished(null); setState('idle'); toast('Page taken offline');
  }
  const live = `${origin}/${page.slug || slug}`;

  return (
    <div className="overlay modal-wrap" role="dialog" aria-modal="true" aria-labelledby="pub-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2 id="pub-title">{page.published ? 'Your page is live' : 'Put your page online'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {warn.length > 0 && <div className="notice" role="note">{warn.map((w) => <p key={w}>{w}</p>)}</div>}
        {store.mode === 'demo' ? (
          <p>Publishing needs the online version with accounts. This copy runs in demo mode and keeps pages in this browser only. Ask your admin to connect Supabase (see the README).</p>
        ) : (
          <>
            <div className="fld">
              <label className="fld-label" htmlFor="slug">Your page link</label>
              <div className="slug-row">
                <span className="slug-pre">{origin.replace(/^https?:\/\//, '')}/</span>
                <input id="slug" ref={firstRef} value={slug} spellCheck={false} aria-describedby="slug-h"
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
              </div>
              <p className="fld-hint" id="slug-h">Letters, numbers and dashes. Share this link on WhatsApp, Facebook and TikTok.</p>
            </div>
            {err && <p className="login-err" role="alert">{err}</p>}
            {state === 'done' && page.slug && (
              <div className="live-box">
                <a href={live} target="_blank" rel="noopener" className="livelink">{live.replace(/^https?:\/\//, '')}</a>
                <div className="pub-acts">
                  <button type="button" className="btn sm" onClick={async () => toast((await copyText(live)) ? 'Link copied' : 'Copy blocked. Select the link and copy it.')}><Icon name="copy" />Copy link</button>
                  <a className="btn sm" href={live} target="_blank" rel="noopener"><Icon name="globe" />Open</a>
                </div>
              </div>
            )}
            <div className="pub-acts">
              <button type="button" className="btn primary" onClick={publish} disabled={state === 'busy' || !slug}>
                <Icon name="globe" />{state === 'busy' ? 'Publishing…' : page.published ? 'Update live page' : 'Publish'}
              </button>
              {page.published && <button type="button" className="btn tertiary danger" onClick={unpublish}>Take offline</button>}
            </div>
            <p className="fine">Edits stay private until you press {page.published ? 'Update live page' : 'Publish'}.</p>
          </>
        )}
      </div>
    </div>
  );
}
