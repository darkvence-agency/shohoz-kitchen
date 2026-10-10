"use client";

// No cart step any more — buying goes straight to checkout. Any old /cart link
// or bookmark just sends the shopper back to the storefront.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/');
    }, [router]);
    return null;
}
