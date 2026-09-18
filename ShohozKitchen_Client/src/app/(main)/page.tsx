import { Suspense } from 'react';
import type { Metadata } from 'next';
import NewHomePage from '@/components/home/NewHomePage';

export const metadata: Metadata = {
  title: "Your trusted online marketplace",
  description: "Shohoz Kitchen is your trusted online marketplace in Bangladesh. Browse thousands of quality products at the best prices.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <NewHomePage />
    </Suspense>
  );
}
