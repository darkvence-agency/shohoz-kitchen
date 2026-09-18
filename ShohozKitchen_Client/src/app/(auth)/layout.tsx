import React from 'react';
import Link from 'next/link';
import Logo from '@/components/shared/Logo';

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">

            {/* ── Soft aurora background ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                    className="absolute -top-32 -left-24 w-[440px] h-[440px] rounded-full blur-3xl opacity-40"
                    style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}
                />
                <div
                    className="absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full blur-3xl opacity-30"
                    style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }}
                />
                <div
                    className="absolute -bottom-40 left-1/4 w-[420px] h-[420px] rounded-full blur-3xl opacity-20"
                    style={{ background: 'radial-gradient(circle, #22C55E 0%, transparent 70%)' }}
                />
                {/* faint grid texture */}
                <div
                    className="absolute inset-0 opacity-[0.4]"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)',
                        backgroundSize: '36px 36px',
                        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%)',
                    }}
                />
            </div>

            {/* ── Brand (centered, above the card) ── */}
            <Link href="/" className="relative z-10 mb-7 inline-flex items-center group transition-transform hover:scale-[1.02]">
                <Logo size={104} />
            </Link>

            {/* ── Form card slot ── */}
            <div className="relative z-10 w-full max-w-[420px]">
                {children}
            </div>

            {/* ── Footer ── */}
            <p className="relative z-10 mt-7 text-[12px] text-slate-400 text-center max-w-sm">
                By continuing you agree to our{' '}
                <Link href="/terms" className="text-slate-500 hover:text-[var(--color-primary)] underline-offset-2 hover:underline">Terms</Link>{' '}
                &amp;{' '}
                <Link href="/privacy" className="text-slate-500 hover:text-[var(--color-primary)] underline-offset-2 hover:underline">Privacy Policy</Link>.
            </p>
        </div>
    );
}
