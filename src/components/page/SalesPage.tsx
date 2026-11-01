/* The salespage. Rendered on the server for published pages, and inside the editor canvas.
   Classes follow src/styles/salespage.css (taste-skill page rules + the five layout styles). */
import type { CSSProperties, ReactNode } from 'react';
import type { Block, Page, Props, RenderCtx } from '@/lib/types';
import { pageClass, themeVars } from '@/lib/theme';
import { L } from '@/lib/i18n';
import { money, plain, waNumber } from '@/lib/format';
import { CheckMark, ChatMark, CrossMark, Jar, PhotoSlot, PlayMark, Rich, Star, Unit } from './bits';
import OrderForm from './OrderForm';
import { Countdown, FixedBar, Motion } from './live';

type Wrap = (block: Block, node: ReactNode, index: number) => ReactNode;

function Img({ src, ctx, className, alt }: { src?: string; ctx: RenderCtx; className: string; alt?: string }) {
  if (src) return <img className={className} src={src} alt={alt || ''} loading="lazy" />;
  return ctx.editor ? <PhotoSlot className={className} /> : null;
}
function Btn({ text, link, className = '' }: { text?: string; link?: string; className?: string }) {
  if (!text) return null;
  return <a className={'sp-btn ' + className} href={link || '#order'}>{text}</a>;
}
function Head({ h, sub, level = 2 }: { h?: string; sub?: string; level?: 1 | 2 }) {
  if (!h && !sub) return null;
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <div className="sp-head">
      {h && <H className={level === 1 ? 'sp-h1' : 'sp-h2'}><Rich text={h} /></H>}
      {sub && <p className="sp-lead"><Rich text={sub} /></p>}
    </div>
  );
}
const Split = ({ head, children }: { head: ReactNode; children: ReactNode }) => (
  <div className="sp-split"><div className="sp-split-h">{head}</div><div className="sp-split-b">{children}</div></div>
);
const youtubeId = (url: string) => (String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1] || '';

