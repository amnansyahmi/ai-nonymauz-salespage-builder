/* Block library: each block's label, default content and edit form.
   The edit panel is generated from `fields`; the look lives in src/components/page. */
import type { Block, BlockType, Props } from "./types";
import { uid, clone, nonnegative } from "./format";

export type Field =
  | {
      type: "text" | "textarea" | "number" | "image" | "datetime" | "toggle";
      key: string;
      label: string;
      hint?: string;
      half?: boolean;
      rows?: number;
      showIf?: (p: Props) => boolean;
      rerender?: boolean;
    }
  | {
      type: "select" | "segment";
      key: string;
      label: string;
      options: [string, string][];
      hint?: string;
      showIf?: (p: Props) => boolean;
    }
  | {
      type: "list";
      key: string;
      label: string;
      fields: Field[];
      itemLabel: string;
      addLabel: string;
      titleKey?: string;
      hint?: string;
      newItem: () => Props;
    };

const text = (key: string, label: string, o: Partial<Field> = {}) =>
  ({ type: "text", key, label, ...o }) as Field;
const area = (key: string, label: string, o: Partial<Field> = {}) =>
  ({ type: "textarea", key, label, ...o }) as Field;
const num = (key: string, label: string, o: Partial<Field> = {}) =>
  ({ type: "number", key, label, ...o }) as Field;
const img = (key: string, label: string) =>
  ({ type: "image", key, label }) as Field;
const seg = (
  key: string,
  label: string,
  options: [string, string][],
  o: Partial<Field> = {},
) => ({ type: "segment", key, label, options, ...o }) as Field;
const sel = (key: string, label: string, options: [string, string][]) =>
  ({ type: "select", key, label, options }) as Field;
const toggle = (key: string, label: string, o: Partial<Field> = {}) =>
  ({ type: "toggle", key, label, ...o }) as Field;
const date = (key: string, label: string, o: Partial<Field> = {}) =>
  ({ type: "datetime", key, label, ...o }) as Field;
const list = (
  key: string,
  label: string,
  fields: Field[],
  o: {
    itemLabel: string;
    addLabel: string;
    titleKey?: string;
    hint?: string;
    newItem: () => Props;
  },
) => ({ type: "list", key, label, fields, ...o }) as Field;

export const F = { text, area, num, img, seg, sel, toggle, date, list };

const BG = seg("bg", "Section background", [
  ["default", "Plain"],
  ["soft", "Tint"],
  ["primary", "Brand"],
  ["dark", "Dark"],
]);
const BOLD = "Wrap words in **double stars** to make them bold.";
const LINK = "Use #order to jump to your order form, or paste any web link.";

