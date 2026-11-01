'use client';
/* Shared builder pieces: icons, toast messages, the product mark, the top bar. */
import Link from 'next/link';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { hasSupabase } from '@/lib/supabase/env';

const PATHS: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  down: <path d="M12 5v14M19 12l-7 7-7-7" />,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />,
  grip: <path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" strokeWidth="3.2" />,
  desktop: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  mobile: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  undo: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>,
  redo: <><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></>,
  back: <path d="M15 18l-6-6 6-6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  hero: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8h10M7 12h6M7 16h4" /></>,
  text: <path d="M4 6h16M4 12h16M4 18h10" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></>,
  gallery: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  video: <><rect x="2" y="5" width="15" height="14" rx="2" /><path d="M17 10l5-3v10l-5-3z" /></>,
  list: <path d="M4 7l2 2 3-3M4 16l2 2 3-3M12 8h8M12 17h8" />,
  cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h9.8a1 1 0 0 0 1-.8L21 7H6" /></>,
  tag: <><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
  quote: <path d="M7 7h4v4c0 3-1.8 5-4 5.5M14 7h4v4c0 3-1.8 5-4 5.5" />,
  faq: <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v9H5v-9M12 8S10.5 3 7.5 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
  megaphone: <path d="M3 10v4l12 5V5L3 10zM15 8a4 4 0 0 1 0 8M6 15l1 5h3l-1-4" />,
  spacer: <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />,
  footer: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15h18" /></>,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></>,
  link: <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />,
};

export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <svg className={'ic ' + className} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}

/** The product's mark: a page with a chat tail, in the accent. */
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H10l-5 3.5V18a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="var(--accent)" />
      <path d="M7.5 7.5h9M7.5 10.75h5.5M7.5 14h7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- toasts ---------- */
type ToastAction = { label: string; fn: () => void };
const ToastCtx = createContext<(msg: string, action?: ToastAction) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; action?: ToastAction; on: boolean }>({ msg: '', on: false });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((msg: string, action?: ToastAction) => {
    setT({ msg, action, on: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT((x) => ({ ...x, on: false })), action ? 6000 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={'toast' + (t.on ? ' on' : '')} role="status" aria-live="polite">
        <span>{t.msg}</span>
        {t.action && <button type="button" onClick={() => { t.action!.fn(); setT((x) => ({ ...x, on: false })); }}>{t.action.label}</button>}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- the home top bar ---------- */
export function TopBar({ active, children }: { active?: 'pages' | 'orders'; children?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar-l">
        <Link className="wordmark" href="/dashboard"><Logo />Nonymauz</Link>
        {hasSupabase && (
          <nav className="topnav" aria-label="Main">
            <Link href="/dashboard" aria-current={active === 'pages' ? 'page' : undefined}>Pages</Link>
            <Link href="/orders" aria-current={active === 'orders' ? 'page' : undefined}>Orders</Link>
          </nav>
        )}
      </div>
      <div className="topbar-r">
        {children}
        {hasSupabase && (
          <form action="/auth/signout" method="post"><button className="btn tertiary" type="submit">Log out</button></form>
        )}
      </div>
    </header>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
