"use client";

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useVerifyEmailMutation, useResendVerificationMutation } from '@/redux/api/authApi';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiMail, FiArrowRight, FiRefreshCw } from 'react-icons/fi';

const inputCls =
    'w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15';

type Status = 'verifying' | 'success' | 'error' | 'missing';

const VerifyEmailInner = () => {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing');
    const [email, setEmail] = useState('');
    const [devLink, setDevLink] = useState<string | null>(null);
    const ranRef = useRef(false);

    const [verifyEmail] = useVerifyEmailMutation();
    const [resendVerification, { isLoading: isResending }] = useResendVerificationMutation();

    useEffect(() => {
        if (!token || ranRef.current) return;
        ranRef.current = true;
        (async () => {
            try {
                await verifyEmail({ token }).unwrap();
                setStatus('success');
            } catch {
                setStatus('error');
            }
        })();
    }, [token, verifyEmail]);

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        if (!value) return;
        try {
            const res = await resendVerification({ email: value }).unwrap();
            const verifyLink = res?.data?.dev?.verifyLink as string | undefined;
            if (verifyLink) {
                toast.success('Verification link generated (dev mode).', {
                    style: { borderRadius: '10px', background: 'var(--color-primary)', color: '#fff' },
                });
            } else {
                toast.success('If that email needs verifying, a new link is on its way.', {
                    duration: 4000,
                    style: { borderRadius: '10px', background: 'var(--color-primary)', color: '#fff' },
                });
            }
            if (verifyLink && typeof window !== 'undefined') {
                // Surface the dev link inline by switching the status panel.
                setStatus('error');
                setDevLink(verifyLink);
            }
        } catch (err: any) {
            toast.error(err?.data?.message || 'Could not resend. Please try again.', { duration: 4000 });
        }
    };

    return (
        <div className="bg-white rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-900/5 border border-slate-100">

            {status === 'verifying' && (
                <div className="text-center py-4">
                    <div className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--color-primary)]/10">
                        <span className="w-7 h-7 border-[3px] border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Verifying your email…</h1>
                    <p className="mt-1.5 text-sm text-slate-500">Hold on a moment while we confirm your address.</p>
                </div>
            )}

            {status === 'success' && (
                <div className="text-center py-2">
                    <div className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center bg-green-100">
                        <FiCheckCircle size={28} className="text-green-600" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Email verified!</h1>
                    <p className="mt-1.5 text-sm text-slate-500">Your account is all set. You can now sign in.</p>
                    <Link
                        href="/login"
                        className="mt-6 w-full py-3.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                    >
                        Continue to sign in <FiArrowRight size={17} />
                    </Link>
                </div>
            )}

            {(status === 'error' || status === 'missing') && (
                <div className="py-1">
                    <div className="text-center">
                        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center bg-red-100">
                            <FiXCircle size={28} className="text-red-600" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                            {status === 'missing' ? 'No verification token' : 'Verification failed'}
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            {status === 'missing'
                                ? 'This link is missing its token. Request a new verification email below.'
                                : 'This link is invalid or has expired. Enter your email to get a fresh one.'}
                        </p>
                    </div>

                    {devLink && (
                        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-[12px] font-bold text-amber-700 m-0">Dev mode — verification link</p>
                            <a href={devLink} className="text-[12px] text-amber-700 break-all underline">{devLink}</a>
                        </div>
                    )}

                    <form onSubmit={handleResend} className="mt-6 space-y-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Email address</label>
                            <div className="relative group">
                                <FiMail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className={inputCls}
                                    placeholder="name@example.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isResending}
                            className="w-full py-3.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                            style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                        >
                            {isResending ? (
                                <>
                                    <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending…
                                </>
                            ) : (
                                <>Resend verification email <FiRefreshCw size={16} /></>
                            )}
                        </button>
                    </form>
                </div>
            )}

            <div className="mt-7 pt-6 border-t border-slate-100 text-center">
                <p className="text-[13px] text-slate-500">
                    Back to{' '}
                    <Link href="/login" className="font-bold text-[var(--color-primary)] hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

const VerifyEmailPage = () => (
    <Suspense fallback={<div className="p-10 text-center text-[var(--color-primary)]">Loading…</div>}>
        <VerifyEmailInner />
    </Suspense>
);

export default VerifyEmailPage;
