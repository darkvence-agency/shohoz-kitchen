/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    FiArrowLeft, FiMail, FiPhone, FiMapPin, FiCalendar, FiShield,
    FiCheckCircle, FiXCircle, FiShoppingBag, FiPackage, FiDollarSign, FiEye,
    FiExternalLink, FiCreditCard, FiFileText, FiHome, FiPercent, FiTrendingUp,
} from 'react-icons/fi';
import { useGetAdminUserByIdQuery } from '@/redux/api/userApi';
import { useGetAdminOrdersQuery } from '@/redux/api/orderApi';

const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const taka = (n: number) => `৳${(n || 0).toLocaleString()}`;

// Status badge (covers user + order statuses)
const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, string> = {
        active: 'bg-green-50 text-green-700 border-green-100',
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        blocked: 'bg-red-50 text-red-700 border-red-100',
        confirmed: 'bg-blue-50 text-blue-700 border-blue-100',
        processing: 'bg-purple-50 text-purple-700 border-purple-100',
        shipped: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        delivered: 'bg-green-50 text-green-700 border-green-100',
        cancelled: 'bg-red-50 text-red-700 border-red-100',
        returned: 'bg-orange-50 text-orange-700 border-orange-100',
        refunded: 'bg-orange-50 text-orange-700 border-orange-100',
    };
    return (
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize border ${config[status] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
            {status || 'pending'}
        </span>
    );
};

const RoleBadge = ({ role }: { role: string }) => {
    if (role === 'superadmin') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"><FiShield size={11} /> Super Admin</span>;
    if (role === 'admin') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100"><FiShield size={11} /> Admin</span>;
    return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-100">Customer</span>;
};

const Avatar = ({ name, avatar }: { name: string; avatar?: string }) => {
    const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-red-500'];
    if (avatar) return <img src={avatar} alt={name} className="w-16 h-16 rounded-lg object-cover border border-gray-100" />;
    return (
        <div className={`w-16 h-16 rounded-lg ${colors[(name?.charCodeAt(0) || 0) % colors.length]} flex items-center justify-center text-white font-bold text-xl shadow-sm`}>
            {initials}
        </div>
    );
};

const Info = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-start gap-2.5">
        <span className="text-gray-400 mt-0.5">{icon}</span>
        <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className="text-sm text-gray-800 font-semibold truncate">{value}</p>
        </div>
    </div>
);

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase mb-1">{icon} {label}</div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
);

export default function CustomerDetailPage() {
    const params = useParams();
    const id = (params?.id as string) || '';

    const { data: userData, isLoading: userLoading, isError } = useGetAdminUserByIdQuery(id, { skip: !id });
    const { data: ordersData, isLoading: ordersLoading } = useGetAdminOrdersQuery({ user: id, limit: 100 }, { skip: !id });

    const customer = userData?.data;
    const orders = ordersData?.data || [];

    const fullName = customer ? (`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unnamed') : '';
    const totalSpent = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const deliveredCount = orders.filter((o: any) => o.status === 'delivered').length;

    if (userLoading) {
        return <div className="p-8 text-center text-gray-500">Loading customer…</div>;
    }

    if (isError || !customer) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <Link href="/dashboard/admin/customers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--color-primary)] font-medium mb-6"><FiArrowLeft /> Back to customers</Link>
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                    <p className="text-lg font-bold text-gray-700">Customer not found</p>
                    <p className="text-sm text-gray-500 mt-1">This customer may have been removed or the link is invalid.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <Link href="/dashboard/admin/customers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--color-primary)] font-medium"><FiArrowLeft /> Back to customers</Link>

            {/* Profile header */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar name={fullName} avatar={customer.avatar} />
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold text-gray-900 truncate">{fullName}</h1>
                            <RoleBadge role={customer.role} />
                            <StatusBadge status={customer.status} />
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1"><FiMail size={14} /> {customer.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                    <Info icon={<FiPhone />} label="Phone" value={customer.phone || '—'} />
                    <Info icon={<FiCalendar />} label="Joined" value={formatDate(customer.createdAt)} />
                    <Info
                        icon={customer.isEmailVerified ? <FiCheckCircle className="text-green-500" /> : <FiXCircle className="text-gray-400" />}
                        label="Email"
                        value={customer.isEmailVerified ? 'Verified' : 'Not verified'}
                    />
                    <Info icon={<FiMapPin />} label="Location" value={customer.location || customer.address || '—'} />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Stat icon={<FiShoppingBag />} label="Orders" value={orders.length} />
                <Stat icon={<FiPackage />} label="Delivered" value={deliveredCount} />
                <Stat icon={<FiDollarSign />} label="Total Spent" value={taka(totalSpent)} />
            </div>

            {/* Orders */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="font-bold text-gray-800">Order history</h2>
                </div>
                {ordersLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading orders…</div>
                ) : orders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">This customer has not placed any orders yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/60 border-b border-gray-200">
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                                    <th className="px-6 py-3">Order</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Items</th>
                                    <th className="px-6 py-3">Total</th>
                                    <th className="px-6 py-3">Payment</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">View</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((o: any) => (
                                    <tr key={o._id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-semibold text-gray-800">#{o.orderId}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(o.createdAt)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{o.items?.length || 0}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-800">{taka(o.total)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                                            {o.paymentMethod || '—'} <span className="text-xs text-gray-400">({o.paymentStatus || '—'})</span>
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/dashboard/admin/orders/${o._id}`} className="inline-flex p-2 bg-gray-50 hover:bg-white text-gray-500 hover:text-[var(--color-primary)] border border-gray-100 rounded-md transition-all" title="View order">
                                                <FiEye size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
