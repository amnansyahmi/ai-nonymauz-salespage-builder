import type { Metadata } from 'next';
import Dashboard from '@/components/builder/Dashboard';
import { ToastProvider } from '@/components/builder/ui';

export const metadata: Metadata = { title: 'Salespages · Nonymauz' };

export default function DashboardPage() {
  return <ToastProvider><Dashboard /></ToastProvider>;
}
