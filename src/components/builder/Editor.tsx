'use client';
/* The builder: section library (left), the live page canvas (centre), the edit panel (right).
   On phones the side panels become bottom sheets. Changes autosave; undo/redo keep 80 steps. */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import SalesPage from '@/components/page/SalesPage';
import type { Block, BlockType, Page } from '@/lib/types';
import { BLOCKS, LIBRARY_GROUPS, makeBlock } from '@/lib/blocks';
import { pageFacts } from '@/lib/page';
import { store } from '@/lib/store';
import { clone, uid } from '@/lib/format';
import { Icon, useToast } from './ui';
import { BlockPanel, PageSettings, type Mutate } from './Fields';
import { PreviewOverlay, PublishDialog } from './Dialogs';

type Drag = { type?: BlockType; move?: string } | null;

export default function Editor({ id }: { id: string }) {
  const toast = useToast();
  const [page, setPage] = useState<Page | null>(null);
  const [missing, setMissing] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [drawer, setDrawer] = useState<'lib' | 'insp' | null>(null);
  const [saveState, setSaveState] = useState<{ text: string; err?: boolean }>({ text: 'Saved' });
  const [overlay, setOverlay] = useState<'preview' | 'publish' | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const hist = useRef<string[]>([]);
  const fut = useRef<string[]>([]);
  const last = useRef<{ key: string | null; t: number }>({ key: null, t: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pageRef = useRef<Page | null>(null);
  const drag = useRef<Drag>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const [, force] = useState(0);
  pageRef.current = page;

  useEffect(() => {
    store.get(id).then((p) => (p ? setPage(p) : setMissing(true))).catch(() => setMissing(true));
  }, [id]);
  useEffect(() => { if (page) document.title = page.name + ' · Nonymauz'; }, [page?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNow = useCallback(async () => {
    clearTimeout(saveTimer.current);
    const p = pageRef.current;
    if (!p) return;
    try {
      await store.save(p);
      setSaveState({ text: 'Saved ' + new Date().toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' }) });
    } catch (e: any) {
      setSaveState({ text: 'Not saved', err: true });
      toast(e.message || 'Could not save. Check your connection.');
    }
  }, [toast]);
  const scheduleSave = () => { setSaveState({ text: 'Saving…' }); clearTimeout(saveTimer.current); saveTimer.current = setTimeout(saveNow, 700); };
  useEffect(() => {
    const flush = () => { if (saveTimer.current) saveNow(); };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [saveNow]);

  const mutate: Mutate = useCallback((key, fn) => {
    const cur = pageRef.current;
    if (!cur) return;
    const now = Date.now();
    if (!(key && key === last.current.key && now - last.current.t < 900)) {
      hist.current.push(JSON.stringify(cur));
      if (hist.current.length > 80) hist.current.shift();
      fut.current = [];
    }
    last.current = { key, t: now };
    const draft = clone(cur);
    fn(draft);
    pageRef.current = draft;
    setPage(draft);
    scheduleSave();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const restore = (json: string) => {
    const p = JSON.parse(json) as Page;
    pageRef.current = p; setPage(p); last.current = { key: null, t: 0 };
    if (sel && !p.blocks.some((b) => b.id === sel)) setSel(null);
    scheduleSave();
  };
  const undo = () => { if (!hist.current.length || !page) return; fut.current.push(JSON.stringify(page)); restore(hist.current.pop()!); force((n) => n + 1); };
  const redo = () => { if (!fut.current.length || !page) return; hist.current.push(JSON.stringify(page)); restore(fut.current.pop()!); force((n) => n + 1); };

  const narrow = () => window.matchMedia('(max-width: 960px)').matches;
  const scrollToBlock = (bid: string) => requestAnimationFrame(() => document.querySelector(`[data-bid="${bid}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));

  function addBlock(type: BlockType, at?: number) {
    const b = makeBlock(type);
    mutate(null, (d) => {
      const idx = at ?? (sel ? d.blocks.findIndex((x) => x.id === sel) + 1 : d.blocks.length);
      d.blocks.splice(idx, 0, b);
    });
    setSel(b.id); setDrawer(narrow() ? 'insp' : null); scrollToBlock(b.id);
    toast(BLOCKS[type].label + ' added');
  }
  function blockAction(bid: string, act: 'up' | 'down' | 'dup' | 'del') {
    if (!page) return;
    const i = page.blocks.findIndex((b) => b.id === bid);
    if (i < 0) return;
    if (act === 'up' && i > 0) mutate(null, (d) => { d.blocks.splice(i - 1, 0, d.blocks.splice(i, 1)[0]); });
    if (act === 'down' && i < page.blocks.length - 1) mutate(null, (d) => { d.blocks.splice(i + 1, 0, d.blocks.splice(i, 1)[0]); });
    if (act === 'up' || act === 'down') scrollToBlock(bid);
    if (act === 'dup') {
      const c: Block = { ...clone(page.blocks[i]), id: uid() };
      mutate(null, (d) => { d.blocks.splice(i + 1, 0, c); });
      setSel(c.id); scrollToBlock(c.id);
    }
    if (act === 'del') {
      const name = BLOCKS[page.blocks[i].type].label;
      mutate(null, (d) => { d.blocks.splice(i, 1); });
      if (sel === bid) setSel(null);
      toast(name + ' deleted', { label: 'Undo', fn: undo });
    }
  }
  const select = (bid: string | null) => { setSel(bid); if (bid && narrow()) setDrawer('insp'); };

  /* ---- drag and drop ---- */
  const dropIndex = (y: number) => {
    const blks = Array.from(canvasRef.current?.querySelectorAll('.ed-blk') || []);
    for (let i = 0; i < blks.length; i++) { const r = blks[i].getBoundingClientRect(); if (y < r.top + r.height / 2) return i; }
    return blks.length;
  };
  const dropTop = useMemo(() => {
    if (dropAt === null || !canvasRef.current) return null;
    const frame = canvasRef.current.querySelector('#frame');
    const blks = Array.from(canvasRef.current.querySelectorAll('.ed-blk'));
    if (!frame) return null;
    const fr = frame.getBoundingClientRect();
    if (!blks.length) return 40;
    return (dropAt < blks.length ? blks[dropAt].getBoundingClientRect().top : blks[blks.length - 1].getBoundingClientRect().bottom) - fr.top - 2;
  }, [dropAt]);
  const endDrag = () => { drag.current = null; setDropAt(null); };
  function onDrop(e: DragEvent) {
    const d = drag.current;
    if (!d || !page) return;
    e.preventDefault();
    let idx = dropIndex(e.clientY);
    endDrag();
    if (d.type) return addBlock(d.type, idx);
    const from = page.blocks.findIndex((b) => b.id === d.move);
    if (from < 0) return;
    if (from < idx) idx--;
    if (from === idx) return;
    mutate(null, (x) => { const b = x.blocks.splice(from, 1)[0]; x.blocks.splice(idx, 0, b); });
  }

  /* ---- keyboard ---- */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (overlay) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement as HTMLElement)?.tagName);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); }
      else if (e.key === 'Escape' && !typing) { setSel(null); setDrawer(null); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && sel) { e.preventDefault(); blockAction(sel, 'del'); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });

  if (missing) return <div className="v-home"><main className="sheet"><div className="col"><h1>Page not found</h1><p className="subline">It may have been deleted. <Link href="/dashboard">Back to your pages</Link></p></div></main></div>;
  if (!page) return <div className="ed-loading" aria-busy="true">Opening your page…</div>;

  const facts = pageFacts(page);
  const selected = sel && page.blocks.find((b) => b.id === sel);

  return (
    <div className={'ed' + (drawer ? ' drawer-' + drawer : '') + (drag.current ? ' dragging' : '')}>
      <header className="ed-top">
        <Link className="icon-btn" href="/dashboard" title="Back to salespages" aria-label="Back to salespages" onClick={() => saveNow()}><Icon name="back" /></Link>
        <input className="ed-name" value={page.name} aria-label="Page name" maxLength={60} onChange={(e) => mutate('name', (d) => { d.name = e.target.value || 'Untitled page'; })} />
        <span id="status-pill">
          {facts.status.cls === 'warn'
            ? <button type="button" className="pill warn" onClick={() => { setSel(null); setDrawer('insp'); setTimeout(() => (document.getElementById('fld-settings-whatsapp') as HTMLInputElement)?.focus(), 50); }}>{facts.status.text}</button>
            : <span className={'pill ' + (page.published ? 'ok' : facts.status.cls)}>{page.published ? 'Live' : facts.status.text}</span>}
        </span>
        <span className={'save-state' + (saveState.err ? ' err' : '')}>{saveState.text}</span>
        <div className="ed-r">
          <div className="seg ed-device" role="group" aria-label="Canvas size">
            <button type="button" className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')} aria-label="Computer view"><Icon name="desktop" /><span>Computer</span></button>
            <button type="button" className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')} aria-label="Phone view"><Icon name="mobile" /><span>Phone</span></button>
          </div>
          <span className="vdiv" aria-hidden="true" />
          <button type="button" className="icon-btn" onClick={undo} disabled={!hist.current.length} title="Undo (Ctrl+Z)" aria-label="Undo"><Icon name="undo" /></button>
          <button type="button" className="icon-btn" id="btn-redo" onClick={redo} disabled={!fut.current.length} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><Icon name="redo" /></button>
          <span className="vdiv" aria-hidden="true" />
          <button type="button" className="btn" id="btn-preview" aria-label="Preview" onClick={async () => { await saveNow(); setOverlay('preview'); }}><Icon name="eye" /><span>Preview</span></button>
          <button type="button" className="btn primary" aria-label="Publish" onClick={async () => { await saveNow(); setOverlay('publish'); }}><Icon name="globe" /><span>{page.published ? 'Update' : 'Publish'}</span></button>
        </div>
      </header>

      <aside className="ed-lib" aria-label="Sections">
        <div className="panel-head"><h2>Sections</h2><p>Drag onto the page, or tap to add.</p></div>
        {LIBRARY_GROUPS.map((g) => (
          <div className="lib-group" key={g.label}>
            <h3>{g.label}</h3>
            <div className="lib-items">
              {g.items.map((type) => (
                <button key={type} type="button" className="lib-item" draggable title={BLOCKS[type].hint}
                  onClick={() => addBlock(type)}
                  onDragStart={(e) => { drag.current = { type }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', type); force((n) => n + 1); }}
                  onDragEnd={endDrag}>
                  <span className="tile"><Icon name={BLOCKS[type].icon} /></span><span className="lib-l">{BLOCKS[type].label}</span><Icon name="grip" className="grip" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <main className="ed-canvas" ref={canvasRef}
        onClickCapture={(e) => { if ((e.target as HTMLElement).closest('a')) e.preventDefault(); }}
        onClick={(e) => { const t = e.target as HTMLElement; if (t === e.currentTarget || t.id === 'frame') setSel(null); }}
        onDragOver={(e) => { if (!drag.current) return; e.preventDefault(); setDropAt(dropIndex(e.clientY)); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null); }}
        onDrop={onDrop}>
        <h1 className="sr">{page.name}</h1>
        <div className={'ed-frame' + (device === 'mobile' ? ' mobile' : '')} id="frame">
          {dropTop !== null && <div className="drop-line" style={{ top: dropTop }} />}
          <div id="page-root">
            <SalesPage page={page} mode="editor" onSelectStage={select}
              empty={<div className="ed-empty"><Icon name="plus" /><b>Your page is empty</b><span>Drag a section here from the left, or tap “Add section”.</span></div>}
              wrap={(b, node, i) => (
                <div key={b.id} data-bid={b.id} className={'ed-blk' + (b.id === sel ? ' sel' : '') + (drag.current?.move === b.id ? ' lift' : '')}
                  onClick={(e) => { if (!(e.target as HTMLElement).closest('.ed-bar')) { if (sel !== b.id) select(b.id); else if (narrow() && !(e.target as HTMLElement).closest('.sp-order')) setDrawer('insp'); } }}>
                  <div className="ed-bar">
                    <span className="ed-grip" draggable title="Drag to move" aria-hidden="true"
                      onDragStart={(e) => { drag.current = { move: b.id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); force((n) => n + 1); }}
                      onDragEnd={endDrag}><Icon name="grip" /></span>
                    <span className="ed-bname">{BLOCKS[b.type].label}</span>
                    <button type="button" title="Move up" aria-label="Move up" disabled={i === 0} onClick={() => blockAction(b.id, 'up')}><Icon name="up" /></button>
                    <button type="button" title="Move down" aria-label="Move down" disabled={i === page.blocks.length - 1} onClick={() => blockAction(b.id, 'down')}><Icon name="down" /></button>
                    <button type="button" title="Duplicate" aria-label="Duplicate" onClick={() => blockAction(b.id, 'dup')}><Icon name="copy" /></button>
                    <button type="button" data-a="del" title="Delete" aria-label="Delete" onClick={() => blockAction(b.id, 'del')}><Icon name="trash" /></button>
                  </div>
                  {node}
                </div>
              )} />
          </div>
        </div>
      </main>

      <aside className="ed-insp" aria-label="Edit">
        {selected
          ? <BlockPanel key={selected.id} page={page} id={selected.id} mutate={mutate} onBack={() => setSel(null)} onAction={(a) => blockAction(selected.id, a)} />
          : <PageSettings page={page} mutate={mutate} />}
      </aside>

      <nav className="ed-tabs" aria-label="Panels">
        <button type="button" className={drawer === 'lib' ? 'on' : ''} onClick={() => setDrawer(drawer === 'lib' ? null : 'lib')}><Icon name="plus" />Add section</button>
        <button type="button" className={drawer === 'insp' ? 'on' : ''} onClick={() => setDrawer(drawer === 'insp' ? null : 'insp')}>
          <Icon name="sliders" /><span>{selected ? 'Edit ' + BLOCKS[selected.type].label.toLowerCase() : 'Page settings'}</span>
        </button>
      </nav>
      <div className="ed-scrim" onClick={() => setDrawer(null)} />

      {overlay === 'preview' && <PreviewOverlay page={page} device={narrow() ? 'mobile' : device} onClose={() => setOverlay(null)} />}
      {overlay === 'publish' && (
        <PublishDialog page={page} onClose={() => setOverlay(null)}
          onPublished={(slug) => { const p = { ...page, slug, published: !!slug }; pageRef.current = p; setPage(p); }} />
      )}
    </div>
  );
}
