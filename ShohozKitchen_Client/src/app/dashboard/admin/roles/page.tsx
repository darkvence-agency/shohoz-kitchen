"use client";

import React, { useState, useEffect } from 'react';
import {
    FiSearch,
    FiEdit2,
    FiRefreshCw,
    FiX,
    FiShield,
    FiUser,
    FiCheck,
    FiInfo,
    FiLock,
} from 'react-icons/fi';
import {
    useGetPermissionsQuery,
    useGetStaffQuery,
    useUpdateUserRoleMutation,
} from '@/redux/api/roleApi';
import toast from 'react-hot-toast';
import AuthGuard from '@/components/shared/AuthGuard';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLE_META: Record<string, { label: string; color: string }> = {
    superadmin: { label: 'Super Admin', color: 'text-purple-700 bg-purple-50' },
    admin: { label: 'Admin', color: 'text-[var(--color-primary)] bg-[var(--color-primary-lightest)]' },
    user: { label: 'User', color: 'text-gray-600 bg-gray-100' },
};

// Turn "manage_products" → "Manage Products" for the checkbox grid labels.
const prettyPerm = (perm: string) =>
    perm
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

const fullName = (u: any) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;

const RoleModal = ({
    isOpen,
    onClose,
    onSubmit,
    editing,
    permissions,
    isLoadingPermissions,
    isSaving,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { role: string; permissions: string[] }) => void;
    editing?: any;
    permissions: string[];
    isLoadingPermissions: boolean;
    isSaving: boolean;
}) => {
    const [role, setRole] = useState<'admin' | 'superadmin'>('admin');
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

    useEffect(() => {
        if (editing) {
            setRole(editing.role === 'superadmin' ? 'superadmin' : 'admin');
            setSelectedPerms(editing.permissions || []);
        } else {
            setRole('admin');
            setSelectedPerms([]);
        }
    }, [editing, isOpen]);

    if (!isOpen) return null;

    const togglePerm = (perm: string) =>
        setSelectedPerms((prev) =>
            prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
        );

    const submit = () => {
        // Super admins implicitly have every permission, so we only send perms for admins.
        onSubmit({ role, permissions: role === 'admin' ? selectedPerms : [] });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-md w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">Edit Role &amp; Permissions</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{editing ? fullName(editing) : ''} · {editing?.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><FiX size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                    {/* Role selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Role</label>
                        <div className="grid grid-cols-2 gap-3">
                            {([
                                { id: 'admin', label: 'Admin', icon: FiShield, hint: 'Granular permissions below' },
                                { id: 'superadmin', label: 'Super Admin', icon: FiLock, hint: 'Full unrestricted access' },
                            ] as const).map((option) => (
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

                    {/* Permissions grid */}
                    <div className="space-y-2 border-t border-gray-100 pt-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 uppercase">Permissions</label>
                            <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-lightest)] px-2 py-0.5 rounded-full">
                                {role === 'superadmin' ? 'All (Super Admin)' : `${selectedPerms.length} Selected`}
                            </span>
                        </div>
                        {role === 'superadmin' ? (
                            <div className="flex items-start gap-2 p-3 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                                <FiInfo size={14} className="mt-0.5 flex-shrink-0" />
                                Super Admins automatically have every permission. Individual toggles are not required.
                            </div>
                        ) : isLoadingPermissions ? (
                            <p className="text-[11px] text-gray-400 animate-pulse">Loading permissions...</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {permissions.map((perm) => {
                                    const checked = selectedPerms.includes(perm);
                                    return (
                                        <label
                                            key={perm}
                                            className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${checked
                                                ? 'bg-[var(--color-primary-lightest)] border-[var(--color-primary)]'
                                                : 'bg-gray-50/40 border-gray-100 hover:bg-white hover:border-gray-200'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => togglePerm(perm)}
                                                className="w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-0"
                                            />
                                            <span className={`text-xs font-medium ${checked ? 'text-[var(--color-primary)]' : 'text-gray-700'}`}>
                                                {prettyPerm(perm)}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button
                        onClick={submit}
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
    const { data: permissionsData, isLoading: isLoadingPermissions } = useGetPermissionsQuery(undefined);
    const [updateUserRole, { isLoading: isSaving }] = useUpdateUserRoleMutation();

    const permissions: string[] = permissionsData?.data || [];

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
                    <p className="text-gray-500 mt-1">Manage admin staff roles and their access permissions</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => refetch()}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm">
                        <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Super-admin note */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-sm">
                <FiInfo size={16} className="mt-0.5 flex-shrink-0" />
                <span>Only a <b>Super Admin</b> can change staff roles and permissions. Admins manage day-to-day operations limited to the permissions granted here.</span>
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
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Permissions</th>
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
                                    const isSuper = u.role === 'superadmin';
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
                                            <td className="px-6 py-4">
                                                {isSuper ? (
                                                    <span className="text-xs text-purple-700 font-semibold flex items-center gap-1.5">
                                                        <FiCheck size={12} /> All permissions
                                                    </span>
                                                ) : (u.permissions?.length || 0) === 0 ? (
                                                    <span className="text-xs text-gray-400 italic">None assigned</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1 max-w-md">
                                                        {(u.permissions || []).slice(0, 4).map((p: string) => (
                                                            <span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 text-gray-600">{prettyPerm(p)}</span>
                                                        ))}
                                                        {(u.permissions?.length || 0) > 4 && (
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--color-primary-lightest)] text-[var(--color-primary)]">+{u.permissions.length - 4} more</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${u.status === 'active' || !u.status ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {u.status || 'active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setEditing(u); setIsModalOpen(true); }}
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
                permissions={permissions}
                isLoadingPermissions={isLoadingPermissions}
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
