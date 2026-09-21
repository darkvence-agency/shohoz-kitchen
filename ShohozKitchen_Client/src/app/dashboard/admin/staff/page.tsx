/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * Staff — everyone who can sign in to this dashboard. Super admin only (see
 * SUPERADMIN_ONLY in components/admin/access.ts); the role and account endpoints
 * behind it are superadmin-gated on the server as well.
 *
 * Kept apart from Customers on purpose: buyers and staff are different lists with
 * different actions, and mixing them made both harder to read.
 */
import React, { useEffect, useState } from 'react';
import { LuEye, LuBan, LuCircleCheck, LuUserPlus, LuUsers } from 'react-icons/lu';
import { useGetAdminUsersQuery, useGetAdminUserStatsQuery, useUpdateUserMutation } from '@/redux/api/userApi';
import { useUpdateUserRoleMutation } from '@/redux/api/roleApi';
import { useRegisterMutation } from '@/redux/api/authApi';
import { ROLE_HINT, ROLE_LABEL } from '@/components/admin/access';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import toast from 'react-hot-toast';
import {
    PageHeader, Btn, SearchInput, SelectPill, Segmented, FilterBar, StatTile, Badge, BadgeSelect, TableCard,
    TH, TD, TR, EmptyRow, SkeletonRows, Pager, RowMenu, Modal, Field, INPUT, fmtDate, type Tone,
} from '@/components/admin/ui';

const PAGE_SIZE = 10;
const COLS = 6;

const STATUS_TONE: Record<string, Tone> = { active: 'green', blocked: 'red', pending: 'amber' };

type RoleFilter = 'staff' | 'superadmin' | 'admin' | 'editor';

function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

const errMsg = (err: any, fallback: string) =>
    err?.data?.errorMessages?.[0]?.message || err?.data?.message || fallback;

const EMPTY_STAFF = { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'editor' as 'admin' | 'editor' };

