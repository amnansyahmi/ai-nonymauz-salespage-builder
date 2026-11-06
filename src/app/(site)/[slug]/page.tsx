/* A published salespage, rendered on the server: fast first paint, real titles and link previews. */
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { cache } from "react";
import { PageTracking } from "@/components/page/tracking";
import SalesPage from "@/components/page/SalesPage";
import { normalizePage } from "@/lib/page";
import { fontsURL } from "@/lib/theme";
import { plain } from "@/lib/format";
import { livePage } from "@/lib/server/data";

/* Cached for 5 minutes; publishing, taking offline and restoring refresh it at once (revalidatePath). */
export const revalidate = 300;
/* No pages are built ahead of time; each is cached on its first visit (on-demand ISR). */
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

const load = cache(async (slug: string) => {
  if (!process.env.DATABASE_URL || !/^[a-z0-9-]{1,48}$/.test(slug)) return null;
  const data = await livePage(slug);
  if (!data) return null;
  return normalizePage({
    ...data.data,
    id: data.slug,
    name: data.name,
    slug: data.slug,
    published: true,
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page) return { title: "Page not found" };
  const hero = page.blocks.find((b) => b.type === "hero");
  const title =
    page.settings.seoTitle || plain(hero?.props.headline) || page.name;
  const description =
    page.settings.seoDesc || plain(hero?.props.sub) || undefined;
  const image = page.blocks
    .map((b) => b.props.image)
    .find((src) => typeof src === "string" && /^https?:/.test(src));
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const page = await load((await params).slug);
  return page ? { themeColor: page.theme.primary } : {};
}

export default async function PublishedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const page = await load((await params).slug);
  if (!page) notFound();
  const pixel = String(page.settings.pixelId || "").trim();
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href={fontsURL([page.theme.font])}
        precedence="default"
      />
      <style>{`html{scroll-behavior:smooth}body{margin:0;background:${page.theme.bg}}`}</style>
      <SalesPage page={page} mode="live" />
      <PageTracking slug={page.slug!} />
      {/^\d{5,20}$/.test(pixel) && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
