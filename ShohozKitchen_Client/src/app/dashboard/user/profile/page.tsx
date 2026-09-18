"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { updateUser } from '@/redux/slices/authSlice';
import { useUpdateProfileMutation, useGetMyAddressesQuery } from '@/redux/api/userApi';
import { useUploadMyImagesMutation } from '@/redux/api/uploadApi';
import {
    FiUser, FiSave, FiCamera, FiMail, FiPhone, FiLock, FiMapPin,
    FiEdit2, FiX, FiShield, FiCheckCircle,
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
    const { user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const [updateProfile, { isLoading }] = useUpdateProfileMutation();
    const [uploadMyImages] = useUploadMyImagesMutation();
    const { data: addrRes } = useGetMyAddressesQuery(undefined);

    const savedAddresses: any[] = addrRes?.data || [];
    const defaultAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0] || null;
    const addressText = defaultAddress
        ? [defaultAddress.address, defaultAddress.area, defaultAddress.city, defaultAddress.postalCode].filter(Boolean).join(', ')
        : '';

    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '' });

    const [showPw, setShowPw] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isChangingPw, setIsChangingPw] = useState(false);

    useEffect(() => {
        if (user) setForm({ name: user.name || '', phone: user.phone || '' });
    }, [user]);

    // ── Avatar upload (real — Cloudinary via /upload/my-images) ──
    const pickAvatar = () => fileRef.current?.click();
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('images', file);
            const res = await uploadMyImages(fd).unwrap();
            const url = res?.data?.urls?.[0];
            if (!url) throw new Error('Upload failed');
            await updateProfile({ avatar: url }).unwrap();
            dispatch(updateUser({ avatar: url }));
            toast.success('Profile photo updated!');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to upload photo');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    // ── Save personal info ──
    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        try {
            await updateProfile({ name: form.name, phone: form.phone }).unwrap();
            dispatch(updateUser({ name: form.name, phone: form.phone }));
            toast.success('Profile updated successfully!');
            setEditing(false);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to update profile');
        }
    };

    const cancelEdit = () => {
        setForm({ name: user?.name || '', phone: user?.phone || '' });
        setEditing(false);
    };

    // ── Change password ──
    const handlePasswordChange = async () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword) { toast.error('Fill in all password fields'); return; }
        if (passwordForm.newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
        setIsChangingPw(true);
        try {
            await updateProfile({ currentPassword: passwordForm.currentPassword, password: passwordForm.newPassword }).unwrap();
            toast.success('Password changed successfully!');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPw(false);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to change password');
        } finally {
            setIsChangingPw(false);
        }
    };

    const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 outline-none text-sm transition-all";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2";

    const InfoRow = ({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value?: string; hint?: React.ReactNode }) => (
        <div className="flex items-start gap-3 py-3.5 border-b border-gray-50 last:border-0">
            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5">{label}{hint}</p>
                <p className="text-sm text-gray-800 font-semibold mt-0.5 break-words">{value || <span className="text-gray-300 font-normal">Not set</span>}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-3xl">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

            {/* ── Cover / Avatar header ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[#4338CA] flex items-center justify-center text-white text-4xl font-bold shadow-lg ring-4 ring-white overflow-hidden">
                                {user?.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (user?.name?.charAt(0)?.toUpperCase() || 'U')}
                            </div>
                            <button
                                onClick={pickAvatar}
                                disabled={uploading}
                                title="Change photo"
                                className="absolute -bottom-1 -right-1 w-9 h-9 bg-white border-2 border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all shadow-sm disabled:opacity-60"
                            >
                                {uploading
                                    ? <span className="w-4 h-4 border-2 border-gray-300 border-t-[var(--color-primary)] rounded-full animate-spin" />
                                    : <FiCamera size={15} />}
                            </button>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold text-gray-900 truncate">{user?.name || 'User'}</h1>
                            <p className="text-sm text-gray-400 truncate">{user?.email}</p>
                            <span className="inline-block mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-full px-2.5 py-0.5">
                                {user?.role || 'user'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Personal information (view ↔ edit) ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-bold text-gray-800">Personal Information</h2>
                    {!editing ? (
                        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-lg transition-all">
                            <FiEdit2 size={14} /> Edit
                        </button>
                    ) : (
                        <button onClick={cancelEdit} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all">
                            <FiX size={15} /> Cancel
                        </button>
                    )}
                </div>

                {!editing ? (
                    <div className="mt-2">
                        <InfoRow icon={<FiUser size={16} />} label="Full Name" value={user?.name} />
                        <InfoRow icon={<FiMail size={16} />} label="Email" value={user?.email} hint={<span className="text-[10px] bg-gray-100 text-gray-400 rounded px-1.5 py-0.5">Login ID</span>} />
                        <InfoRow icon={<FiPhone size={16} />} label="Phone" value={user?.phone} />
                        <InfoRow
                            icon={<FiMapPin size={16} />}
                            label="Default Address"
                            value={addressText}
                            hint={<a href="/dashboard/user/addresses" className="text-[11px] text-[var(--color-primary)] hover:underline font-semibold">Manage →</a>}
                        />
                    </div>
                ) : (
                    <div className="mt-4 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className={labelCls}><FiUser size={12} className="inline mr-1" /> Full Name</label>
                                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Your full name" />
                            </div>
                            <div>
                                <label className={labelCls}><FiPhone size={12} className="inline mr-1" /> Phone</label>
                                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="01XXXXXXXXX" />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelCls}><FiMail size={12} className="inline mr-1" /> Email (cannot be changed)</label>
                                <input type="email" value={user?.email || ''} disabled className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={cancelEdit} className="px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
                            <button onClick={handleSave} disabled={isLoading} className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:brightness-95 transition-all shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-50 flex items-center gap-2">
                                <FiSave size={16} /> {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Sign-in & Security ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2"><FiShield size={17} className="text-[var(--color-primary)]" /> Sign-in & Security</h2>
                <p className="text-xs text-gray-400 mb-5">How you sign in to your Shohoz Kitchen account</p>

                {/* Current method */}
                <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500"><FiLock size={15} /></div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Email & Password</p>
                            <p className="text-xs text-gray-400">{user?.email}</p>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><FiCheckCircle size={13} /> Active</span>
                </div>

                {/* Google (placeholder — needs OAuth setup) */}
                <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-gray-100 mt-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center"><FcGoogle size={18} /></div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Google</p>
                            <p className="text-xs text-gray-400">Sign in faster with your Gmail</p>
                        </div>
                    </div>
                    <button
                        onClick={() => toast('Google sign-in is coming soon — setup in progress.', { icon: '🔧' })}
                        className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-all"
                    >
                        Connect
                    </button>
                </div>

                {/* Change password */}
                <div className="mt-5">
                    {!showPw ? (
                        <button onClick={() => setShowPw(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-all">
                            <FiLock size={14} /> Change Password
                        </button>
                    ) : (
                        <div className="border border-gray-100 rounded-xl p-5 bg-gray-50/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-700">Change Password</h3>
                                <button onClick={() => { setShowPw(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="text-gray-400 hover:text-gray-600"><FiX size={16} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Current</label>
                                    <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className={inputCls} placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className={labelCls}>New</label>
                                    <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className={inputCls} placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className={labelCls}>Confirm</label>
                                    <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className={inputCls} placeholder="••••••••" />
                                </div>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button onClick={handlePasswordChange} disabled={isChangingPw} className="px-6 py-2.5 bg-gray-800 text-white rounded-xl font-semibold text-sm hover:bg-gray-900 transition-all disabled:opacity-50 flex items-center gap-2">
                                    <FiLock size={15} /> {isChangingPw ? 'Changing...' : 'Update Password'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