export default function StaffPage() {
    const [role, setRole] = useState<RoleFilter>('staff');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const q = useDebounced(search);

    const currentUser = useSelector((s: RootState) => s.auth.user);

    const { data: usersData, isLoading, isFetching } = useGetAdminUsersQuery({
        page,
        limit: PAGE_SIZE,
        role,   // 'staff' = super admin, admin and editor together
        status: status !== 'all' ? status : undefined,
        searchTerm: q || undefined,
    });
    const { data: statsData } = useGetAdminUserStatsQuery(undefined);
    const [updateUser] = useUpdateUserMutation();
    const [updateUserRole] = useUpdateUserRoleMutation();
    const [registerUser, { isLoading: isCreating }] = useRegisterMutation();

    const rows: any[] = usersData?.data || [];
    const meta = usersData?.meta || { total: 0, totalPages: 1 };
    const s = statsData?.data?.staff || { total: 0, superadmin: 0, admin: 0, editor: 0, blocked: 0 };

    const pickRole = (r: RoleFilter) => { setRole(r); setPage(1); };
    const pickStatus = (v: string) => { setStatus(v); setPage(1); };

    /* ─── Change role ─── */
    const handleRoleChange = async (u: any, next: string) => {
        if (next === u.role) return;
        const warn = next === 'user' ? ' They will lose access to the dashboard.' : '';
        if (!window.confirm(`Change ${u.firstName}'s role to ${ROLE_LABEL[next] || next}?${warn}`)) return;
        try {
            await updateUserRole({ userId: u._id, role: next, permissions: [] }).unwrap();
            toast.success('Role updated');
        } catch (err: any) {
            toast.error(errMsg(err, 'Failed to update role'));
        }
    };

    /* ─── Block / unblock ─── */
    // Never yourself, never a super admin.
    const canBlock = (u: any) => u._id !== currentUser?.id && u.role !== 'superadmin';

    const handleToggleBlock = async (u: any) => {
        const next = u.status === 'blocked' ? 'active' : 'blocked';
        if (!window.confirm(`${next === 'blocked' ? 'Block' : 'Unblock'} ${u.firstName} ${u.lastName || ''}?`)) return;
        try {
            await updateUser({ id: u._id, status: next }).unwrap();
            toast.success(next === 'blocked' ? 'Blocked' : 'Unblocked');
        } catch (err: any) {
            toast.error(errMsg(err, 'Failed to update status'));
        }
    };

    /* ─── Add staff ─── */
    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_STAFF);

    const handleCreate = async () => {
        if (!form.firstName.trim() || !form.email.trim() || !form.password) { toast.error('Name, email and password are required'); return; }
        if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        try {
            // Register as a user, then promote through the superadmin roles endpoint.
            // Registering sets no cookie, so the super admin stays signed in as themselves.
            const { role: newRole, ...account } = form;
            const res = await registerUser({ ...account, email: account.email.trim() }).unwrap();
            const newUserId = res?.data?.user?._id;
            if (newUserId) await updateUserRole({ userId: newUserId, role: newRole, permissions: [] }).unwrap();
            toast.success(`${ROLE_LABEL[newRole]} account created`);
            setAddOpen(false);
            setForm(EMPTY_STAFF);
        } catch (err: any) {
            toast.error(errMsg(err, 'Failed to create the account'));
        }
    };

    return (
        <div>
            <PageHeader
                title="Staff"
                subtitle="Everyone who can sign in to this dashboard, and what their role lets them open."
                actions={<Btn variant="primary" icon={<LuUserPlus size={16} />} onClick={() => setAddOpen(true)}>Add staff</Btn>}
            />

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label="All staff" value={s.total.toLocaleString('en-IN')} active={role === 'staff'} onClick={() => pickRole('staff')} />
                <StatTile label="Super admins" value={s.superadmin.toLocaleString('en-IN')} active={role === 'superadmin'} onClick={() => pickRole('superadmin')} />
                <StatTile label="Admins" value={s.admin.toLocaleString('en-IN')} active={role === 'admin'} onClick={() => pickRole('admin')} />
                <StatTile label="Editors" value={s.editor.toLocaleString('en-IN')} active={role === 'editor'} onClick={() => pickRole('editor')} />
            </div>

            <FilterBar>
                <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, phone, email…" />
                <SelectPill
                    ariaLabel="Status"
                    value={status}
                    onChange={pickStatus}
                    className="sm:w-40"
                    options={[
                        { value: 'all', label: 'All statuses' },
                        { value: 'active', label: 'Active' },
                        { value: 'blocked', label: 'Blocked' },
                    ]}
                />
            </FilterBar>

            <TableCard footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="staff" />}>
                <table className={`w-full ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                    <thead>
                        <tr>
                            <th className={`${TH} w-12`}>#</th>
                            <th className={TH}>Name</th>
                            <th className={TH}>Role</th>
                            <th className={TH}>Status</th>
                            <th className={TH}>Joined</th>
                            <th className={`${TH} w-12`} />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={COLS} /> : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>
                                <LuUsers size={28} className="mx-auto mb-2 text-gray-300" />
                                {search || status !== 'all' || role !== 'staff' ? 'Nobody matches these filters.' : 'No staff accounts.'}
                            </EmptyRow>
                        ) : rows.map((u, i) => {
                            const n = (page - 1) * PAGE_SIZE + i + 1;
                            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—';
                            const isMe = u._id === currentUser?.id;
                            return (
                                <tr key={u._id} className={TR}>
                                    <td className={`${TD} text-gray-400`}>{n}</td>
                                    <td className={TD}>
                                        <p className="font-medium text-gray-900">
                                            {fullName}
                                            {isMe && <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>}
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-400">{u.email}</p>
                                    </td>
                                    <td className={TD}>
                                        {/* A super admin's role is fixed here, including your own. */}
                                        {u.role !== 'superadmin' && !isMe ? (
                                            <BadgeSelect
                                                ariaLabel="Role"
                                                tone="purple"
                                                value={u.role}
                                                onChange={(r) => handleRoleChange(u, r)}
                                                options={[{ value: 'admin', label: 'Admin' }, { value: 'editor', label: 'Editor' }, { value: 'user', label: 'Customer' }]}
                                            />
                                        ) : <Badge tone="purple">{ROLE_LABEL[u.role] || u.role}</Badge>}
                                    </td>
                                    <td className={TD}><Badge tone={STATUS_TONE[u.status] || 'gray'}><span className="capitalize">{u.status}</span></Badge></td>
                                    <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtDate(u.createdAt)}</td>
                                    <td className={`${TD} text-right`}>
                                        <RowMenu items={[
                                            { label: 'View details', icon: <LuEye size={15} />, href: `/dashboard/admin/customers/${u._id}` },
                                            u.status === 'blocked'
                                                ? { label: 'Unblock', icon: <LuCircleCheck size={15} />, onClick: () => handleToggleBlock(u), hidden: !canBlock(u) }
                                                : { label: 'Block', icon: <LuBan size={15} />, onClick: () => handleToggleBlock(u), danger: true, hidden: !canBlock(u) },
                                        ]} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableCard>

            {/* ═══ Add staff: admin or editor ═══ */}
            <Modal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                title="Add staff"
                subtitle={ROLE_HINT[form.role]}
                footer={<>
                    <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
                    <Btn variant="primary" onClick={handleCreate} disabled={isCreating}>{isCreating ? 'Creating…' : `Create ${ROLE_LABEL[form.role].toLowerCase()}`}</Btn>
                </>}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Role" required className="sm:col-span-2">
                        <Segmented
                            value={form.role}
                            onChange={(r) => setForm({ ...form, role: r })}
                            options={[{ value: 'editor', label: 'Editor' }, { value: 'admin', label: 'Admin' }]}
                        />
                    </Field>
                    <Field label="First name" required>
                        <input className={INPUT} value={form.firstName} autoFocus onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                    </Field>
                    <Field label="Last name">
                        <input className={INPUT} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    </Field>
                    <Field label="Email" required className="sm:col-span-2" hint="They sign in with this.">
                        <input className={INPUT} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </Field>
                    <Field label="Phone">
                        <input className={INPUT} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </Field>
                    <Field label="Password" required hint="At least 6 characters.">
                        <input className={INPUT} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    </Field>
                </div>
            </Modal>
        </div>
    );
}
