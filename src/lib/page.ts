import type { Page } from './types';
import { THEMES, LOOKS, FONTS, defaultTheme } from './theme';
import { normalizeBlock } from './blocks';
import { DEFAULT_SETTINGS } from './templates';
import { uid } from './format';

/** Fill gaps so pages saved by older versions keep working. Named presets follow the preset's current colours. */
export function normalizePage(p: Partial<Page> & Record<string, any>): Page {
  const theme = { ...defaultTheme(), ...(p.theme || {}) };
  const pre = THEMES[theme.preset];
  if (pre) Object.assign(theme, { primary: pre.primary, accent: pre.accent, bg: pre.bg, text: pre.text, alt: pre.alt || '' });
  if (!LOOKS[theme.look]) theme.look = 'classic';
  if (!FONTS[theme.font]) theme.font = 'moden';
  return {
    id: p.id || uid(),
    name: p.name || 'Untitled page',
    slug: p.slug ?? null,
    published: !!p.published,
    publishedAt: p.publishedAt ?? null,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
    theme,
    settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) },
    blocks: (p.blocks || []).map((b: any) => normalizeBlock(b)).filter(Boolean) as Page['blocks'],
  };
}

/** Facts about a page, computed from its own sections, for lists and status pills. */
export function pageFacts(p: Page) {
  const order = p.blocks.find((b) => b.type === 'order');
  const prices: number[] = order ? (order.props.items || []).map((i: any) => Number(i.price) || 0) : [];
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const wa = String(p.settings.whatsapp || '').replace(/\D/g, '');
  const status = !order ? { cls: 'neutral', text: 'No order form' } : !wa ? { cls: 'warn', text: 'No WhatsApp number' } : { cls: 'ok', text: 'Ready to share' };
  return { sections: p.blocks.length, packages: prices.length, hasOrder: !!order, wa, status, min, max };
}
