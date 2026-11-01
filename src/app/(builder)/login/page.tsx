import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Login from '@/components/builder/Login';
import { hasSupabase } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Log in · Nonymauz' };

export default function LoginPage() {
  if (!hasSupabase) redirect('/dashboard');
  return <Suspense><Login /></Suspense>;
}
