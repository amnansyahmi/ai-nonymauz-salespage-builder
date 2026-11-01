'use client';
/* The seller's draft exactly as buyers will see it: the same component as the published page, in live mode. */
import { use, useEffect, useState } from 'react';
import SalesPage from '@/components/page/SalesPage';
import { store } from '@/lib/store';
import { fontsURL } from '@/lib/theme';
import type { Page } from '@/lib/types';

export default function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  useEffect(() => { store.get(id).then(setPage).catch(() => setPage(null)); }, [id]);
  if (page === undefined) return null;
  if (!page) return <p style={{ font: '16px system-ui', padding: 24 }}>This page could not be found.</p>;
  // The draft has no public link yet, so orders are not recorded from the preview.
  const draft = { ...page, slug: null };
  return (
    <>
      <link rel="stylesheet" href={fontsURL([page.theme.font])} precedence="default" />
      <style>{`html{scroll-behavior:smooth}body{margin:0;background:${page.theme.bg}}`}</style>
      <SalesPage page={draft} mode="live" />
    </>
  );
}
