"use client";

import React, { useState } from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { logout } from '@/redux/slices/authSlice';
import { useRouter } from 'next/navigation';
import { useUpdatePasswordMutation } from '@/redux/api/authApi';
import { FiLock, FiEye, FiEyeOff, FiLogOut } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 40px 10px 14px',
    fontSize: '13px', border: '1px solid #e5e7eb',
    borderRadius: '6px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    color: '#111', background: '#fff',
    transition: 'border-color 0.2s',
};

// NOTE: defined at module scope (NOT inside SettingsPage). A component defined inside
// the render body gets a new function identity every render, so React would unmount &
// remount this input on each keystroke — making the password fields lose focus after
// every character. Hoisting it fixes that.
const Field = ({
    label, value, onChange, show: showPw, onToggle,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
}) => (
    <div>
        <label style={{ fontSize: '12px', fontWeight: 700, color: '#555', display: 'block', marginBottom: '6px' }}>
            {label}
        </label>
        <div style={{ position: 'relative' }}>
            <input
                type={showPw ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#555')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
            <button
                type="button"
                onClick={onToggle}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0 }}
            >
                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            </button>
        </div>
    </div>
);

export default function SettingsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [updatePassword, { isLoading }] = useUpdatePasswordMutation();

    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [show, setShow] = useState({ current: false, newPw: false, confirm: false });

    const handleLogout = () => {
        dispatch(logout());
        localStorage.removeItem('token');
        router.push('/');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
            toast.error('All fields are required.'); return;
        }
        if (form.newPassword !== form.confirmPassword) {
            toast.error('New passwords do not match.'); return;
        }
        if (form.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters.'); return;
        }
        try {
            await updatePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }).unwrap();
            toast.success('Password changed successfully!');
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to change password.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '520px' }}>

            {/* Header */}
            <div>
                <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                    Account Settings
                </h1>
                <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Change your password below</p>
            </div>

            {/* Password Change */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <FiLock size={15} color="#555" />
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#111', margin: 0 }}>Change Password</h2>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <Field
                        label="Current Password"
                        value={form.currentPassword}
                        onChange={(v) => setForm({ ...form, currentPassword: v })}
                        show={show.current}
                        onToggle={() => setShow({ ...show, current: !show.current })}
                    />
                    <Field
                        label="New Password"
                        value={form.newPassword}
                        onChange={(v) => setForm({ ...form, newPassword: v })}
                        show={show.newPw}
                        onToggle={() => setShow({ ...show, newPw: !show.newPw })}
                    />
                    <Field
                        label="Confirm New Password"
                        value={form.confirmPassword}
                        onChange={(v) => setForm({ ...form, confirmPassword: v })}
                        show={show.confirm}
                        onToggle={() => setShow({ ...show, confirm: !show.confirm })}
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            marginTop: '6px', padding: '11px', background: isLoading ? '#ccc' : '#222',
                            color: '#fff', border: 'none', borderRadius: '6px',
                            fontSize: '13px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                            letterSpacing: '0.5px',
                        }}
                    >
                        {isLoading ? 'Saving...' : 'SAVE PASSWORD'}
                    </button>
                </form>
            </div>

            {/* Logout */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#111', margin: '0 0 2px' }}>Logout</p>
                    <p style={{ fontSize: '11px', color: '#aaa', margin: 0 }}>Sign out from your account</p>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px', background: '#f5f5f5', color: '#333',
                        border: '1px solid #e5e7eb', borderRadius: '6px',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    <FiLogOut size={13} /> Logout
                </button>
            </div>
        </div>
    );
}