function inDays(d: number): string {
  const t = new Date(Date.now() + d * 864e5);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T23:59`;
}

export interface BlockDef {
  label: string;
  icon: string;
  hint: string;
  defaults: () => Props;
  fields: Field[];
}

export const BLOCKS: Record<BlockType, BlockDef> = {
  hero: {
    label: "Headline",
    icon: "hero",
    hint: "Big opening title",
    defaults: () => ({
      artwork: "auto",
      arrangement: "split",
      imageFit: "cover",
      focusX: 50,
      focusY: 50,
      eyebrow: "",
      headline: "Tulis tajuk utama di sini",
      sub: "Terangkan dalam satu ayat apa yang pelanggan dapat.",
      image: "",
      btnText: "Saya nak order",
      btnLink: "#order",
      align: "left",
      bg: "default",
    }),
    fields: [
      area("headline", "Main title", { hint: BOLD, rows: 3 }),
      area("sub", "Supporting sentence", { rows: 3 }),
      img("image", "Product photo"),
      sel("arrangement", "Composition", [
        ["split", "Side by side"],
        ["image-first", "Photo first"],
        ["stacked", "Stacked"],
      ]),
      sel("artwork", "When there is no photo", [
        ["auto", "Template illustration"],
        ["none", "Text only"],
        ["jar", "Product jar"],
        ["unit", "Aircond"],
      ]),
      sel("imageFit", "Photo crop", [
        ["cover", "Fill frame"],
        ["contain", "Show whole photo"],
      ]),
      num("focusX", "Photo focus: horizontal (%)", { half: true }),
      num("focusY", "Photo focus: vertical (%)", { half: true }),
      text("btnText", "Button text", {
        hint: "Leave empty to hide the button.",
      }),
      text("btnLink", "Button goes to", { hint: LINK }),
      text("eyebrow", "Short fact", {
        hint: 'Optional. A reason to trust you, e.g. "Resepi keluarga sejak 1998".',
      }),
      seg("align", "Alignment", [
        ["left", "Left"],
        ["center", "Centre"],
      ]),
      BG,
    ],
  },
  text: {
    label: "Text",
    icon: "text",
    hint: "Heading and paragraph",
    defaults: () => ({
      heading: "Kisah di sebalik produk ini",
      body: "Ceritakan kenapa anda mula, apa masalah yang anda selesaikan, dan kenapa pelanggan boleh percaya anda.",
      align: "left",
      bg: "default",
    }),
    fields: [
      text("heading", "Heading"),
      area("body", "Paragraph", {
        rows: 7,
        hint: BOLD + " Press Enter for a new line.",
      }),
      seg("align", "Alignment", [
        ["left", "Left"],
        ["center", "Centre"],
      ]),
      BG,
    ],
  },
  image: {
    label: "Photo",
    icon: "image",
    hint: "One big picture",
    defaults: () => ({ image: "", caption: "", size: "full", bg: "default" }),
    fields: [
      img("image", "Photo"),
      text("caption", "Caption (optional)"),
      seg("size", "Width", [
        ["full", "Full"],
        ["narrow", "Narrow"],
      ]),
      BG,
    ],
  },
  gallery: {
    label: "Photo grid",
    icon: "gallery",
    hint: "Screenshots, product shots",
    defaults: () => ({
      heading: "Testimoni sebenar pelanggan",
      columns: "2",
      items: [
        { image: "", caption: "" },
        { image: "", caption: "" },
      ],
      bg: "soft",
    }),
    fields: [
      text("heading", "Heading"),
      seg("columns", "Photos per row", [
        ["1", "1"],
        ["2", "2"],
        ["3", "3"],
      ]),
      list(
        "items",
        "Photos",
        [img("image", "Photo"), text("caption", "Caption (optional)")],
        {
          itemLabel: "Photo",
          addLabel: "Add photo",
          newItem: () => ({ image: "", caption: "" }),
        },
      ),
      BG,
    ],
  },
  video: {
    label: "Video",
    icon: "video",
    hint: "YouTube video",
    defaults: () => ({
      heading: "",
      url: "",
      caption: "Tonton video 2 minit ini",
      bg: "default",
    }),
    fields: [
      text("heading", "Heading (optional)"),
      text("url", "YouTube link", {
        hint: "Copy the link from YouTube and paste it here.",
      }),
      text("caption", "Caption (optional)"),
      BG,
    ],
  },
  benefits: {
    label: "Point list",
    icon: "list",
    hint: "Benefits or pain points",
    defaults: () => ({
      heading: "Kenapa pelanggan pilih kami",
      sub: "",
      style: "check",
      items: [
        { text: "Kelebihan pertama produk anda" },
        { text: "Kelebihan kedua" },
        { text: "Kelebihan ketiga" },
      ],
      bg: "soft",
    }),
    fields: [
      text("heading", "Heading"),
      area("sub", "Short intro (optional)", { rows: 2 }),
      seg(
        "style",
        "Bullet style",
        [
          ["check", "Ticks"],
          ["cross", "Crosses"],
          ["number", "Numbers"],
        ],
        { hint: "Use crosses to list problems your customer faces." },
      ),
      list(
        "items",
        "Points",
        [area("text", "Point", { rows: 2, hint: BOLD })],
        {
          itemLabel: "Point",
          addLabel: "Add point",
          titleKey: "text",
          newItem: () => ({ text: "Point baru" }),
        },
      ),
      BG,
    ],
  },
  order: {
    label: "Order form",
    icon: "cart",
    hint: "Products, prices, checkout",
    defaults: () => ({
      heading: "Pilih pakej anda",
      sub: "",
      items: [
        {
          name: "Pakej Asas",
          desc: "1 unit",
          price: 39,
          oldPrice: 49,
          image: "",
          badge: "",
        },
        {
          name: "Pakej Jimat",
          desc: "3 unit",
          price: 99,
          oldPrice: 147,
          image: "",
          badge: "Paling laris",
        },
      ],
      shipLabel: "Penghantaran",
      shipping: [
        { label: "Semenanjung Malaysia", fee: 8 },
        { label: "Sabah & Sarawak", fee: 15 },
      ],
      freeShipMin: 0,
      askAddress: true,
      askNote: true,
      askSchedule: false,
      variants: "",
      btnText: "Order melalui WhatsApp",
      payNote:
        "Selepas tekan butang, WhatsApp akan dibuka dengan maklumat tempahan anda. Kami akan sahkan dan beri maklumat bayaran.",
      bg: "soft",
    }),
    fields: [
      text("heading", "Heading"),
      area("sub", "Short intro (optional)", { rows: 2 }),
      list(
        "items",
        "Products & packages",
        [
          text("name", "Name"),
          text("desc", "Short description"),
          num("price", "Price (RM)", { half: true }),
          num("oldPrice", "Old price (RM)", {
            half: true,
            hint: "Shown crossed out. 0 to hide.",
          }),
          text("badge", "Label (optional)", { hint: 'E.g. "Paling laris".' }),
          img("image", "Photo (optional)"),
        ],
        {
          itemLabel: "Product",
          addLabel: "Add product",
          titleKey: "name",
          newItem: () => ({
            name: "Produk baru",
            desc: "",
            price: 10,
            oldPrice: 0,
            image: "",
            badge: "",
          }),
        },
      ),
      text("shipLabel", "Delivery section title", {
        hint: 'For services you could call it "Kawasan".',
      }),
      list(
        "shipping",
        "Delivery options",
        [
          text("label", "Option"),
          num("fee", "Fee (RM)"),
          toggle("pickup", "Pickup: no address needed"),
        ],
        {
          itemLabel: "Option",
          addLabel: "Add delivery option",
          titleKey: "label",
          hint: "Remove all options if you do not deliver.",
          newItem: () => ({ label: "Ambil sendiri", fee: 0 }),
        },
      ),
      num("freeShipMin", "Free delivery when order reaches (RM)", {
        hint: "0 means no free delivery.",
      }),
      toggle("askAddress", "Ask for delivery address"),
      toggle("askSchedule", "Ask for a preferred appointment"),
      text("variants", "Variant choices (comma separated)", {
        hint: "E.g. Original, Extra spicy. Leave empty if not needed.",
      }),
      toggle("askNote", "Let customer add a note"),
      text("btnText", "Button text"),
      area("payNote", "Note under the button", { rows: 3 }),
      BG,
    ],
  },
  pricing: {
    label: "Price box",
    icon: "tag",
    hint: "One offer, big price",
    defaults: () => ({
      badge: "Harga pelancaran",
      title: "Pakej Lengkap",
      oldPrice: 129,
      price: 39,
      priceNote: "Sekali bayar sahaja",
      items: [
        { text: "Perkara pertama yang pelanggan dapat" },
        { text: "Perkara kedua" },
      ],
      btnText: "Saya nak sekarang",
      btnLink: "#order",
      note: "",
      bg: "default",
    }),
    fields: [
      text("title", "Package name"),
      num("price", "Price (RM)", { half: true }),
      num("oldPrice", "Old price (RM)", { half: true }),
      text("badge", "Short label (optional)"),
      text("priceNote", "Text under the price"),
      list("items", "What is included", [text("text", "Item")], {
        itemLabel: "Item",
        addLabel: "Add item",
        titleKey: "text",
        newItem: () => ({ text: "Item baru" }),
      }),
      text("btnText", "Button text"),
      text("btnLink", "Button goes to", { hint: LINK }),
      text("note", "Small note (optional)"),
      BG,
    ],
  },
  bonus: {
    label: "Bonuses",
    icon: "gift",
    hint: "Free extras with value",
    defaults: () => ({
      heading: "Bonus percuma untuk anda",
      items: [
        {
          title: "Bonus pertama",
          desc: "Terangkan kenapa bonus ini berguna.",
          value: 49,
        },
      ],
      note: "",
      bg: "default",
    }),
    fields: [
      text("heading", "Heading"),
      list(
        "items",
        "Bonuses",
        [
          text("title", "Bonus name"),
          text("desc", "Description"),
          num("value", "Value (RM)", { hint: "0 to hide." }),
        ],
        {
          itemLabel: "Bonus",
          addLabel: "Add bonus",
          titleKey: "title",
          newItem: () => ({ title: "Bonus baru", desc: "", value: 0 }),
        },
      ),
      text("note", "Note under the list"),
      BG,
    ],
  },
  testimonials: {
    label: "Reviews",
    icon: "quote",
    hint: "Customer quotes with stars",
    defaults: () => ({
      heading: "Apa kata pelanggan",
      items: [
        {
          name: "Nama pelanggan",
          info: "Bandar",
          quote: "Tulis apa yang pelanggan cakap tentang produk anda.",
          image: "",
          stars: 5,
        },
      ],
      bg: "default",
    }),
    fields: [
      text("heading", "Heading"),
      list(
        "items",
        "Reviews",
        [
          area("quote", "What they said", { rows: 3 }),
          text("name", "Name", { half: true }),
          text("info", "Town or job", { half: true }),
          sel("stars", "Stars", [
            ["5", "5 stars"],
            ["4", "4 stars"],
            ["0", "No stars"],
          ]),
          img("image", "Their photo (optional)"),
        ],
        {
          itemLabel: "Review",
          addLabel: "Add review",
          titleKey: "name",
          newItem: () => ({
            name: "Nama",
            info: "",
            quote: "Testimoni baru",
            image: "",
            stars: 5,
          }),
        },
      ),
      BG,
    ],
  },
  faq: {
    label: "Questions",
    icon: "faq",
    hint: "FAQ that opens on tap",
    defaults: () => ({
      heading: "Soalan lazim",
      items: [
        {
          q: "Berapa lama penghantaran?",
          a: "2-4 hari bekerja untuk Semenanjung, 4-7 hari untuk Sabah & Sarawak.",
        },
        {
          q: "Boleh bayar macam mana?",
          a: "Online transfer atau DuitNow QR. Maklumat diberi di WhatsApp.",
        },
      ],
      bg: "default",
    }),
    fields: [
      text("heading", "Heading"),
      list(
        "items",
        "Questions",
        [text("q", "Question"), area("a", "Answer", { rows: 3 })],
        {
          itemLabel: "Question",
          addLabel: "Add question",
          titleKey: "q",
          newItem: () => ({ q: "Soalan baru?", a: "Jawapan." }),
        },
      ),
      BG,
    ],
  },
  countdown: {
    label: "Countdown",
    icon: "clock",
    hint: "Timer for promo deadline",
    defaults: () => ({
      heading: "Harga promo tamat dalam",
      mode: "date",
      end: inDays(3),
      minutes: 1440,
      expired: "",
      bg: "dark",
    }),
    fields: [
      text("heading", "Heading"),
      seg(
        "mode",
        "Timer type",
        [
          ["date", "Fixed date"],
          ["evergreen", "Per visitor"],
        ],
        {
          hint: '"Per visitor" starts the timer when each person first opens the page.',
        },
      ),
      date("end", "Ends on", { showIf: (p) => p.mode === "date" }),
      num("minutes", "Minutes per visitor", {
        showIf: (p) => p.mode === "evergreen",
        hint: "1440 minutes = 1 day.",
      }),
      text("expired", "Text when time is up (optional)"),
      BG,
    ],
  },
  guarantee: {
    label: "Guarantee",
    icon: "shield",
    hint: "Build trust, remove risk",
    defaults: () => ({
      badge: "100%",
      title: "Jaminan puas hati",
      text: "Jika produk sampai rosak atau tidak seperti yang diterangkan, kami ganti baru atau pulangkan wang anda.",
      bg: "default",
    }),
    fields: [
      text("badge", "Big figure", { hint: 'Short, like "100%" or "7 Hari".' }),
      text("title", "Title"),
      area("text", "Promise", { rows: 4 }),
      BG,
    ],
  },
  cta: {
    label: "Call to action",
    icon: "megaphone",
    hint: "Reminder with a button",
    defaults: () => ({
      heading: "Stok terhad.",
      text: "Tekan butang di bawah dan selesaikan tempahan dalam 1 minit.",
      btnText: "Order",
      btnLink: "#order",
      bg: "primary",
    }),
    fields: [
      text("heading", "Heading"),
      area("text", "Text", { rows: 3 }),
      text("btnText", "Button text", {
        hint: "In the Label and Chapters styles, one short word becomes a giant button.",
      }),
      text("btnLink", "Button goes to", { hint: LINK }),
      BG,
    ],
  },
  spacer: {
    label: "Space",
    icon: "spacer",
    hint: "Breathing room",
    defaults: () => ({ size: "m", bg: "default" }),
    fields: [
      seg("size", "Height", [
        ["s", "Small"],
        ["m", "Medium"],
        ["l", "Large"],
      ]),
      BG,
    ],
  },
  footer: {
    label: "Footer",
    icon: "footer",
    hint: "Business details",
    defaults: () => ({
      business: "Nama Perniagaan Anda",
      reg: "SSM: 000000000000",
      contact: "Hubungi kami di WhatsApp untuk sebarang pertanyaan.",
      bg: "dark",
    }),
    fields: [
      text("business", "Business name"),
      text("reg", "Registration no. (optional)", {
        hint: "Showing your SSM number builds trust.",
      }),
      area("contact", "Contact or address", { rows: 3 }),
      BG,
    ],
  },
};

export const LIBRARY_GROUPS: { label: string; items: BlockType[] }[] = [
  { label: "Grab attention", items: ["hero", "countdown", "video"] },
  { label: "Sell", items: ["order", "pricing", "bonus", "guarantee", "cta"] },
  { label: "Convince", items: ["benefits", "testimonials", "gallery", "faq"] },
  { label: "Content", items: ["text", "image", "spacer", "footer"] },
];

export function normalizeBlock(b: Partial<Block>): Block | null {
  if (!b || !b.type || !Object.prototype.hasOwnProperty.call(BLOCKS, b.type))
    return null;
  const def = BLOCKS[b.type],
    defaults = def.defaults(),
    props = { ...defaults, ...(b.props || {}) };
  function sanitize(target: Props, fields: Field[]) {
    for (const field of fields) {
      const value = target[field.key];
      if (field.type === "list")
        target[field.key] = (Array.isArray(value) ? value : [])
          .filter((v) => v && typeof v === "object" && !Array.isArray(v))
          .slice(0, 100)
          .map((v) => {
            const item = { ...field.newItem(), ...v };
            sanitize(item, field.fields);
            return item;
          });
      else if (field.key === "stars")
        target[field.key] = Math.floor(nonnegative(value, 5));
      else if (field.type === "number") target[field.key] = nonnegative(value);
      else if (field.type === "toggle") target[field.key] = value === true;
      else if (field.type === "select" || field.type === "segment")
        target[field.key] = field.options.some(([key]) => key === String(value))
          ? value
          : field.options[0]?.[0] || "";
      else
        target[field.key] = String(value ?? "").slice(
          0,
          field.type === "image" ? 4000000 : 12000,
        );
    }
  }
  sanitize(props, def.fields);
  for (const key of ["items", "shipping"])
    for (const item of Array.isArray(props[key]) ? props[key] : [])
      for (const k of ["price", "oldPrice", "fee", "value"])
        if (k in item) item[k] = nonnegative(item[k]);
  for (const key of ["price", "oldPrice", "freeShipMin", "minutes"])
    if (key in props) props[key] = nonnegative(props[key]);
  props.focusX = props.focusX == null ? 50 : nonnegative(props.focusX, 100);
  props.focusY = props.focusY == null ? 50 : nonnegative(props.focusY, 100);
  if (b.type === "testimonials")
    props.items.forEach((it: Props) => {
      it.stars = Math.floor(nonnegative(it.stars, 5));
    });
  return {
    id: /^[a-zA-Z0-9_-]{1,80}$/.test(b.id || "") ? b.id! : uid(),
    type: b.type,
    props,
    hidden: !!b.hidden,
    anchor:
      /^[a-zA-Z][\w-]{0,60}$/.test(b.anchor || "") && b.anchor !== "order"
        ? b.anchor
        : "",
    spacing: ["compact", "comfortable", "generous"].includes(b.spacing || "")
      ? b.spacing
      : "",
  };
}

export function makeBlock(type: BlockType, props?: Props): Block {
  return normalizeBlock({
    id: uid(),
    type,
    props: props ? clone(props) : {},
  }) as Block;
}
