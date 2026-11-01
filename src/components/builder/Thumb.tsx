'use client';
/* A scaled picture of a seller's page, rendered at desktop width and shrunk to fit its box. */
import { useEffect, useRef, useState } from 'react';
import SalesPage from '@/components/page/SalesPage';
import type { Page } from '@/lib/types';

export default function Thumb({ page, width = 1200, className = 'thumb' }: { page: Page; width?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.22);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => el.clientWidth && setK(el.clientWidth / width);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} className={className} aria-hidden="true" inert>
      <div className="tframe" style={{ width, transform: `scale(${k})` }}>
        <SalesPage page={page} mode="thumb" />
      </div>
    </div>
  );
}
