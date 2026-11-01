/* Starter templates. Content is example copy in Bahasa Melayu; sellers replace it with their own.
   Each template carries its own layout style (taste-skill direction): Label, Chapters, Shape, Stage. */
import data from './templates.json';
import type { Page, Settings } from './types';
import { defaultTheme } from './theme';
import { makeBlock } from './blocks';
import { uid } from './format';

export interface Template { id: string; name: string; desc: string }

export const TEMPLATES: Template[] = (data as any[]).map(({ id, name, desc }) => ({ id, name, desc }));

export const DEFAULT_SETTINGS: Settings = {
  businessName: '', whatsapp: '', lang: 'ms', waFloat: true, sticky: false, stickyText: 'Order sekarang', stickyLink: '#order', seoTitle: '', seoDesc: '', pixelId: '',
};

function inDays(d: number): string {
  const t = new Date(Date.now() + d * 864e5);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T23:59`;
}

export function buildTemplate(id: string): Page {
  const t = (data as any[]).find((x) => x.id === id) || (data as any[])[0];
  const theme = { ...defaultTheme(t.page.theme.preset), ...t.page.theme };
  return {
    id: uid(),
    name: t.page.name,
    slug: null,
    published: false,
    updatedAt: Date.now(),
    theme,
    settings: { ...DEFAULT_SETTINGS, ...t.page.settings },
    blocks: t.page.blocks.map((b: any) => makeBlock(b.type, b.type === 'countdown' && !b.props.end ? { ...b.props, end: inDays(3) } : b.props)),
  };
}
