/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LuPlus, LuEye, LuBan, LuCircleCheck, LuPencil, LuUserPlus, LuUsers } from 'react-icons/lu';
import {
    useGetAdminUsersQuery,
    useGetAdminUserStatsQuery,
    useUpdateUserMutation,
    useCreateCustomerMutation,
} from '@/redux/api/userApi';
import { useUpdateUserRoleMutation } from '@/redux/api/roleApi';
import { useRegisterMutation } from '@/redux/api/authApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import toast from 'react-hot-toast';
import {
    PageHeader, Btn, SearchInput, SelectPill, Segmented, FilterBar, StatTile, Badge, BadgeSelect, TableCard,
    TH, TD, TR, EmptyRow, SkeletonRows, Pager, RowMenu, Modal, Field, INPUT, taka, fmtDate, type Tone,
} from '@/components/admin/ui';

const PAGE_SIZE = 10;

const STATUS_TONE: Record<string, Tone> = { active: 'green', blocked: 'red', pending: 'amber' };

function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

const errMsg = (err: any, fallback: string) =>
    err?.data?.errorMessages?.[0]?.message || err?.data?.message || fallback;

const EMPTY_CUSTOMER = { firstName: '', lastName: '', phone: '', email: '', defaultDiscount: '', loyaltyPoints: '' };
const EMPTY_ADMIN = { firstName: '', lastName: '', email: '', phone: '', password: '' };

