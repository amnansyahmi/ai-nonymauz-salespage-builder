import type { CSSProperties } from 'react';
import type { LookId, Page, Theme } from './types';

/* Colour presets, named after things Malaysian sellers already know. */
export const THEMES: Record<string, { label: string; primary: string; accent: string; bg: string; text: string; alt?: string }> = {
  pandan: { label: 'Pandan', primary: '#1d6a45', accent: '#1d6a45', bg: '#ffffff', text: '#14201a' },
  kunyit: { label: 'Kunyit', primary: '#9c5a06', accent: '#b4231a', bg: '#f4f4f2', text: '#211b14' },
  tehtarik: { label: 'Teh Tarik', primary: '#6b4026', accent: '#2a1d16', bg: '#efebe6', text: '#2a1d16' },
  laut: { label: 'Laut', primary: '#0f4f7d', accent: '#0f4f7d', bg: '#ffffff', text: '#0e1b26' },
  ros: { label: 'Ros', primary: '#9b2450', accent: '#9b2450', bg: '#fbf7f8', text: '#2a141d' },
  malam: { label: 'Malam', primary: '#e3ad48', accent: '#e3ad48', bg: '#111315', text: '#eef0ec' },
  cili: { label: 'Cili', primary: '#b3261e', accent: '#b3261e', bg: '#ffffff', text: '#23140f', alt: '#e3e1dc' },
  bab: { label: 'Bab', primary: '#fe7141', accent: '#000000', bg: '#ffffff', text: '#000000', alt: '#f0ff1c' },
  marun: { label: 'Marun', primary: '#7d0c14', accent: '#7d0c14', bg: '#e2e2e2', text: '#5e0a10', alt: '#d6d6d6' },
  langit: { label: 'Langit', primary: '#0a0a0a', accent: '#0a0a0a', bg: '#cbe4f2', text: '#0a0a0a', alt: '#f1e3b5' },
};

/* Layout styles: each is a whole composition, not a colour swap. */
export const LOOKS: Record<LookId, { label: string; hint: string }> = {
  classic: { label: 'Classic', hint: 'Clean sections, heading beside its content' },
  label: { label: 'Label', hint: 'The page is your product label' },
  chapters: { label: 'Chapters', hint: 'Each section a full colour field' },
  unit: { label: 'Shape', hint: 'One big shape runs through the page' },
  stage: { label: 'Stage', hint: 'Your photo stays put while the words scroll' },
};

export const FONTS: Record<string, { label: string; h: string; b: string; q: string }> = {
  moden: { label: 'Modern', h: "'Schibsted Grotesk', system-ui, sans-serif", b: "'Schibsted Grotesk', system-ui, sans-serif", q: 'Schibsted+Grotesk:wght@400;600;800' },
  tegas: { label: 'Bold', h: "'Archivo', system-ui, sans-serif", b: "'Archivo', system-ui, sans-serif", q: 'Archivo:wdth,wght@75..100,400;75..100,600;75..100,800' },
  elegan: { label: 'Elegant', h: "'Fraunces', Georgia, serif", b: "'Figtree', system-ui, sans-serif", q: 'Fraunces:opsz,wght@9..144,600;9..144,700&family=Figtree:wght@400;600' },
  mesra: { label: 'Friendly', h: "'Gabarito', system-ui, sans-serif", b: "'Gabarito', system-ui, sans-serif", q: 'Gabarito:wght@400;600;800' },
  slab: { label: 'Slab', h: "'Zilla Slab', Georgia, serif", b: "'Zilla Slab', Georgia, serif", q: 'Zilla+Slab:wght@400;500;600;700' },
  hanken: { label: 'Plain', h: "'Hanken Grotesk', system-ui, sans-serif", b: "'Hanken Grotesk', system-ui, sans-serif", q: 'Hanken+Grotesk:wght@400;500;600' },
  literata: { label: 'Book', h: "'Literata', Georgia, serif", b: "'Literata', Georgia, serif", q: 'Literata:opsz,wght@7..72,400;7..72,500;7..72,600' },
  stack: { label: 'Soft', h: "'Stack Sans Headline', system-ui, sans-serif", b: "'Stack Sans Text', system-ui, sans-serif", q: 'Stack+Sans+Headline:wght@300;400&family=Stack+Sans+Text:wght@400;500' },
};

/* Buttons are either square or fully round, never the in-between soft radius. */
export const CORNERS = {
  sharp: { label: 'Square', r: '0px', rb: '0px' },
  soft: { label: 'Soft', r: '6px', rb: '999px' },
  round: { label: 'Rounded', r: '20px', rb: '999px' },
} as const;

export function fontsURL(keys: string[]): string {
  const qs = keys.map((k) => (FONTS[k] || FONTS.moden).q);
  return 'https://fonts.googleapis.com/css2?family=' + qs.join('&family=') + '&display=swap';
}

function hexToRgb(hex: string): [number, number, number] {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lum(hex: string): number {
  const c = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
/** White or near-black, whichever reads better on this background. */
export function onColor(hex: string): string {
  const L = lum(hex);
  return 1.05 / (L + 0.05) >= (L + 0.05) / (lum('#141414') + 0.05) ? '#ffffff' : '#141414';
}

export function defaultTheme(preset = 'pandan'): Theme {
  const t = THEMES[preset] || THEMES.pandan;
  return { preset, primary: t.primary, accent: t.accent, bg: t.bg, text: t.text, alt: t.alt || '', font: 'moden', corners: 'soft', look: 'classic' };
}

export function themeVars(t: Theme): CSSProperties {
  const f = FONTS[t.font] || FONTS.moden;
  const c = CORNERS[t.corners] || CORNERS.soft;
  const light = onColor(t.bg) === '#141414';
  return {
    ['--p' as any]: t.primary,
    ['--a' as any]: t.accent,
    ['--bg' as any]: t.bg,
    ['--tx0' as any]: t.text,
    ['--onp' as any]: onColor(t.primary),
    ['--ona' as any]: onColor(t.accent),
    ['--fbg' as any]: light ? '#ffffff' : '#1b1e21',
    ['--ftx' as any]: light ? t.text : '#f1f2ef',
    ['--alt' as any]: t.alt || `color-mix(in srgb,${t.primary} 16%,${t.bg})`,
    ['--onalt' as any]: t.alt ? onColor(t.alt) : t.text,
    ['--fh' as any]: f.h,
    ['--fb' as any]: f.b,
    ['--r' as any]: c.r,
    ['--rb' as any]: c.rb,
  };
}

export function pageClass(page: Page, extra?: string): string {
  const look = LOOKS[page.theme.look] ? page.theme.look : 'classic';
  const s = page.settings;
  return ['sp-page', 'look-' + look, s.sticky && s.stickyText ? 'has-sticky' : '', extra || ''].filter(Boolean).join(' ');
}
