/* Small shared pieces of the salespage: rich text, marks, drawn pictures. No client state. */
import { Fragment, type ReactNode } from 'react';

/** Plain text with **bold** and line breaks. React escapes everything else. */
export function Rich({ text }: { text?: string }) {
  const lines = String(text || '').split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*.+?\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={j}>{part.slice(2, -2)}</strong> : <Fragment key={j}>{part}</Fragment>,
          )}
        </Fragment>
      ))}
    </>
  );
}

export const CheckMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const CrossMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
);
export const Star = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
);
export const PlayMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" opacity=".9" /><path d="M10 8l6 4-6 4z" fill="#fff" /></svg>
);
export const ChatMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 2.2a9.6 9.6 0 0 0-8.3 14.5L2.3 21.8l5.3-1.4A9.6 9.6 0 1 0 12 2.2zm5.4 13.6c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.7-.1 1.2z" />
  </svg>
);
export const PhotoIcon = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
);

/** Placeholder shown only in the editor where a photo can go. */
export function PhotoSlot({ className }: { className: string }) {
  return (
    <div className={className + ' sp-ph'}>
      <PhotoIcon />
      <span>Add a photo</span>
    </div>
  );
}

/** The product drawn in code (Label style, no photo yet): a jar with the seller's label. */
export function Jar({ name }: { name?: string }) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280), seed / 233280);
  const dots: ReactNode[] = [];
  for (let i = 0; i < 70; i++) {
    const x = 70 + rnd() * 160, y = 150 + rnd() * 190;
    const rx = 4 + rnd() * 5, ry = 2 + rnd() * 2.5, rot = Math.round(rnd() * 180);
    if (y > 205 && y < 290) continue;
    dots.push(<ellipse key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} rx={rx.toFixed(1)} ry={ry.toFixed(1)} transform={`rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})`} fill="#e9c58f" />);
  }
  return (
    <svg className="sp-jar" viewBox="0 0 300 400" role="img" aria-label="Balang produk (lukisan)">
      <rect x="78" y="40" width="144" height="58" rx="10" fill="#1d1d1b" />
      <rect x="78" y="86" width="144" height="12" fill="#2f2f2c" />
      <rect x="56" y="104" width="188" height="262" rx="34" fill="#6e1a10" />
      {dots}
      <rect x="56" y="104" width="188" height="262" rx="34" fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="6" />
      <rect x="56" y="200" width="188" height="96" style={{ fill: 'var(--bg)' }} />
      <rect x="56" y="200" width="188" height="8" style={{ fill: 'var(--p)' }} />
      <rect x="56" y="288" width="188" height="8" style={{ fill: 'var(--p)' }} />
      {name && (
        <text x="150" y="246" textAnchor="middle" fontWeight="700" fontSize="20" style={{ fontFamily: 'var(--fh)', fill: 'var(--tx0)' }}>
          {name.slice(0, 22)}
        </text>
      )}
      <text x="150" y="272" textAnchor="middle" fontSize="13" style={{ fontFamily: 'var(--fb)', fill: 'var(--tx0)' }}>250 g</text>
    </svg>
  );
}

/** The motif drawn as the object itself (Shape style, no photo yet): a wall-mounted split unit. */
export function Unit() {
  return (
    <svg className="sp-unit" viewBox="0 0 620 200" role="img" aria-label="Unit aircond dinding (lukisan)">
      <rect x="0" y="0" width="620" height="200" rx="64" fill="#ffffff" />
      <rect x="70" y="150" width="480" height="16" rx="8" style={{ fill: 'var(--tx0)' }} opacity=".85" />
      <rect x="70" y="128" width="480" height="6" rx="3" style={{ fill: 'var(--tx0)' }} opacity=".12" />
      <circle cx="548" cy="58" r="7" fill="#2bb3e8" />
    </svg>
  );
}
