import type { Metadata } from 'next';
import Orders from '@/components/builder/Orders';

export const metadata: Metadata = { title: 'Orders · Nonymauz' };

export default function OrdersPage() {
  return <Orders />;
}
