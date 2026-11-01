import type { Page } from "./types";
import { THEMES, LOOKS, FONTS, defaultTheme } from "./theme";
import { normalizeBlock } from "./blocks";
import { DEFAULT_SETTINGS } from "./templates";
import { uid, validWhatsApp, waNumber } from "./format";

/** Fill gaps so pages saved by older versions keep working. Named presets follow the preset's current colours. */
export function normalizePage(p: Partial<Page> & Record<string, any>): Page {
  const theme = { ...defaultTheme(), ...(p.theme || {}) };
  const pre = Object.prototype.hasOwnProperty.call(THEMES, theme.preset)
    ? THEMES[theme.preset]
    : undefined;
  if (pre)
    Object.assign(theme, {
      primary: pre.primary,
      accent: pre.accent,
      bg: pre.bg,
      text: pre.text,
      alt: pre.alt || "",
    });
  if (!Object.prototype.hasOwnProperty.call(LOOKS, theme.look))
    theme.look = "classic";
  if (!Object.prototype.hasOwnProperty.call(FONTS, theme.font))
    theme.font = "moden";
  for (const key of ["primary", "accent", "bg", "text", "alt"] as const)
    if (!/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(theme[key] || ""))
      theme[key] = key === "alt" ? "" : defaultTheme()[key];
  const settings = { ...DEFAULT_SETTINGS, ...(p.settings || {}) };
  for (const key of [
    "businessName",
    "whatsapp",
    "stickyText",
    "stickyLink",
    "seoTitle",
    "seoDesc",
    "pixelId",
  ] as const)
    settings[key] = String(settings[key] ?? "").slice(
      0,
      key === "seoDesc" ? 500 : 200,
    );
  settings.lang = settings.lang === "en" ? "en" : "ms";
  settings.spacing = settings.spacing === "compact" ? "compact" : "comfortable";
  for (const key of ["waFloat", "sticky", "reviewsConfirmed"] as const)
    settings[key] = !!settings[key];
  const ids = new Set<string>(),
    anchors = new Set<string>();
  const blocks = (Array.isArray(p.blocks) ? p.blocks.slice(0, 100) : [])
    .map(normalizeBlock)
    .filter(Boolean) as Page["blocks"];
  for (const b of blocks) {
    if (ids.has(b.id)) b.id = uid();
    ids.add(b.id);
    if (b.anchor) {
      if (anchors.has(b.anchor)) b.anchor = "";
      else anchors.add(b.anchor);
    }
  }
  return {
    id: p.id || uid(),
    name: String(p.name || "Untitled page").slice(0, 120),
    slug: p.slug ?? null,
    published: !!p.published,
    publishedAt: p.publishedAt ?? null,
    updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : Date.now(),
    theme,
    settings,
    blocks,
  };
}

/** Facts about a page, computed from its own sections, for lists and status pills. */
export function pageFacts(p: Page) {
  const order = p.blocks.find((b) => b.type === "order" && !b.hidden);
  const prices: number[] = order
    ? (order.props.items || []).map((i: any) => Number(i.price) || 0)
    : [];
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const wa = validWhatsApp(p.settings.whatsapp)
    ? waNumber(p.settings.whatsapp)
    : "";
  const status = !order
    ? { cls: "neutral", text: "No order form" }
    : !wa
      ? { cls: "warn", text: "Check WhatsApp number" }
      : !prices.length
        ? { cls: "warn", text: "Add a product" }
        : { cls: "ok", text: "Draft ready" };
  return {
    sections: p.blocks.length,
    packages: prices.length,
    hasOrder: !!order,
    wa,
    status,
    min,
    max,
  };
}
