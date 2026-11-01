import type { Page } from "./types";
import { safeLink, safeImage, validWhatsApp } from "./format";
export interface LaunchCheck {
  key: string;
  ok: boolean;
  title: string;
  detail: string;
  blocking?: boolean;
}
export function launchChecks(page: Page): LaunchCheck[] {
  const blocks = page.blocks.filter((b) => !b.hidden),
    order = blocks.find((b) => b.type === "order"),
    hero = blocks.find((b) => b.type === "hero");
  const anchors = new Set(blocks.map((b) => b.anchor).filter(Boolean));
  if (order) anchors.add("order");
  const links = blocks
    .filter((b) => b.props.btnText)
    .map((b) => b.props.btnLink || "#order");
  if (page.settings.sticky) links.push(page.settings.stickyLink || "#order");
  return [
    {
      key: "whatsapp",
      ok: validWhatsApp(page.settings.whatsapp),
      title: "WhatsApp destination",
      detail: "Add a valid number for customer enquiries.",
      blocking: true,
    },
    {
      key: "order",
      ok: !!order?.props.items?.length,
      title: "Products and order form",
      detail: "Add a visible order form with at least one product.",
      blocking: true,
    },
    {
      key: "photo",
      ok: !!safeImage(hero?.props.image),
      title: "Your product photo",
      detail: "Use a real photo in place of sample artwork.",
    },
    {
      key: "copy",
      ok: !/Nama pelanggan|Nama Perniagaan Anda|masukkan no|Tulis tajuk|Produk baru|Nama produk anda/i.test(
        JSON.stringify(blocks),
      ),
      title: "Example content replaced",
      detail: "Check product names, business details and example copy.",
    },
    {
      key: "reviews",
      ok:
        !blocks.some(
          (b) => b.type === "testimonials" && b.props.items.length,
        ) || !!page.settings.reviewsConfirmed,
      title: "Reviews checked",
      detail: "Confirm that published quotes are real and you can use them.",
    },
    {
      key: "links",
      ok: links.every(
        (l) =>
          safeLink(l, "#invalid") !== "#invalid" &&
          (l[0] !== "#" || anchors.has(l.slice(1))),
      ),
      title: "Buttons have destinations",
      detail: "Link buttons to visible sections or valid web addresses.",
      blocking: true,
    },
    {
      key: "sharing",
      ok: !!(page.settings.seoTitle && page.settings.seoDesc),
      title: "Share title and description",
      detail: "Make the page recognisable in link previews.",
    },
  ];
}
