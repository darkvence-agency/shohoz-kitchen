"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/redux/hooks';
import { loginSuccess } from '@/redux/slices/authSlice';
import { useGoogleLoginMutation } from '@/redux/api/authApi';
import { toast } from 'react-hot-toast';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Load the Google Identity Services script once (resolves immediately if present).
function loadGsi(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return reject(new Error('no window'));
        if ((window as any).google?.accounts?.oauth2) return resolve();
        const existing = document.querySelector(`script[src="${GSI_SRC}"]`) as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('gsi load error')));
            if ((window as any).google?.accounts?.oauth2) resolve();
            return;
        }
        const s = document.createElement('script');
        s.src = GSI_SRC;
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('gsi load error'));
        document.head.appendChild(s);
    });
}

// Official multi-colour Google "G" mark.
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
);

interface Props {
    redirectPath?: string | null;
    label?: string;
}

const GoogleSignInButton: React.FC<Props> = ({ redirectPath, label = 'Continue with Google' }) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [googleLogin] = useGoogleLoginMutation();
    const codeClientRef = useRef<any>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!clientId) return;
        let cancelled = false;

        const onLogin = async (code: string) => {
            try {
                const res: any = await googleLogin({ code }).unwrap();
                const apiUser = res.data.user;
                const token = res.data.tokens.accessToken;
                const user = {
                    id: apiUser._id || apiUser.id,
                    name: apiUser.name || `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim() || apiUser.email,
                    email: apiUser.email,
                    phone: apiUser.phone || '',
                    role: apiUser.role || 'user',
                    avatar: apiUser.avatar || '',
                };
                dispatch(loginSuccess({ user, token }));
                localStorage.setItem('token', token);
                toast.success('Signed in with Google', {
                    style: { borderRadius: '10px', background: 'var(--color-primary)', color: '#fff' },
                    icon: '✅',
                });
                const isStaff = user.role === 'admin' || user.role === 'superadmin';
                if (isStaff) {
                    router.push(redirectPath && redirectPath.startsWith('/dashboard/admin') ? redirectPath : '/dashboard/admin');
                } else {
                    router.push(redirectPath || '/');
                }
            } catch (err: any) {
                toast.error(err?.data?.message || 'Google sign-in failed. Please try again.', { duration: 4000 });
            } finally {
                setBusy(false);
            }
        };

        loadGsi()
            .then(() => {
                if (cancelled) return;
                const google = (window as any).google;
                // Authorization-code popup flow: the server exchanges the code with
                // the client secret, so no token is ever exposed to the browser.
                codeClientRef.current = google.accounts.oauth2.initCodeClient({
                    client_id: clientId,
                    scope: 'openid email profile',
                    ux_mode: 'popup',
                    callback: (resp: any) => {
                        if (!resp?.code) { setBusy(false); return; }
                        onLogin(resp.code);
                    },
                    error_callback: () => setBusy(false),
                });
            })
            .catch(() => { /* offline / blocked */ });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId]);

    const handleClick = () => {
        if (!clientId) {
            toast.error('Google sign-in isn’t set up yet — add your Google Client ID to enable it.', { duration: 5000 });
            return;
        }
        if (!codeClientRef.current) {
            toast('Google is still loading — please try again in a moment.', { icon: '⏳' });
            return;
        }
        setBusy(true);
        codeClientRef.current.requestCode();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={busy}
            className="w-full py-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 flex items-center justify-center gap-2.5 transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed"
        >
            {busy ? (
                <span className="w-[18px] h-[18px] border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
                <GoogleIcon />
            )}
            {busy ? 'Connecting…' : label}
        </button>
    );
};

export default GoogleSignInButton;
