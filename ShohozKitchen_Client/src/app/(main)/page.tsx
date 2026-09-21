import { Suspense } from 'react';
import type { Metadata } from 'next';
import NewHomePage from '@/components/home/NewHomePage';

// No title or description here: the homepage uses exactly what the super admin sets
// under Digital marketing → SEO (see the root layout's generateMetadata).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <NewHomePage />
    </Suspense>
  );
}
