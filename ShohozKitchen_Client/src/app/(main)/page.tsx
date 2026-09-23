import { Suspense } from 'react';
import type { Metadata } from 'next';
import HeroSection from '@/components/home/HeroSection';
import CategoryExpertise from '@/components/home/CategoryExpertise';
import NewHomePage from '@/components/home/NewHomePage';

// No title or description here: the homepage uses exactly what the super admin sets
// under Digital marketing → SEO (see the root layout's generateMetadata).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// The hero and the category row sit outside the Suspense boundary on purpose.
//
// NewHomePage reads useSearchParams(), which opts its whole subtree out of the
// prerender — so with everything inside the boundary the server sent the
// fallback and nothing else, and the page stayed blank until the JS bundle had
// downloaded, hydrated and its API calls had returned.
//
// Neither of these two reads the search params, and both render without data:
// the hero falls back to its default banner, the category row to its built-in
// list. Hoisting them means the banner is in the HTML and starts downloading
// immediately, instead of waiting on hydration. The product rows below still
// stream in behind the boundary.
export default function Home() {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(55% 45% at 88% 0%, rgba(var(--color-primary-rgb), 0.06), transparent 70%),' +
          'radial-gradient(45% 40% at 0% 22%, rgba(var(--color-primary-rgb), 0.04), transparent 70%),' +
          '#F8FAFC',
      }}
    >
      <HeroSection />
      <CategoryExpertise />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <NewHomePage />
      </Suspense>
    </div>
  );
}
