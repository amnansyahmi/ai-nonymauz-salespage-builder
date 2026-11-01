"use client";
import { useEffect } from "react";
export function trackPageEvent(
  slug: string | null | undefined,
  event: "visit" | "cta" | "whatsapp",
) {
  if (!slug) return;
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, event }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* activity never blocks the page */
  }
}
export function PageTracking({ slug }: { slug: string }) {
  useEffect(() => {
    const key = "nonymauz.visit." + slug;
    try {
      if (!sessionStorage.getItem(key)) {
        trackPageEvent(slug, "visit");
        sessionStorage.setItem(key, "1");
      }
    } catch {
      trackPageEvent(slug, "visit");
    }
    const click = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest("a.sp-btn,a.sp-band")) trackPageEvent(slug, "cta");
      if (t.closest("a.sp-wa")) trackPageEvent(slug, "whatsapp");
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, [slug]);
  return null;
}
