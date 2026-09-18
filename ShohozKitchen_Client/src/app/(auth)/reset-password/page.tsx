"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useResetPasswordMutation } from '@/redux/api/authApi';
import { toast } from 'react-hot-toast';
import { FiLock, FiEye, FiEyeOff, FiArrowRight, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const inputCls =
    'w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15';

const ResetPasswordInner = () => {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [showPassword, setShowPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [done, setDone] = useState(false);

    const [resetPassword, { isLoading }] = useResetPasswordMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match.', { duration: 4000 });
            return;
        }
        try {
            await resetPassword({ token, newPassword }).unwrap();
            setDone(true);
            toast.success('Password reset! You can now sign in.', {
                style: { borderRadius: '10px', background: 'var(--color-primary)', color: '#fff' },
            });
        } catch (err: any) {
            toast.error(err?.data?.message || 'This link is invalid or expired. Request a new one.', { duration: 4000 });
        }
    };

    return (
        <div className="bg-white rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-900/5 border border-slate-100">

            {done ? (
                <div className="text-center py-2">
                    <div className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center bg-green-100">
                        <FiCheckCircle size={28} className="text-green-600" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Password updated</h1>
                    <p className="mt-1.5 text-sm text-slate-500">Your password has been changed successfully.</p>
                    <Link
                        href="/login"
                        className="mt-6 w-full py-3.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                    >
                        Continue to sign in <FiArrowRight size={17} />
                    </Link>
                </div>
            ) : !token ? (
                <div className="py-1 text-center">
                    <div className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center bg-red-100">
                        <FiAlertCircle size={28} className="text-red-600" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Invalid reset link</h1>
                    <p className="mt-1.5 text-sm text-slate-500">This link is missing its token. Please request a new one.</p>
                    <Link
                        href="/forgot-password"
                        className="mt-6 w-full py-3.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                    >
                        Request a new link <FiArrowRight size={17} />
                    </Link>
                </div>
            ) : (
                <>
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Set a new password</h1>
                        <p className="mt-1.5 text-sm text-slate-500">Choose a strong password you don&apos;t use elsewhere.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">New password</label>
                            <div className="relative group">
                                <FiLock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className={`${inputCls} pr-11`}
                                    placeholder="At least 6 characters"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Confirm new password</label>
                            <div className="relative group">
                                <FiLock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className={inputCls}
                                    placeholder="Re-enter your new password"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 mt-1 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                            style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Updating…
                                </>
                            ) : (
                                <>Reset password <FiArrowRight size={17} /></>
                            )}
                        </button>
                    </form>
                </>
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

const ResetPasswordPage = () => (
    <Suspense fallback={<div className="p-10 text-center text-[var(--color-primary)]">Loading…</div>}>
        <ResetPasswordInner />
    </Suspense>
);

export default ResetPasswordPage;
