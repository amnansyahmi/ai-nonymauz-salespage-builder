import type { Metadata, Viewport } from 'next';
import '@/styles/salespage.css';

export const metadata: Metadata = {
  title: { default: 'Nonymauz', template: '%s' },
  description: 'Build a salespage with WhatsApp ordering in minutes. Made for small businesses, no coding needed.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
