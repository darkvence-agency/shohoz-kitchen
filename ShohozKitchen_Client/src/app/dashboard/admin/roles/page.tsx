"use client";

import React, { useState, useEffect } from 'react';
import {
    FiSearch,
    FiEdit2,
    FiRefreshCw,
    FiX,
    FiShield,
    FiUser,
    FiInfo,
    FiLock,
} from 'react-icons/fi';
import {
    useGetStaffQuery,
    useUpdateUserRoleMutation,
} from '@/redux/api/roleApi';
import toast from 'react-hot-toast';
import AuthGuard from '@/components/shared/AuthGuard';
import { ROLE_ACCESS, ROLE_HINT, type StaffRole } from '@/components/admin/access';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLE_META: Record<string, { label: string; color: string }> = {
    superadmin: { label: 'Super Admin', color: 'text-purple-700 bg-purple-50' },
    admin: { label: 'Admin', color: 'text-[var(--color-primary)] bg-[var(--color-primary-lightest)]' },
    editor: { label: 'Editor', color: 'text-sky-700 bg-sky-50' },
    user: { label: 'User', color: 'text-gray-600 bg-gray-100' },
};

const ROLE_OPTIONS = [
    { id: 'editor', label: 'Editor', icon: FiShield, hint: 'Orders and products' },
    { id: 'admin', label: 'Admin', icon: FiShield, hint: 'Runs the shop, no money' },
    { id: 'superadmin', label: 'Super Admin', icon: FiLock, hint: 'Full unrestricted access' },
] as const;

const fullName = (u: any) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;

const asStaffRole = (r?: string): StaffRole => (r === 'superadmin' || r === 'editor' ? r : 'admin');

// Access follows the role (components/admin/access.ts on the client, authorizeRoles on
// the server); there are no per-person permission switches.
const RoleModal = ({
    isOpen,
    onClose,
    onSubmit,
    editing,
    isSaving,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { role: string; permissions: string[] }) => void;
    editing?: any;
    isSaving: boolean;
}) => {
    const [role, setRole] = useState<StaffRole>('admin');

    useEffect(() => {
        setRole(asStaffRole(editing?.role));
    }, [editing, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-md w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">Change role</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{editing ? fullName(editing) : ''} · {editing?.email}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-gray-100 rounded-full transition-colors"><FiX size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Role</label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {ROLE_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setRole(option.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-md border transition-all gap-1.5 ${role === option.id
                                        ? 'bg-[var(--color-primary-lightest)] border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    <option.icon size={18} />
                                    <span className="text-[11px] font-bold uppercase">{option.label}</span>
                                    <span className="text-[9px] text-gray-400 font-normal">{option.hint}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* What this role can do (the server enforces the same rules) */}
                    <div className="space-y-2 border-t border-gray-100 pt-4">
                        <label className="text-xs font-bold text-gray-500 uppercase">Access</label>
                        <ul className="space-y-1.5">
                            {ROLE_ACCESS[role].map((line) => (
                                <li key={line} className="flex items-start gap-2 text-xs text-gray-700">
                                    <FiInfo size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button
                        onClick={() => onSubmit({ role, permissions: [] })}
                        disabled={isSaving}
                        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold shadow-md hover:bg-[var(--color-primary-dark)] transition-all disabled:opacity-60"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

function RolesPageInner() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [search, setSearch] = useState('');

    const { data: staffData, isLoading, refetch } = useGetStaffQuery(undefined);
    const [updateUserRole, { isLoading: isSaving }] = useUpdateUserRoleMutation();

    const handleSubmit = async (data: { role: string; permissions: string[] }) => {
        if (!editing) return;
        try {
            await updateUserRole({ userId: editing._id, ...data }).unwrap();
            toast.success('Role updated');
            setIsModalOpen(false);
        } catch (err: any) {
            toast.error(err.data?.message || 'Update failed');
        }
    };

    const staff = staffData?.data || [];
    const filtered = staff.filter((u: any) => {
        const q = search.toLowerCase();
        return (
            fullName(u).toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Roles &amp; Permissions</h1>
                    <p className="text-gray-500 mt-1">Who works in the admin panel, and what each role can open.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => refetch()}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm">
                        <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* The three staff roles */}
            <div className="grid gap-3 md:grid-cols-3">
                {ROLE_OPTIONS.map((option) => (
                    <div key={option.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ROLE_META[option.id].color}`}>{option.label}</span>
                        </div>
                        <p className="mb-2 text-xs text-gray-500">{ROLE_HINT[option.id]}</p>
                        <ul className="space-y-1">
                            {ROLE_ACCESS[option.id].map((line) => (
                                <li key={line} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-sm">
                <FiInfo size={16} className="mt-0.5 flex-shrink-0" />
                <span>Only a <b>Super Admin</b> can change roles. New staff are added from <b>Settings → Staff → Add staff</b>.</span>
            </div>

            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm flex gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
                </div>
            </div>

            <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Member</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Access</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-4"><div className="h-12 bg-gray-100 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No staff members found.</td></tr>
                            ) : (
                                filtered.map((u: any) => {
                                    const meta = ROLE_META[u.role] || ROLE_META.user;
                                    return (
                                        <tr key={u._id} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {u.avatar ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-[var(--color-primary-lightest)] flex items-center justify-center text-[var(--color-primary)]">
                                                            <FiUser size={18} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{fullName(u)}</p>
                                                        <p className="text-xs text-gray-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${meta.color}`}>{meta.label}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 max-w-xs">
                                                {ROLE_HINT[asStaffRole(u.role)]}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${u.status === 'active' || !u.status ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {u.status || 'active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setEditing(u); setIsModalOpen(true); }} aria-label={`Change ${fullName(u)}'s role`}
                                                        className="p-2 text-gray-400 hover:text-[var(--color-primary)] bg-gray-50 rounded-md border border-gray-100 transition-colors"><FiEdit2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <RoleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                editing={editing}
                isSaving={isSaving}
            />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}

// Roles & Permissions is a SUPER ADMIN–only panel. Plain admins are redirected away,
// and the backend role endpoints are also superadmin-gated (defence in depth).
export default function RolesPage() {
    return (
        <AuthGuard requiredRole="superadmin">
            <RolesPageInner />
        </AuthGuard>
    );
}