export default function CustomersPage() {
    const [tab, setTab] = useState<'customers' | 'staff'>('customers');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const q = useDebounced(search);

    const currentUser = useSelector((s: RootState) => s.auth.user);
    // Role changes go through the superadmin-only roles endpoint (the general user
    // update deliberately strips `role`). So the role controls are superadmin-only.
    const isSuperadmin = currentUser?.role === 'superadmin';

    const { data: usersData, isLoading, isFetching } = useGetAdminUsersQuery({
        page,
        limit: PAGE_SIZE,
        role: tab === 'customers' ? 'user' : 'admin',
        status: status !== 'all' ? status : undefined,
        searchTerm: q || undefined,
    });
    const { data: statsData } = useGetAdminUserStatsQuery(undefined);
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [createCustomer, { isLoading: isCreatingCustomer }] = useCreateCustomerMutation();
    const [updateUserRole] = useUpdateUserRoleMutation();
    const [registerUser, { isLoading: isCreatingAdmin }] = useRegisterMutation();

    const rows: any[] = usersData?.data || [];
    const meta = usersData?.meta || { total: 0, totalPages: 1 };
    const c = statsData?.data?.customers || { total: 0, active: 0, blocked: 0, newThisMonth: 0 };

    const switchTab = (t: 'customers' | 'staff') => { setTab(t); setStatus('all'); setPage(1); };
    const pickStatus = (s: string) => { setStatus(s); setPage(1); };

    /* ─── Add customer ─── */
    const [addOpen, setAddOpen] = useState(false);
    const [cForm, setCForm] = useState(EMPTY_CUSTOMER);

    const handleAddCustomer = async () => {
        if (!cForm.firstName.trim() || !cForm.phone.trim()) {
            toast.error('Name and phone number are required');
            return;
        }
        try {
            await createCustomer({
                firstName: cForm.firstName.trim(),
                lastName: cForm.lastName.trim() || undefined,
                phone: cForm.phone.trim(),
                email: cForm.email.trim() || undefined,
                defaultDiscount: cForm.defaultDiscount ? Number(cForm.defaultDiscount) : undefined,
                loyaltyPoints: cForm.loyaltyPoints ? Number(cForm.loyaltyPoints) : undefined,
            }).unwrap();
            toast.success('Customer added');
            setAddOpen(false);
            setCForm(EMPTY_CUSTOMER);
        } catch (err: any) {
            toast.error(errMsg(err, 'Failed to add customer'));
        }
    };

    /* ─── Loyalty & discount ─── */
    const [editing, setEditing] = useState<any>(null);
    const [lForm, setLForm] = useState({ loyaltyPoints: '0', defaultDiscount: '0' });

    const openLoyalty = (u: any) => {
        setEditing(u);
        setLForm({ loyaltyPoints: String(u.loyaltyPoints || 0), defaultDiscount: String(u.defaultDiscount || 0) });
    };

    const handleSaveLoyalty = async () => {
        const points = Number(lForm.loyaltyPoints || 0);
        const discount = Number(lForm.defaultDiscount || 0);
        if (!Number.isInteger(points) || points < 0) { toast.error('Points must be a whole number, 0 or more'); return; }
        if (!(discount >= 0 && discount <= 100)) { toast.error('Discount must be between 0 and 100%'); return; }
        try {
            await updateUser({ id: editing._id, loyaltyPoints: points, defaultDiscount: discount }).unwrap();
            toast.success('Saved');
            setEditing(null);
        } catch (err: any) {
            toast.error(errMsg(err, 'Failed to save'));
        }
    };

    /* ─── Block / unblock ─── */
    // Who this admin may block: never a superadmin, never yourself; only a superadmin
    // may block/unblock a fellow admin.
    const canBlock = (u: any) =>
        u._id !== currentUser?.id && u.role !== 'superadmin' && (u.role !== 'admin' || isSuperadmin);

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

    /* ─── Staff: roles + create admin ─── */
    const handleRoleChange = async (u: any, role: string) => {
        if (role === u.role) return;
        if (!window.confirm(`Change ${u.firstName}'s role to ${role === 'admin' ? 'Admin' : 'Customer'}?`)) return;
        try {
            await updateUserRole({ userId: u._id, role, permissions: [] }).unwrap();
            toast.success('Role updated');
        } catch (err: any) {
            toast.error(errMsg(err, 'Failed to update role'));
        }
    };

    const [adminOpen, setAdminOpen] = useState(false);
    const [aForm, setAForm] = useState(EMPTY_ADMIN);

    const handleCreateAdmin = async () => {
        if (!aForm.firstName || !aForm.email || !aForm.password) { toast.error('Name, email and password are required'); return; }
        if (aForm.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        try {
            // Register as a user, then promote through the superadmin roles endpoint.
            const res = await registerUser({ ...aForm }).unwrap();
            const newUserId = res?.data?.user?._id;
            if (newUserId) await updateUserRole({ userId: newUserId, role: 'admin', permissions: [] }).unwrap();
            toast.success('Admin account created');
            setAdminOpen(false);
            setAForm(EMPTY_ADMIN);
        } catch (err: any) {
            toast.error(errMsg(err, 'Failed to create admin'));
        }
    };

    const cols = tab === 'customers' ? 9 : 6;

    return (
        <div>
            <PageHeader
                title="Customers"
                subtitle={tab === 'customers'
                    ? 'Buyers, their spend, loyalty points and default discounts.'
                    : 'Staff accounts that can sign in to this dashboard.'}
                actions={<>
                    <Segmented value={tab} onChange={switchTab} options={[{ value: 'customers', label: 'Customers' }, { value: 'staff', label: 'Staff' }]} />
                    {tab === 'customers'
                        ? <Btn variant="primary" icon={<LuPlus size={16} />} onClick={() => setAddOpen(true)}>Add customer</Btn>
                        : isSuperadmin && <Btn variant="primary" icon={<LuUserPlus size={16} />} onClick={() => setAdminOpen(true)}>Create admin</Btn>}
                </>}
            />

            {tab === 'customers' && (
                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile label="Customers" value={c.total.toLocaleString('en-IN')} active={status === 'all'} onClick={() => pickStatus('all')} />
                    <StatTile label="Active" value={c.active.toLocaleString('en-IN')} active={status === 'active'} onClick={() => pickStatus('active')} />
                    <StatTile label="Blocked" value={c.blocked.toLocaleString('en-IN')} active={status === 'blocked'} onClick={() => pickStatus('blocked')} />
                    <StatTile label="New this month" value={c.newThisMonth.toLocaleString('en-IN')} />
                </div>
            )}

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
                        { value: 'pending', label: 'Pending' },
                    ]}
                />
            </FilterBar>

            <TableCard footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun={tab === 'customers' ? 'customers' : 'staff'} />}>
                <table className={`w-full ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                    <thead>
                        {tab === 'customers' ? (
                            <tr>
                                <th className={`${TH} w-12`}>#</th>
                                <th className={TH}>Customer</th>
                                <th className={TH}>Status</th>
                                <th className={`${TH} text-right`} title="Orders placed, excluding cancelled ones">Orders</th>
                                <th className={`${TH} text-right`} title="Total of delivered orders">Spent</th>
                                <th className={`${TH} text-right`}>Points</th>
                                <th className={TH}>Discount</th>
                                <th className={TH}>Joined</th>
                                <th className={`${TH} w-12`} />
                            </tr>
                        ) : (
                            <tr>
                                <th className={`${TH} w-12`}>#</th>
                                <th className={TH}>Name</th>
                                <th className={TH}>Role</th>
                                <th className={TH}>Status</th>
                                <th className={TH}>Joined</th>
                                <th className={`${TH} w-12`} />
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={cols} /> : rows.length === 0 ? (
                            <EmptyRow colSpan={cols}>
                                <LuUsers size={28} className="mx-auto mb-2 text-gray-300" />
                                {search || status !== 'all' ? 'Nobody matches these filters.' : tab === 'customers' ? 'No customers yet.' : 'No staff accounts.'}
                            </EmptyRow>
                        ) : rows.map((u, i) => {
                            const n = (page - 1) * PAGE_SIZE + i + 1;
                            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—';
                            const statusBadge = <Badge tone={STATUS_TONE[u.status] || 'gray'}><span className="capitalize">{u.status}</span></Badge>;
                            const blockItem = u.status === 'blocked'
                                ? { label: 'Unblock', icon: <LuCircleCheck size={15} />, onClick: () => handleToggleBlock(u), hidden: !canBlock(u) }
                                : { label: 'Block', icon: <LuBan size={15} />, onClick: () => handleToggleBlock(u), danger: true, hidden: !canBlock(u) };

                            return tab === 'customers' ? (
                                <tr key={u._id} className={TR}>
                                    <td className={`${TD} text-gray-400`}>{n}</td>
                                    <td className={TD}>
                                        <Link href={`/dashboard/admin/customers/${u._id}`} className="font-medium text-gray-900 hover:text-[var(--color-primary)]">{fullName}</Link>
                                        <p className="mt-0.5 text-xs text-gray-400">{u.phone || u.email}</p>
                                    </td>
                                    <td className={TD}>{statusBadge}</td>
                                    <td className={`${TD} text-right`}>{(u.orderCount || 0).toLocaleString('en-IN')}</td>
                                    <td className={`${TD} whitespace-nowrap text-right`}>{taka(u.spent)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right`}>{(u.loyaltyPoints || 0).toLocaleString('en-IN')} pts</td>
                                    <td className={TD}>{u.defaultDiscount > 0 ? <Badge tone="orange">{u.defaultDiscount}% off</Badge> : <span className="text-gray-400">-</span>}</td>
                                    <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtDate(u.createdAt)}</td>
                                    <td className={`${TD} text-right`}>
                                        <RowMenu items={[
                                            { label: 'View details', icon: <LuEye size={15} />, href: `/dashboard/admin/customers/${u._id}` },
                                            { label: 'Points & discount', icon: <LuPencil size={15} />, onClick: () => openLoyalty(u) },
                                            blockItem,
                                        ]} />
                                    </td>
                                </tr>
                            ) : (
                                <tr key={u._id} className={TR}>
                                    <td className={`${TD} text-gray-400`}>{n}</td>
                                    <td className={TD}>
                                        <p className="font-medium text-gray-900">{fullName}</p>
                                        <p className="mt-0.5 text-xs text-gray-400">{u.email}</p>
                                    </td>
                                    <td className={TD}>
                                        {isSuperadmin && u.role !== 'superadmin' ? (
                                            <BadgeSelect
                                                ariaLabel="Role"
                                                tone="purple"
                                                value={u.role}
                                                onChange={(r) => handleRoleChange(u, r)}
                                                options={[{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'Customer' }]}
                                            />
                                        ) : <Badge tone="purple">{u.role === 'superadmin' ? 'Super admin' : 'Admin'}</Badge>}
                                    </td>
                                    <td className={TD}>{statusBadge}</td>
                                    <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtDate(u.createdAt)}</td>
                                    <td className={`${TD} text-right`}>
                                        <RowMenu items={[
                                            { label: 'View details', icon: <LuEye size={15} />, href: `/dashboard/admin/customers/${u._id}` },
                                            blockItem,
                                        ]} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableCard>

            {/* ═══ Add customer ═══ */}
            <Modal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                title="Add customer"
                subtitle="For phone and walk-in buyers. They can set a password later with “Forgot password”."
                footer={<>
                    <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
                    <Btn variant="primary" onClick={handleAddCustomer} disabled={isCreatingCustomer}>{isCreatingCustomer ? 'Adding…' : 'Add customer'}</Btn>
                </>}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" required>
                        <input className={INPUT} value={cForm.firstName} autoFocus onChange={(e) => setCForm({ ...cForm, firstName: e.target.value })} />
                    </Field>
                    <Field label="Last name">
                        <input className={INPUT} value={cForm.lastName} onChange={(e) => setCForm({ ...cForm, lastName: e.target.value })} />
                    </Field>
                    <Field label="Phone" required>
                        <input className={INPUT} inputMode="tel" placeholder="01XXXXXXXXX" value={cForm.phone} onChange={(e) => setCForm({ ...cForm, phone: e.target.value })} />
                    </Field>
                    <Field label="Email" hint="Optional.">
                        <input className={INPUT} type="email" value={cForm.email} onChange={(e) => setCForm({ ...cForm, email: e.target.value })} />
                    </Field>
                    <Field label="Default discount (%)" hint="Optional.">
                        <input className={INPUT} type="number" min={0} max={100} step="0.5" value={cForm.defaultDiscount} onChange={(e) => setCForm({ ...cForm, defaultDiscount: e.target.value })} />
                    </Field>
                    <Field label="Loyalty points" hint="Optional.">
                        <input className={INPUT} type="number" min={0} step={1} value={cForm.loyaltyPoints} onChange={(e) => setCForm({ ...cForm, loyaltyPoints: e.target.value })} />
                    </Field>
                </div>
            </Modal>

            {/* ═══ Points & discount ═══ */}
            <Modal
                open={!!editing}
                onClose={() => setEditing(null)}
                title="Points & discount"
                subtitle={editing ? `${editing.firstName} ${editing.lastName || ''} · ${editing.phone || editing.email}` : ''}
                width="max-w-md"
                footer={<>
                    <Btn onClick={() => setEditing(null)}>Cancel</Btn>
                    <Btn variant="primary" onClick={handleSaveLoyalty} disabled={isUpdating}>{isUpdating ? 'Saving…' : 'Save'}</Btn>
                </>}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Loyalty points">
                        <input className={INPUT} type="number" min={0} step={1} value={lForm.loyaltyPoints} onChange={(e) => setLForm({ ...lForm, loyaltyPoints: e.target.value })} />
                    </Field>
                    <Field label="Default discount (%)">
                        <input className={INPUT} type="number" min={0} max={100} step="0.5" value={lForm.defaultDiscount} onChange={(e) => setLForm({ ...lForm, defaultDiscount: e.target.value })} />
                    </Field>
                </div>
            </Modal>

            {/* ═══ Create admin (superadmin) ═══ */}
            <Modal
                open={adminOpen}
                onClose={() => setAdminOpen(false)}
                title="Create admin"
                subtitle="This person gets full access to the dashboard."
                footer={<>
                    <Btn onClick={() => setAdminOpen(false)}>Cancel</Btn>
                    <Btn variant="primary" onClick={handleCreateAdmin} disabled={isCreatingAdmin}>{isCreatingAdmin ? 'Creating…' : 'Create admin'}</Btn>
                </>}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" required>
                        <input className={INPUT} value={aForm.firstName} onChange={(e) => setAForm({ ...aForm, firstName: e.target.value })} />
                    </Field>
                    <Field label="Last name">
                        <input className={INPUT} value={aForm.lastName} onChange={(e) => setAForm({ ...aForm, lastName: e.target.value })} />
                    </Field>
                    <Field label="Email" required className="sm:col-span-2">
                        <input className={INPUT} type="email" value={aForm.email} onChange={(e) => setAForm({ ...aForm, email: e.target.value })} />
                    </Field>
                    <Field label="Phone">
                        <input className={INPUT} value={aForm.phone} onChange={(e) => setAForm({ ...aForm, phone: e.target.value })} />
                    </Field>
                    <Field label="Password" required hint="At least 6 characters.">
                        <input className={INPUT} type="password" value={aForm.password} onChange={(e) => setAForm({ ...aForm, password: e.target.value })} />
                    </Field>
                </div>
            </Modal>
        </div>
    );
}
