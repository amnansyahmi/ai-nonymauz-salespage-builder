export type Lang = 'ms' | 'en';
export type LookId = 'classic' | 'label' | 'chapters' | 'unit' | 'stage';
export type Bg = 'default' | 'soft' | 'primary' | 'dark';

export interface Theme {
  preset: string;
  primary: string;
  accent: string;
  bg: string;
  text: string;
  alt: string;
  font: string;
  corners: 'sharp' | 'soft' | 'round';
  look: LookId;
}

export interface Settings {
  businessName: string;
  whatsapp: string;
  lang: Lang;
  waFloat: boolean;
  sticky: boolean;
  stickyText: string;
  stickyLink: string;
  seoTitle: string;
  seoDesc: string;
  pixelId: string;
}

/* Block props are plain JSON, edited through the field schema. */
export type Props = Record<string, any>;

export interface Block {
  id: string;
  type: BlockType;
  props: Props;
}

export type BlockType =
  | 'hero' | 'text' | 'image' | 'gallery' | 'video' | 'benefits' | 'order' | 'pricing'
  | 'bonus' | 'testimonials' | 'faq' | 'countdown' | 'guarantee' | 'cta' | 'spacer' | 'footer';

export interface Page {
  id: string;
  name: string;
  slug: string | null;
  published: boolean;
  publishedAt?: string | null;
  updatedAt: number;
  theme: Theme;
  settings: Settings;
  blocks: Block[];
}

export interface RenderCtx {
  editor?: boolean;
  thumb?: boolean;
  lang: Lang;
  settings: Settings;
  look: LookId;
  slug?: string | null;
}
