import { redirect } from 'next/navigation';

// The Digital marketing menu links straight to its pages; the bare address opens the first.
export default function MarketingIndex() {
    redirect('/dashboard/admin/marketing/tag-manager');
}
