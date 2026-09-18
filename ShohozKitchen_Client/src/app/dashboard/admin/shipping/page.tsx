"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    FiTruck,
    FiMapPin,
    FiTrendingUp,
    FiPackage,
    FiCheckCircle,
    FiClock,
    FiXCircle,
    FiSearch,
    FiFilter,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiMoreVertical,
    FiExternalLink,
    FiRefreshCw,
    FiAlertCircle,
    FiEye,
    FiX,
    FiSettings,
} from 'react-icons/fi';
import {
    useGetShippingStatsQuery,
    useGetShipmentsQuery,
    useGetZonesQuery,
    useGetRatesQuery,
    useCreateZoneMutation,
    useUpdateZoneMutation,
    useDeleteZoneMutation,
    useCreateRateMutation,
    useUpdateRateMutation,
    useDeleteRateMutation,
    useUpdateShipmentStatusMutation,
    useGetShippingSettingsQuery,
    useUpdateShippingSettingsMutation,
    type ShippingSettings,
} from '@/redux/api/shippingApi';
import toast from 'react-hot-toast';

// Tab Components
const ShipmentsTab = ({
    shipments,
    isLoading,
    onUpdateStatus
}: {
    shipments: any[],
    isLoading: boolean,
    onUpdateStatus: (id: string, currentStatus: string) => void
}) => {
    return (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order / Tracking</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer & Destination</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Carrier & Method</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Shipping Cost</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-20"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                                    <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-200 rounded w-8 ml-auto"></div></td>
                                </tr>
                            ))
                        ) : shipments?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No shipments found.</td>
                            </tr>
                        ) : (
                            shipments?.map((shipment) => (
                                <tr key={shipment._id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-800">#{shipment.orderId || 'N/A'}</p>
                                        <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase">TRACK: {shipment.trackingNumber || 'UNASSIGNED'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-gray-700">{shipment.customerName || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{shipment.destination}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase border border-blue-100">
                                            {shipment.carrier}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize border inline-flex items-center gap-1.5 ${shipment.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-100' :
                                            shipment.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                shipment.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            {shipment.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-800">৳{(shipment.shippingCost || 0).toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => onUpdateStatus(shipment._id, shipment.status)}
                                                className="p-2 text-gray-400 hover:text-[var(--color-primary)] bg-gray-50 rounded-md border border-gray-100"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <Link
                                                href={`/dashboard/admin/orders/${shipment._id}`}
                                                className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-md border border-gray-100"
                                            >
                                                <FiEye size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ZonesTab = ({ zones, isLoading, onDelete, onEdit }: { zones: any[], isLoading: boolean, onDelete: (id: string) => void, onEdit: (zone: any) => void }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
                [...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-100 h-40 rounded-md animate-pulse"></div>
                ))
            ) : zones?.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-gray-200 rounded-md">
                    No shipping zones defined.
                </div>
            ) : (
                zones?.map(zone => (
                    <div key={zone._id} className="bg-white rounded-md border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{zone.name}</h3>
                                <p className={`text-xs inline-block mt-1 px-2 py-0.5 rounded-full font-bold uppercase ${zone.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {zone.isActive ? 'Active' : 'Inactive'}
                                </p>
                            </div>
                            <div className="flex gap-2 transition-opacity">
                                <button onClick={() => onEdit(zone)} className="p-1.5 text-gray-400 hover:text-blue-500"><FiEdit2 size={16} /></button>
                                <button onClick={() => onDelete(zone._id)} className="p-1.5 text-gray-400 hover:text-red-500"><FiTrash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {(zone.regions || []).map((area: string, idx: number) => (
                                <span key={idx} className="bg-gray-50 text-gray-600 text-[11px] px-2 py-1 rounded border border-gray-100">
                                    {area}
                                </span>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

const RatesTab = ({ rates, isLoading, onDelete, onEdit }: { rates: any[], isLoading: boolean, onDelete: (id: string) => void, onEdit: (rate: any) => void }) => {
    return (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Zone</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rate Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Min. for Free</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Time</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            [...Array(4)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                                </tr>
                            ))
                        ) : rates?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No rates defined.</td>
                            </tr>
                        ) : (
                            rates?.map(rate => (
                                <tr key={rate._id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-gray-800">{rate.zone?.name || 'Unknown'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-700 font-medium">{rate.name}</p>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-[#2C742F]">
                                        ৳{rate.price}
                                    </td>
                                    <td className="px-6 py-4">
                                        {rate.freeShippingMinimum ? `৳${rate.freeShippingMinimum}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {rate.estimatedDays || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => onEdit(rate)} className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-md"><FiEdit2 size={16} /></button>
                                            <button onClick={() => onDelete(rate._id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md"><FiTrash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Modal Components
const ZoneModal = ({ isOpen, onClose, onSubmit, editingZone }: { isOpen: boolean, onClose: () => void, onSubmit: (data: any) => void, editingZone?: any }) => {
    const [name, setName] = useState(editingZone?.name || '');
    const [areas, setAreas] = useState(editingZone?.regions?.join(', ') || '');
    const [isActive, setIsActive] = useState(editingZone?.isActive ?? true);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-md w-full max-w-md shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-lg">{editingZone ? 'Edit' : 'Create'} Shipping Zone</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><FiX size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Zone Name</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none font-medium"
                            placeholder="e.g. Dhaka City"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Areas / Regions (Comma separated)</label>
                        <textarea
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none font-medium h-24 resize-none"
                            placeholder="e.g. Dhaka, Dhanmondi, Gulshan, Banani"
                            value={areas}
                            onChange={(e) => setAreas(e.target.value)}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Order&apos;s city is matched against these (e.g. add &quot;Dhaka&quot; for inside-Dhaka).</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-0"
                        />
                        <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">Zone is Active</label>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button
                        onClick={() => onSubmit({ name, regions: areas.split(',').map((a: string) => a.trim()).filter(Boolean), isActive })}
                        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold shadow-md hover:bg-[var(--color-primary-dark)] transition-all"
                    >
                        Save Zone
                    </button>
                </div>
            </div>
        </div>
    );
};

const RateModal = ({ isOpen, onClose, onSubmit, zones, editingRate }: { isOpen: boolean, onClose: () => void, onSubmit: (data: any) => void, zones: any[], editingRate?: any }) => {
    const [zoneId, setZoneId] = useState(editingRate?.zone?._id || editingRate?.zone || '');
    const [name, setName] = useState(editingRate?.name || '');
    const [price, setPrice] = useState(editingRate?.price || 0);
    const [freeMin, setFreeMin] = useState(editingRate?.freeShippingMinimum || 0);
    const [estimatedDays, setEstimatedDays] = useState(editingRate?.estimatedDays || '3-5 days');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-md w-full max-w-lg shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-lg">{editingRate ? 'Edit' : 'Create'} Shipping Rate</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><FiX size={20} /></button>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Target Zone</label>
                        <select
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                            value={zoneId}
                            onChange={(e) => setZoneId(e.target.value)}
                        >
                            <option value="">Select a Zone</option>
                            {zones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Rate Name</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                            placeholder="e.g. Next Day Delivery"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Shipping Price (৳)</label>
                        <input
                            type="number"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Free Minimum (৳)</label>
                        <input
                            type="number"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                            placeholder="0 for disabled"
                            value={freeMin}
                            onChange={(e) => setFreeMin(Number(e.target.value))}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Delivery Time</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                            placeholder="e.g. 1-3 days"
                            value={estimatedDays}
                            onChange={(e) => setEstimatedDays(e.target.value)}
                        />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button
                        onClick={() => onSubmit({
                            zone: zoneId,
                            name,
                            price: Number(price),
                            freeShippingMinimum: Number(freeMin) || 0,
                            estimatedDays,
                        })}
                        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold shadow-md hover:bg-[var(--color-primary-dark)] transition-all"
                    >
                        Save Rate
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Settings tab — global free-shipping + default rate rules ──
const SettingsTab = () => {
    const { data: settings, isLoading } = useGetShippingSettingsQuery();
    const [save, { isLoading: saving }] = useUpdateShippingSettingsMutation();
    const [form, setForm] = useState<ShippingSettings | null>(null);

    React.useEffect(() => { if (settings) setForm(settings); }, [settings]);

    if (isLoading || !form) {
        return <div className="bg-white rounded-md border border-gray-200 p-8 animate-pulse h-64" />;
    }

    const set = <K extends keyof ShippingSettings>(k: K, v: ShippingSettings[K]) => setForm({ ...form, [k]: v });

    const onSave = async () => {
        try {
            await save(form).unwrap();
            toast.success('Shipping settings saved');
        } catch (e: any) {
            toast.error(e?.data?.message || 'Failed to save settings');
        }
    };

    const numField = (label: string, key: keyof ShippingSettings, suffix = '৳', hint?: string) => (
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>
                <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                    value={form[key] as number}
                    onChange={(e) => set(key, Number(e.target.value) as any)}
                />
            </div>
            {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
        </div>
    );

    const toggle = (label: string, key: keyof ShippingSettings, hint?: string) => (
        <label className="flex items-start gap-3 cursor-pointer">
            <input
                type="checkbox"
                checked={Boolean(form[key])}
                onChange={(e) => set(key, e.target.checked as any)}
                className="w-4 h-4 mt-0.5 accent-[var(--color-primary)]"
            />
            <span>
                <span className="text-sm font-semibold text-gray-700 block">{label}</span>
                {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
            </span>
        </label>
    );

    return (
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 max-w-3xl space-y-7">
            {/* Free shipping by order value */}
            <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FiTrendingUp size={16} /> Free shipping by order value</h3>
                {toggle('Enable free shipping over a subtotal threshold', 'freeShippingByThresholdEnabled', 'Orders at/above the amount below ship free.')}
                {numField('Free-shipping threshold', 'freeShippingThreshold', '৳', 'e.g. 5000 — orders ৳5000+ get free delivery.')}
            </section>

            {/* Free shipping by quantity */}
            <section className="space-y-4 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FiPackage size={16} /> Free shipping by quantity</h3>
                {toggle('Enable free shipping when buying enough items', 'quantityFreeShippingEnabled', 'Carts with at least the item count below ship free.')}
                {numField('Minimum items for free shipping', 'minItemsForFreeShipping', '#', 'e.g. 3 — buy 3+ items, delivery is free.')}
            </section>

            {/* Default rates (fallback when no zone matches) */}
            <section className="space-y-4 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FiMapPin size={16} /> Default delivery rates</h3>
                <p className="text-[11px] text-gray-400 -mt-2">Used when the order&apos;s city doesn&apos;t match any Zone below.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {numField('Inside Dhaka', 'defaultInsideDhakaRate')}
                    {numField('Outside Dhaka', 'defaultOutsideDhakaRate')}
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Default delivery time</label>
                    <input
                        type="text"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                        placeholder="e.g. 3-5 days"
                        value={form.defaultEstimatedDays}
                        onChange={(e) => set('defaultEstimatedDays', e.target.value)}
                    />
                </div>
            </section>

            <div className="flex justify-end border-t border-gray-100 pt-5">
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold shadow-md hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
                >
                    {saving ? 'Saving…' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default function ShippingPage() {
    const [activeTab, setActiveTab] = useState<'shipments' | 'zones' | 'rates' | 'settings'>('shipments');

    // Modals
    const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // Queries
    const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useGetShippingStatsQuery(undefined);
    const { data: shipmentsData, isLoading: isShipmentsLoading, refetch: refetchShipments } = useGetShipmentsQuery({ page: 1, limit: 10 });
    const { data: zonesData, isLoading: isZonesLoading, refetch: refetchZones } = useGetZonesQuery(undefined);
    const { data: ratesData, isLoading: isRatesLoading, refetch: refetchRates } = useGetRatesQuery(undefined);

    // Mutations
    const [createZone] = useCreateZoneMutation();
    const [updateZone] = useUpdateZoneMutation();
    const [deleteZone] = useDeleteZoneMutation();
    const [createRate] = useCreateRateMutation();
    const [updateRate] = useUpdateRateMutation();
    const [deleteRate] = useDeleteRateMutation();
    const [updateStatus] = useUpdateShipmentStatusMutation();

    const handleRefresh = () => {
        refetchStats();
        refetchShipments();
        refetchZones();
        refetchRates();
        toast.success('Shipping data refreshed');
    };

    const handleZoneSubmit = async (data: any) => {
        try {
            if (editingItem) {
                await updateZone({ id: editingItem._id, ...data }).unwrap();
                toast.success('Zone updated');
            } else {
                await createZone(data).unwrap();
                toast.success('Zone created');
            }
            setIsZoneModalOpen(false);
            setEditingItem(null);
        } catch (err: any) {
            toast.error(err.data?.message || 'Action failed');
        }
    };

    const handleRateSubmit = async (data: any) => {
        try {
            if (editingItem) {
                await updateRate({ id: editingItem._id, ...data }).unwrap();
                toast.success('Rate updated');
            } else {
                await createRate(data).unwrap();
                toast.success('Rate created');
            }
            setIsRateModalOpen(false);
            setEditingItem(null);
        } catch (err: any) {
            toast.error(err.data?.message || 'Action failed');
        }
    };

    const handleDeleteZone = async (id: string) => {
        if (!window.confirm('Delete this zone? This might affect existing rates.')) return;
        try {
            await deleteZone(id).unwrap();
            toast.success('Zone deleted');
        } catch (err: any) {
            toast.error(err.data?.message || 'Failed to delete zone');
        }
    };

    const handleDeleteRate = async (id: string) => {
        if (!window.confirm('Delete this shipping rate?')) return;
        try {
            await deleteRate(id).unwrap();
            toast.success('Rate deleted');
        } catch (err: any) {
            toast.error(err.data?.message || 'Failed to delete rate');
        }
    };

    const handleUpdateShipmentStatus = async (id: string, currentStatus: string) => {
        const nextStatus = prompt(`Enter next status for shipment (pending, picked_up, in_transit, out_for_delivery, delivered, returned, cancelled). Current: ${currentStatus}`);
        if (!nextStatus) return;

        try {
            await updateStatus({ id, status: nextStatus }).unwrap();
            toast.success('Shipment status updated');
        } catch (err: any) {
            toast.error(err.data?.message || 'Invalid status or update failed');
        }
    };

    const stats = statsData?.data || { pending: 0, inTransit: 0, delivered: 0, totalShipments: 0, avgDeliveryDays: 0 };
    const shipments = shipmentsData?.data || [];
    const zones = zonesData?.data || [];
    const rates = ratesData?.data || [];

    const tabs = [
        { id: 'shipments', label: 'Shipments', icon: FiTruck },
        { id: 'zones', label: 'Zones', icon: FiMapPin },
        { id: 'rates', label: 'Rates', icon: FiTrendingUp },
        { id: 'settings', label: 'Settings', icon: FiSettings },
    ];

    const statCards = [
        { label: 'Pending', value: stats.pending, icon: FiClock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        { label: 'In Transit', value: stats.inTransit, icon: FiTruck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        { label: 'Delivered', value: stats.delivered, icon: FiCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        { label: 'Avg. Days', value: stats.avgDeliveryDays || '0', icon: FiClock, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Shipping Management</h1>
                    <p className="text-gray-500 mt-1">Configure zones, rates and track shipments</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
                    >
                        <FiRefreshCw size={16} className={isShipmentsLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    {(activeTab === 'zones' || activeTab === 'rates') && (
                        <button
                            onClick={() => {
                                setEditingItem(null);
                                if (activeTab === 'zones') setIsZoneModalOpen(true);
                                if (activeTab === 'rates') setIsRateModalOpen(true);
                            }}
                            className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-semibold hover:bg-[var(--color-primary-dark)] flex items-center gap-2 transition-all shadow-sm"
                        >
                            <FiPlus size={16} />
                            Add {activeTab === 'zones' ? 'Zone' : 'Rate'}
                        </button>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ZoneModal
                isOpen={isZoneModalOpen}
                onClose={() => { setIsZoneModalOpen(false); setEditingItem(null); }}
                onSubmit={handleZoneSubmit}
                editingZone={editingItem}
            />
            <RateModal
                isOpen={isRateModalOpen}
                onClose={() => { setIsRateModalOpen(false); setEditingItem(null); }}
                zones={zones}
                onSubmit={handleRateSubmit}
                editingRate={editingItem}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <div key={i} className={`${stat.bg} ${stat.border} border rounded-md p-5 shadow-sm`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-md bg-white shadow-sm ${stat.color}`}>
                                <stat.icon size={22} />
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${stat.color} leading-none`}>
                                    {isStatsLoading ? '...' : stat.value}
                                </p>
                                <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="space-y-4">
                {/* Tab Navigation */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-gray-200 w-fit shadow-sm">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === tab.id
                                ? 'bg-[var(--color-primary)] text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    {activeTab === 'shipments' && (
                        <ShipmentsTab
                            shipments={shipments}
                            isLoading={isShipmentsLoading}
                            onUpdateStatus={handleUpdateShipmentStatus}
                        />
                    )}
                    {activeTab === 'zones' && (
                        <ZonesTab
                            zones={zones}
                            isLoading={isZonesLoading}
                            onDelete={handleDeleteZone}
                            onEdit={(zone) => { setEditingItem(zone); setIsZoneModalOpen(true); }}
                        />
                    )}
                    {activeTab === 'rates' && (
                        <RatesTab
                            rates={rates}
                            isLoading={isRatesLoading}
                            onDelete={handleDeleteRate}
                            onEdit={(rate) => { setEditingItem(rate); setIsRateModalOpen(true); }}
                        />
                    )}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </div>
        </div>
    );
}
