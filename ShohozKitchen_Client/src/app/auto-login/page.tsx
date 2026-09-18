'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutoLoginPage() {
    const router = useRouter();

    useEffect(() => {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const token = params.get('token');
        const redirect = params.get('redirect') || '/';

        if (token) {
            localStorage.setItem('token', token);
            window.location.href = redirect;
        } else {
            router.replace('/');
        }
    }, [router]);

    return (
        <div className="fixed inset-0 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Signing in…</p>
        </div>
    );
}
