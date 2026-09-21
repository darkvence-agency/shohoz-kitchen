/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LuPlus, LuEye, LuBan, LuCircleCheck, LuPencil, LuUsers } from 'react-icons/lu';
import {
    useGetAdminUsersQuery,
    useGetAdminUserStatsQuery,
    useUpdateUserMutation,
    useCreateCustomerMutation,
} from '@/redux/api/userApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import toast from 'react-hot-toast';
import {
    PageHeader, Btn, SearchInput, SelectPill, FilterBar, StatTile, Badge, TableCard,
    TH, TD, TR, EmptyRow, SkeletonRows, Pager, RowMenu, Modal, Field, INPUT, taka, fmtDate, type Tone,
} from '@/components/admin/ui';

// Buyers only. Staff accounts live on their own page (Settings → Staff).
const PAGE_SIZE = 10;
const COLS = 9;

const STATUS_TONE: Record<string, Tone> = { active: 'green', blocked: 'red', pending: 'amber' };

function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

const errMsg = (err: any, fallback: string) =>
    err?.data?.errorMessages?.[0]?.message || err?.data?.message || fallback;

const EMPTY_CUSTOMER = { firstName: '', lastName: '', phone: '', email: '', defaultDiscount: '', loyaltyPoints: '' };

export default function CustomersPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const q = useDebounced(search);

    const currentUser = useSelector((s: RootState) => s.auth.user);

    const { data: usersData, isLoading, isFetching } = useGetAdminUsersQuery({
        page,
        limit: PAGE_SIZE,
        role: 'user',
        status: status !== 'all' ? status : undefined,
        searchTerm: q || undefined,
    });
    const { data: statsData } = useGetAdminUserStatsQuery(undefined);
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [createCustomer, { isLoading: isCreatingCustomer }] = useCreateCustomerMutation();

    const rows: any[] = usersData?.data || [];
    const meta = usersData?.meta || { total: 0, totalPages: 1 };
    const c = statsData?.data?.customers || { total: 0, active: 0, blocked: 0, newThisMonth: 0 };

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
    // Every row here is a buyer; the only one you may not block is yourself.
    const canBlock = (u: any) => u._id !== currentUser?.id;

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

    return (
        <div>
            <PageHeader
                title="Customers"
                subtitle="Buyers, their spend, loyalty points and default discounts."
                actions={<Btn variant="primary" icon={<LuPlus size={16} />} onClick={() => setAddOpen(true)}>Add customer</Btn>}
            />

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label="Customers" value={c.total.toLocaleString('en-IN')} active={status === 'all'} onClick={() => pickStatus('all')} />
                <StatTile label="Active" value={c.active.toLocaleString('en-IN')} active={status === 'active'} onClick={() => pickStatus('active')} />
                <StatTile label="Blocked" value={c.blocked.toLocaleString('en-IN')} active={status === 'blocked'} onClick={() => pickStatus('blocked')} />
                <StatTile label="New this month" value={c.newThisMonth.toLocaleString('en-IN')} />
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
                        { value: 'pending', label: 'Pending' },
                    ]}
                />
            </FilterBar>

            <TableCard footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="customers" />}>
                <table className={`w-full ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                    <thead>
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
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={COLS} /> : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>
                                <LuUsers size={28} className="mx-auto mb-2 text-gray-300" />
                                {search || status !== 'all' ? 'Nobody matches these filters.' : 'No customers yet.'}
                            </EmptyRow>
                        ) : rows.map((u, i) => {
                            const n = (page - 1) * PAGE_SIZE + i + 1;
                            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—';
                            const statusBadge = <Badge tone={STATUS_TONE[u.status] || 'gray'}><span className="capitalize">{u.status}</span></Badge>;
                            const blockItem = u.status === 'blocked'
                                ? { label: 'Unblock', icon: <LuCircleCheck size={15} />, onClick: () => handleToggleBlock(u), hidden: !canBlock(u) }
                                : { label: 'Block', icon: <LuBan size={15} />, onClick: () => handleToggleBlock(u), danger: true, hidden: !canBlock(u) };

                            return (
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
        </div>
    );
}
