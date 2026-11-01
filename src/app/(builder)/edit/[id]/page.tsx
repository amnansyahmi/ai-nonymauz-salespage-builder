import type { Metadata } from 'next';
import Editor from '@/components/builder/Editor';
import { ToastProvider } from '@/components/builder/ui';

export const metadata: Metadata = { title: 'Editor · Nonymauz' };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ToastProvider><Editor id={id} /></ToastProvider>;
}