function BlockBody({ b, ctx }: { b: Block; ctx: RenderCtx }): ReactNode {
  const p: Props = b.props;
  const t = L[ctx.lang] || L.ms;
  switch (b.type) {
    case 'hero': {
      const pic = ctx.look === 'stage' ? null
        : !p.image && ctx.look === 'label' ? <Jar name={ctx.settings.businessName} />
        : !p.image && ctx.look === 'unit' ? <Unit />
        : <Img src={p.image} ctx={ctx} className="sp-hero-img" alt={plain(p.headline)} />;
      const H = ctx.editor || ctx.thumb ? 'h2' : 'h1';
      return (
        <div className={`sp-hero sp-al-${p.align}${pic ? ' has-pic' : ''}`}>
          <div className="sp-hero-copy">
            {ctx.look === 'label' && ctx.settings.businessName && <p className="sp-label-brand">{ctx.settings.businessName}</p>}
            <H className="sp-h1"><Rich text={p.headline} /></H>
            {p.sub && <p className="sp-lead"><Rich text={p.sub} /></p>}
            <Btn text={p.btnText} link={p.btnLink} />
            {p.eyebrow && <p className="sp-fact">{p.eyebrow}</p>}
          </div>
          {pic}
        </div>
      );
    }
    case 'text':
      return (
        <div className={`sp-text sp-al-${p.align}`}>
          {p.heading && <h2 className="sp-h2"><Rich text={p.heading} /></h2>}
          {p.body && <p><Rich text={p.body} /></p>}
        </div>
      );
    case 'image': {
      if (!p.image && !ctx.editor) return null;
      return (
        <figure className="sp-figure">
          <Img src={p.image} ctx={ctx} className={`sp-photo sp-photo-${p.size}`} alt={p.caption} />
          {p.caption && <figcaption>{p.caption}</figcaption>}
        </figure>
      );
    }
    case 'gallery': {
      const cells = (p.items || []).filter((it: Props) => it.image || ctx.editor);
      return (
        <>
          <Head h={p.heading} />
          {cells.length > 0 && (
            <div className="sp-gallery" style={{ ['--cols' as any]: p.columns } as CSSProperties}>
              {cells.map((it: Props, i: number) => (
                <figure key={i} className="sp-gal-cell">
                  <Img src={it.image} ctx={ctx} className="sp-gal-img" alt={it.caption} />
                  {it.caption && <figcaption>{it.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </>
      );
    }
    case 'video': {
      const id = youtubeId(p.url);
      if (!id && !ctx.editor) return null;
      return (
        <>
          <Head h={p.heading} />
          <figure className="sp-figure">
            {id && !ctx.editor ? (
              <div className="sp-video">
                <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={p.caption || 'Video'} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
              </div>
            ) : (
              <div className="sp-video sp-video-ph"><PlayMark /><span>{id ? 'Your YouTube video plays here on the live page' : 'Paste a YouTube link in the panel'}</span></div>
            )}
            {p.caption && <figcaption>{p.caption}</figcaption>}
          </figure>
        </>
      );
    }
    case 'benefits': {
      const List = p.style === 'number' ? 'ol' : 'ul';
      return (
        <Split head={<Head h={p.heading} sub={p.sub} />}>
          <List className={`sp-points sp-points-${p.style}`}>
            {(p.items || []).map((it: Props, i: number) => (
              <li key={i}>
                {p.style !== 'number' && <span className={`sp-mark sp-mark-${p.style}`}>{p.style === 'cross' ? <CrossMark /> : <CheckMark />}</span>}
                <span><Rich text={it.text} /></span>
              </li>
            ))}
          </List>
        </Split>
      );
    }
    case 'order':
      return (
        <Split head={<Head h={p.heading} sub={p.sub} />}>
          <OrderForm p={p} ctx={ctx} bid={b.id} />
        </Split>
      );
    case 'pricing': {
      const save = Number(p.oldPrice) - Number(p.price);
      const meta = [p.badge, save > 0 ? `${t.save} ${money(save)}` : '', p.priceNote].filter(Boolean).join(' · ');
      return (
        <div className="sp-offer">
          <div className="sp-offer-main">
            <h2 className="sp-h2"><Rich text={p.title} /></h2>
            <ul className="sp-points sp-points-check">
              {(p.items || []).map((it: Props, i: number) => (
                <li key={i}><span className="sp-mark sp-mark-check"><CheckMark /></span><span><Rich text={it.text} /></span></li>
              ))}
            </ul>
          </div>
          <div className="sp-offer-stub">
            <div className="sp-bigprice"><b>{money(p.price)}</b>{Number(p.oldPrice) > Number(p.price) && <s>{money(p.oldPrice)}</s>}</div>
            {meta && <p className="sp-offer-meta">{meta}</p>}
            <Btn text={p.btnText} link={p.btnLink} />
            {p.note && <p className="sp-small">{p.note}</p>}
          </div>
        </div>
      );
    }
    case 'bonus': {
      const items: Props[] = p.items || [];
      const sum = items.reduce((s, it) => s + (Number(it.value) || 0), 0);
      return (
        <Split head={<Head h={p.heading} />}>
          <div className="sp-bonuses">
            {items.map((it, i) => (
              <div key={i} className="sp-bonus">
                <div><div className="sp-bonus-t">{it.title}</div>{it.desc && <div className="sp-item-desc">{it.desc}</div>}</div>
                {Number(it.value) > 0 && <div className="sp-bonus-v"><s>{money(it.value)}</s></div>}
              </div>
            ))}
            {sum > 0 && <div className="sp-bonus sp-bonus-sum"><div>{t.worth} {money(sum)}</div><div className="sp-bonus-v">{t.free}</div></div>}
          </div>
          {p.note && <p className="sp-small">{p.note}</p>}
        </Split>
      );
    }
    case 'testimonials':
      return (
        <>
          <Head h={p.heading} />
          <div className="sp-reviews">
            {(p.items || []).map((it: Props, i: number) => {
              const n = Number(it.stars) || 0;
              return (
                <figure key={i} className="sp-review">
                  <blockquote><Rich text={it.quote} /></blockquote>
                  <figcaption>
                    {it.image && <img className="sp-av" src={it.image} alt="" />}
                    <span><b>{it.name}</b>{it.info ? `, ${it.info}` : ''}</span>
                    {n > 0 && <span className="sp-stars" role="img" aria-label={`${n} / 5`}>{Array.from({ length: n }, (_, k) => <Star key={k} />)}</span>}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </>
      );
    case 'faq':
      return (
        <Split head={<Head h={p.heading} />}>
          <div className="sp-faq">
            {(p.items || []).map((it: Props, i: number) => (
              <details key={i} open={i === 0}><summary>{it.q}</summary><div><Rich text={it.a} /></div></details>
            ))}
          </div>
        </Split>
      );
    case 'countdown':
      return <Countdown p={p} ctx={ctx} bid={b.id} />;
    case 'guarantee':
      return (
        <div className="sp-guarantee">
          {p.badge && <p className="sp-guarantee-mark">{p.badge}</p>}
          <div className="sp-guarantee-t"><h2 className="sp-h2"><Rich text={p.title} /></h2><p><Rich text={p.text} /></p></div>
        </div>
      );
    case 'cta':
      if ((ctx.look === 'label' || ctx.look === 'chapters') && p.btnText && String(p.btnText).length <= 9) {
        return (
          <a className="sp-band" href={p.btnLink || '#order'}>
            <span className="sp-band-s">{p.heading && <Rich text={p.heading} />}{p.heading && p.text ? ' ' : ''}{p.text && <Rich text={p.text} />}</span>
            <svg className="sp-band-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M8 6h10v10" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>
            <span className="sp-band-w" style={{ ['--n' as any]: String(p.btnText).length } as CSSProperties}>{p.btnText}</span>
          </a>
        );
      }
      return (
        <div className="sp-cta">
          {p.heading && <h2 className="sp-h2"><Rich text={p.heading} /></h2>}
          <div className="sp-cta-b">{p.text && <p className="sp-lead"><Rich text={p.text} /></p>}<Btn text={p.btnText} link={p.btnLink} /></div>
        </div>
      );
    case 'spacer':
      return <div className={`sp-spacer sp-spacer-${p.size}`} />;
    case 'footer':
      return (
        <div className="sp-footer">
          <p className="sp-footer-name">{p.business}</p>
          <div className="sp-footer-meta">
            {p.contact && <span><Rich text={p.contact} /></span>}
            {p.reg && <span>{p.reg}</span>}
            <span>© {new Date().getFullYear()} {p.business}</span>
          </div>
        </div>
      );
  }
}

export function Section({ b, ctx, n, anchor }: { b: Block; ctx: RenderCtx; n: number; anchor?: boolean }) {
  const body = BlockBody({ b, ctx });
  if (body == null && !ctx.editor) return null;
  return (
    <section className={`sp-sec sp-bg-${b.props.bg || 'default'} sp-b-${b.type} sp-n${n % 4}`} id={anchor ? 'order' : undefined}>
      <div className="sp-wrap">{body}</div>
    </section>
  );
}

function StageMedia({ page, ctx, onSelect }: { page: Page; ctx: RenderCtx; onSelect?: (id: string) => void }) {
  const hero = page.blocks.find((b) => b.type === 'hero');
  const hp = hero?.props || {};
  const s = page.settings;
  const name = plain(hp.headline || s.businessName || page.name);
  return (
    <aside className="sp-stage-media" onClick={hero && onSelect ? () => onSelect(hero.id) : undefined}>
      {hp.image ? <img src={hp.image} alt={name} /> : (
        <div className="sp-stage-field">
          <span>{s.businessName || name}</span>
          {ctx.editor && <small>Add your product photo in the Headline section</small>}
        </div>
      )}
      {(hp.eyebrow || s.businessName) && <div className="sp-stage-bar"><span>{hp.eyebrow}</span><span>{hp.image ? s.businessName : ''}</span></div>}
    </aside>
  );
}

export interface SalesPageProps {
  page: Page;
  mode: 'live' | 'editor' | 'thumb';
  wrap?: Wrap;
  onSelectStage?: (id: string) => void;
  empty?: ReactNode;
}

export default function SalesPage({ page, mode, wrap, onSelectStage, empty }: SalesPageProps) {
  const s = page.settings;
  const ctx: RenderCtx = { editor: mode !== 'live', thumb: mode === 'thumb', lang: s.lang, settings: s, look: page.theme.look, slug: page.slug };
  let orderSeen = false;
  const sections = page.blocks.map((b, i) => {
    const anchor = b.type === 'order' && !orderSeen ? (orderSeen = true) : false;
    const node = <Section key={b.id} b={b} ctx={ctx} n={i} anchor={anchor} />;
    return wrap ? wrap(b, node, i) : node;
  });
  const body = page.blocks.length === 0 && empty ? empty : page.theme.look === 'stage' && page.blocks.length
    ? <div className="sp-stage"><StageMedia page={page} ctx={ctx} onSelect={onSelectStage} /><div className="sp-stage-col">{sections}</div></div>
    : sections;

  const t = L[s.lang] || L.ms;
  const num = waNumber(s.whatsapp);
  const hasBar = !!(s.sticky && s.stickyText);
  const waBtn = s.waFloat && (num || ctx.editor)
    ? <a className="sp-wa" href={`https://wa.me/${num}?text=${encodeURIComponent(t.chat)}`} target="_blank" rel="noopener" aria-label="WhatsApp"><ChatMark /></a>
    : null;

  return (
    <div className={pageClass(page)} style={themeVars(page.theme)}>
      {body}
      {mode !== 'thumb' && (hasBar || waBtn) && (
        <FixedBar live={mode === 'live'} hasBar={hasBar}>
          {hasBar ? <div className="sp-sticky"><a className="sp-btn" href={s.stickyLink || '#order'}>{s.stickyText}</a>{waBtn}</div> : waBtn}
        </FixedBar>
      )}
      {mode === 'live' && <Motion />}
    </div>
  );
}
