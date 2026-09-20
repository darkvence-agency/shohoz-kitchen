"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
    LuPrinter, LuPencil, LuWallet, LuPackageCheck, LuBan, LuTrash2, LuCircleCheck, LuUndo2, LuTriangleAlert,
    LuInfo, LuTrash, LuWarehouse, LuPackage, LuCalendarClock,
} from 'react-icons/lu';
import {
    PageHeader, Btn, Badge, Card, RowMenu, Modal, Field, INPUT, TEXTAREA, TH, TD, TR, taka, cx, type RowMenuItem,
} from '@/components/admin/ui';
import {
    useGetPurchaseDetailQuery, useUpdatePurchaseMutation, useDeletePurchaseMutation, useRemovePurchasePaymentMutation,
    type Purchase,
} from '@/redux/api/purchaseApi';
import { errorMessage, qty, unitShort, Thumb } from '@/app/dashboard/admin/inventory/shared';
import PurchaseForm from '../_components/PurchaseForm';
import ReceiveModal from '../_components/ReceiveModal';
import PaymentModal from '../_components/PaymentModal';
import CancelModal from '../_components/CancelModal';
import PrintBill from '../_components/PrintBill';
import {
    PURCHASES_HREF, purchaseHref, statusMeta, shippingLabel, fmtDay, fmtStamp, money, methodLabel, personName, dhakaDay,
} from '../_components/shared';

// useSearchParams needs a Suspense boundary.
export default function PurchaseDetailPage() {
    return (
        <Suspense fallback={null}>
            <PurchaseDetailInner />
        </Suspense>
    );
}

function PurchaseDetailInner() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const editParam = useSearchParams().get('edit') === '1';
    const { data: p, isLoading, isError, error, refetch } = useGetPurchaseDetailQuery(id, { refetchOnMountOrArgChange: true });

    if (!p) {
        const notFound = (error as { status?: number } | undefined)?.status === 404 || (error as { status?: number } | undefined)?.status === 400;
        return (
            <div>
                <PageHeader back={{ href: PURCHASES_HREF, label: 'Purchases' }} title={isLoading || !isError ? 'Loading purchase…' : notFound ? 'Purchase not found' : 'Couldn’t load the purchase'} />
                {isLoading || !isError ? (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="space-y-4">{[220, 140, 120].map((h) => <div key={h} className="animate-pulse rounded-2xl border border-gray-200 bg-white" style={{ height: h }} />)}</div>
                        <div className="space-y-4">{[180, 240].map((h) => <div key={h} className="animate-pulse rounded-2xl border border-gray-200 bg-white" style={{ height: h }} />)}</div>
                    </div>
                ) : (
                    <Card>
                        <div className="py-8 text-center text-sm text-gray-500">
                            <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                            {notFound ? 'This purchase does not exist — it may have been deleted.' : errorMessage(error, 'Something went wrong.')}
                            <div className="mt-4 flex justify-center gap-2">
                                {!notFound && <Btn onClick={() => refetch()}>Try again</Btn>}
                                <Btn href={PURCHASES_HREF}>Back to purchases</Btn>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        );
    }

    if (editParam && p.can.editItems) {
        return (
            <div>
                <PageHeader
                    back={{ href: purchaseHref(p._id), label: p.reference }}
                    title={`Edit ${p.reference}`}
                    subtitle="Items, prices and costs can change until goods are received."
                />
                <PurchaseForm
                    key={p.updatedAt}
                    purchase={p}
                    onDone={() => router.replace(purchaseHref(p._id))}
                    onCancel={() => router.replace(purchaseHref(p._id))}
                />
            </div>
        );
    }

    return <PurchaseView p={p} editDetails={editParam} />;
}

function PurchaseView({ p, editDetails }: { p: Purchase; editDetails: boolean }) {
    const router = useRouter();
    const [today] = useState(() => dhakaDay());
    const [receiving, setReceiving] = useState(false);
    const [paying, setPaying] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [update, { isLoading: updating }] = useUpdatePurchaseMutation();
    const [deletePurchase] = useDeletePurchaseMutation();
    const [removePayment] = useRemovePurchasePaymentMutation();

    const st = statusMeta(p.status);
    const foreign = p.currency !== 'BDT';
    const open = p.status === 'confirmed' || p.status === 'partially_received';
    const overdue = open && !!p.eta && dhakaDay(p.eta) < today;
    // ?edit=1 on a purchase whose items are locked opens the small "details" editor instead.
    const showDetails = detailsOpen || (editDetails && !p.can.editItems);
    const closeDetails = () => {
        setDetailsOpen(false);
        if (editDetails) router.replace(purchaseHref(p._id));
    };

    const setStatus = async (status: 'draft' | 'confirmed') => {
        try {
            await update({ id: p._id, status }).unwrap();
            toast.success(status === 'confirmed' ? `${p.reference} confirmed` : `${p.reference} is a draft again`);
        } catch (err) {
            toast.error(errorMessage(err, 'Could not change the status'));
        }
    };

    const remove = async () => {
        if (!window.confirm(`Delete ${p.reference}? This cannot be undone.`)) return;
        try {
            await deletePurchase(p._id).unwrap();
            toast.success(`${p.reference} deleted`);
            router.push(PURCHASES_HREF);
        } catch (err) {
            toast.error(errorMessage(err, 'Could not delete the purchase'), { duration: 6000 });
        }
    };

    const dropPayment = async (paymentId: string, amount: number) => {
        if (!window.confirm(`Remove the payment of ${taka(amount, 2)}? The due amount goes back up.`)) return;
        try {
            await removePayment({ id: p._id, paymentId }).unwrap();
            toast.success('Payment removed');
        } catch (err) {
            toast.error(errorMessage(err, 'Could not remove the payment'));
        }
    };

    const more: RowMenuItem[] = [
        { label: 'Confirm order', icon: <LuCircleCheck size={15} />, onClick: () => setStatus('confirmed'), hidden: p.status !== 'draft' },
        { label: 'Back to draft', icon: <LuUndo2 size={15} />, onClick: () => setStatus('draft'), hidden: !(p.status === 'confirmed' && p.can.editItems) },
        { label: 'Reopen as draft', icon: <LuUndo2 size={15} />, onClick: () => setStatus('draft'), hidden: p.status !== 'cancelled' },
        { label: 'Edit details', icon: <LuPencil size={15} />, onClick: () => setDetailsOpen(true), hidden: p.can.editItems },
        { label: 'Cancel purchase', icon: <LuBan size={15} />, onClick: () => setCancelling(true), hidden: !p.can.cancel, danger: true },
        { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: remove, hidden: !p.can.delete, danger: true },
    ];

    const paidPct = p.grandTotal > 0 ? Math.min(100, Math.round((p.paid / p.grandTotal) * 100)) : 0;
    const recvPct = p.totalQty > 0 ? Math.min(100, Math.round((p.receivedQty / p.totalQty) * 100)) : 0;

    return (
        <div>
            <PageHeader
                back={{ href: PURCHASES_HREF, label: 'Purchases' }}
                title={<span className="flex flex-wrap items-center gap-2">{p.reference}<Badge tone={st.tone}>{st.label}</Badge></span>}
                subtitle={[p.supplier?.name, fmtDay(p.orderDate), shippingLabel(p.shippingMode)].filter(Boolean).join(' · ')}
                actions={<>
                    <Btn icon={<LuPrinter size={15} />} onClick={() => setPrinting(true)}>Print</Btn>
                    {p.can.editItems && <Btn icon={<LuPencil size={15} />} href={`${purchaseHref(p._id)}?edit=1`}>Edit</Btn>}
                    {p.can.pay && <Btn icon={<LuWallet size={15} />} onClick={() => setPaying(true)}>Record payment</Btn>}
                    {p.can.receive && <Btn variant="primary" icon={<LuPackageCheck size={15} />} onClick={() => setReceiving(true)}>Receive goods</Btn>}
                    <RowMenu items={more} label="More actions" />
                </>}
            />

            {/* ═══ Banners ═══ */}
            {p.status === 'draft' && (
                <Banner tone="blue" icon={<LuInfo size={17} />}
                    action={<Btn variant="primary" icon={<LuCircleCheck size={15} />} onClick={() => setStatus('confirmed')} disabled={updating}>Confirm order</Btn>}>
                    This is a <strong className="font-semibold">draft</strong> — not placed yet, and left out of every total. Confirm it once the order is placed; then goods can be received.
                </Banner>
            )}
            {p.status === 'cancelled' && (
                <Banner tone="red" icon={<LuBan size={17} />}
                    action={<Btn icon={<LuUndo2 size={15} />} onClick={() => setStatus('draft')} disabled={updating}>Reopen as draft</Btn>}>
                    Cancelled{p.cancelledAt ? ` on ${fmtDay(p.cancelledAt)}` : ''}{p.cancelReason ? ` — ${p.cancelReason}` : ''}.
                    {p.paid > 0 && <> {taka(p.paid, 2)} was paid on it: get it back from the supplier, then remove the payment below.</>}
                </Banner>
            )}
            {overdue && (
                <Banner tone="amber" icon={<LuCalendarClock size={17} />}>
                    The goods were expected on <strong className="font-semibold">{fmtDay(p.eta)}</strong> and {p.status === 'partially_received' ? 'have not all' : 'have not'} arrived yet.
                </Banner>
            )}

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-5">
                    {/* ═══ Items ═══ */}
                    <Card
                        title="Items"
                        description={`${p.itemCount} item${p.itemCount === 1 ? '' : 's'} · ${qty(p.totalQty)} units${foreign ? ` · prices in ${p.currency}, 1 ${p.currency} = ৳${p.exchangeRate}` : ''}`}
                    >
                        <div className="-mx-5 overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className={`${TH} w-10 pl-5`}>#</th>
                                        <th className={TH}>Item</th>
                                        <th className={`${TH} text-right`}>Ordered</th>
                                        <th className={`${TH} text-right`}>Received</th>
                                        <th className={`${TH} text-right`}>Unit cost</th>
                                        <th className={`${TH} text-right`}>Amount</th>
                                        <th className={`${TH} pr-5 text-right`} title="Per unit in taka, incl. its share of shipping, duty and other costs">Landed / unit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {p.items.map((it, i) => (
                                        <tr key={it._id} className={TR}>
                                            <td className={`${TD} pl-5 text-gray-400`}>{i + 1}</td>
                                            <td className={TD}>
                                                <div className="flex min-w-[220px] items-center gap-2.5">
                                                    <Thumb src={it.product?.thumbnail} size={36} />
                                                    <div className="min-w-0">
                                                        <p className="line-clamp-1 font-medium text-gray-900">{it.name}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {[it.variantLabel, it.sku, !it.product ? 'typed item' : it.product.isDeleted ? 'product deleted' : null].filter(Boolean).join(' · ') || 'No SKU'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{qty(it.qty)} {unitShort(it.unit || it.product?.unit)}</td>
                                            <td className={cx(TD, 'whitespace-nowrap text-right tabular-nums',
                                                it.receivedQty >= it.qty ? 'text-emerald-600' : it.receivedQty > 0 ? 'text-amber-600' : 'text-gray-400')}>
                                                {qty(it.receivedQty)}
                                            </td>
                                            <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{money(it.unitCost, p.currency, 4)}</td>
                                            <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>
                                                <span className="text-gray-900">{money(it.lineTotal, p.currency)}</span>
                                                {foreign && <span className="block text-xs text-gray-400">{taka(it.lineTotalBdt)}</span>}
                                            </td>
                                            <td className={`${TD} whitespace-nowrap pr-5 text-right font-medium tabular-nums text-gray-900`}>{taka(it.landedUnitCost, 2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {p.status !== 'draft' && p.status !== 'cancelled' && (
                            <div className="mt-4 border-t border-gray-100 pt-4">
                                <div className="mb-1.5 flex justify-between text-xs text-gray-500">
                                    <span>Received</span>
                                    <span className="tabular-nums">{qty(p.receivedQty)} / {qty(p.totalQty)} units · {recvPct}%</span>
                                </div>
                                <Bar pct={recvPct} tone={recvPct >= 100 ? 'green' : 'amber'} />
                            </div>
                        )}
                    </Card>

                    {/* ═══ Receipts ═══ */}
                    <Card
                        title="Goods received"
                        description="Each delivery, the warehouse it went into and what happened to stock."
                        actions={p.can.receive ? <Btn icon={<LuPackageCheck size={15} />} onClick={() => setReceiving(true)}>Receive</Btn> : undefined}
                    >
                        {p.receipts.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                                <LuPackage size={24} className="mx-auto mb-2 text-gray-300" />
                                {p.status === 'draft' ? 'Confirm the purchase to start receiving goods.'
                                    : p.status === 'cancelled' ? 'Nothing was received before it was cancelled.'
                                        : 'Nothing received yet.'}
                            </div>
                        ) : (
                            <ol className="space-y-3">
                                {[...p.receipts].reverse().map((r) => (
                                    <li key={r._id} className="rounded-xl border border-gray-200 p-3">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                            <span className="font-medium text-gray-900">{fmtDay(r.date)}</span>
                                            <span className="inline-flex items-center gap-1 text-gray-600"><LuWarehouse size={14} className="text-gray-400" />{r.warehouse?.name || 'Warehouse removed'}</span>
                                            <Badge tone={r.addedToStock ? 'green' : 'gray'}>{r.addedToStock ? 'Added to stock' : 'Stock not changed'}</Badge>
                                            <span className="ml-auto text-xs text-gray-400">{personName(r.createdBy) || 'Admin'} · {fmtStamp(r.createdAt)}</span>
                                        </div>
                                        <ul className="mt-2 space-y-1 text-sm">
                                            {r.lines.map((l, k) => (
                                                <li key={k} className="flex flex-wrap items-baseline gap-x-2">
                                                    <span className="tabular-nums font-medium text-gray-900">{qty(l.qty)} {unitShort(l.unit)}</span>
                                                    <span className="text-gray-700">{l.name}{l.variantLabel ? ` · ${l.variantLabel}` : ''}</span>
                                                    {l.stocked
                                                        ? <span className="text-xs text-emerald-600">+ stock at {taka(l.unitCost, 2)}</span>
                                                        : l.stockNote ? <span className="text-xs text-amber-600">{l.stockNote}</span> : null}
                                                </li>
                                            ))}
                                        </ul>
                                        {r.note && <p className="mt-2 whitespace-pre-line text-xs text-gray-500">{r.note}</p>}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>

                    {/* ═══ Payments ═══ */}
                    <Card
                        title="Payments"
                        description="Money paid to the supplier, in taka."
                        actions={p.can.pay ? <Btn icon={<LuWallet size={15} />} onClick={() => setPaying(true)}>Record payment</Btn> : undefined}
                    >
                        {p.payments.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">No payments yet.</p>
                        ) : (
                            <div className="-mx-5 overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className={`${TH} pl-5`}>Date</th>
                                            <th className={TH}>Method</th>
                                            <th className={TH}>Reference / note</th>
                                            <th className={`${TH} text-right`}>Amount</th>
                                            <th className={`${TH} w-12 pr-5`} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {p.payments.map((x) => (
                                            <tr key={x._id} className={TR}>
                                                <td className={`${TD} whitespace-nowrap pl-5`}>
                                                    {fmtDay(x.date)}
                                                    {personName(x.createdBy) && <span className="block text-xs text-gray-400">{personName(x.createdBy)}</span>}
                                                </td>
                                                <td className={`${TD} whitespace-nowrap`}>{methodLabel(x.method)}</td>
                                                <td className={`${TD} text-gray-500`}>
                                                    <p className="max-w-[260px] truncate" title={[x.reference, x.note].filter(Boolean).join(' — ')}>
                                                        {[x.reference, x.note].filter(Boolean).join(' — ') || '—'}
                                                    </p>
                                                </td>
                                                <td className={`${TD} whitespace-nowrap text-right font-medium tabular-nums text-gray-900`}>{taka(x.amount, 2)}</td>
                                                <td className={`${TD} pr-5 text-right`}>
                                                    <button type="button" aria-label="Remove payment" title="Remove payment" onClick={() => dropPayment(x._id, x.amount)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600">
                                                        <LuTrash size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* ═══ Side ═══ */}
                <div className="space-y-5">
                    <Card title="Totals">
                        <dl className="space-y-2 text-sm">
                            {foreign && <Line label={`Subtotal (${p.currency})`} value={money(p.subtotal, p.currency)} />}
                            <Line label={foreign ? 'Subtotal in taka' : 'Subtotal'} value={taka(p.subtotalBdt, 2)} />
                            <Line label="Shipping" value={taka(p.shippingCost, 2)} muted={!p.shippingCost} />
                            <Line label="Customs duty" value={taka(p.customsDuty, 2)} muted={!p.customsDuty} />
                            <Line label={p.otherCostLabel ? `Other — ${p.otherCostLabel}` : 'Other cost'} value={taka(p.otherCost, 2)} muted={!p.otherCost} />
                            <Line label="Discount" value={`− ${taka(p.discount, 2)}`} muted={!p.discount} />
                            <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                                <dt className="font-semibold text-gray-900">Grand total</dt>
                                <dd className={cx('text-xl font-semibold tabular-nums', p.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900')}>{taka(p.grandTotal, 2)}</dd>
                            </div>
                            <Line label="Paid" value={taka(p.paid, 2)} />
                            <div className="flex items-baseline justify-between">
                                <dt className="text-gray-500">Due</dt>
                                <dd className={cx('font-semibold tabular-nums', p.status === 'cancelled' ? 'text-gray-400' : p.due > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                                    {p.status === 'cancelled' ? 'cancelled' : p.due > 0 ? taka(p.due, 2) : 'settled'}
                                </dd>
                            </div>
                        </dl>
                        {p.status !== 'cancelled' && p.grandTotal > 0 && (
                            <div className="mt-3">
                                <Bar pct={paidPct} tone={paidPct >= 100 ? 'green' : 'amber'} />
                                <p className="mt-1 text-right text-xs text-gray-400">{paidPct}% paid</p>
                            </div>
                        )}
                    </Card>

                    <Card title="Order" actions={!p.can.editItems ? <Btn variant="ghost" className="h-8 px-3 text-xs" icon={<LuPencil size={13} />} onClick={() => setDetailsOpen(true)}>Edit</Btn> : undefined}>
                        <dl className="space-y-2.5 text-sm">
                            <Info label="Supplier">
                                {p.supplier ? (
                                    <>
                                        <Link href={`${PURCHASES_HREF}?supplier=${p.supplier._id}`} className="font-medium text-gray-900 hover:text-[var(--color-primary)]">{p.supplier.name}</Link>
                                        {!p.supplier.isActive && <span className="ml-1 text-xs text-gray-400">(inactive)</span>}
                                        {[p.supplier.contactPerson, p.supplier.phone, p.supplier.country].filter(Boolean).length > 0 && (
                                            <span className="block text-xs text-gray-400">{[p.supplier.contactPerson, p.supplier.phone, p.supplier.country].filter(Boolean).join(' · ')}</span>
                                        )}
                                    </>
                                ) : '—'}
                            </Info>
                            <Info label="Supplier invoice">{p.supplierInvoice || '—'}</Info>
                            <Info label="Order date">{fmtDay(p.orderDate)}</Info>
                            <Info label="ETA"><span className={overdue ? 'text-red-600' : undefined}>{p.eta ? fmtDay(p.eta) : '—'}</span></Info>
                            <Info label="Shipping">{shippingLabel(p.shippingMode) || '—'}</Info>
                            <Info label="Currency">{foreign ? `${p.currency} · 1 ${p.currency} = ৳${p.exchangeRate}` : 'BDT'}</Info>
                            <Info label="Created">{fmtStamp(p.createdAt)}{personName(p.createdBy) ? ` · ${personName(p.createdBy)}` : ''}</Info>
                        </dl>
                    </Card>

                    {p.note && (
                        <Card title="Note">
                            <p className="whitespace-pre-line text-sm text-gray-700">{p.note}</p>
                        </Card>
                    )}
                </div>
            </div>

            {receiving && <ReceiveModal id={p._id} onClose={() => setReceiving(false)} />}
            {paying && <PaymentModal purchase={p} onClose={() => setPaying(false)} />}
            {cancelling && <CancelModal purchase={p} onClose={() => setCancelling(false)} />}
            {printing && <PrintBill purchase={p} onClose={() => setPrinting(false)} />}
            {showDetails && <DetailsModal p={p} onClose={closeDetails} />}
        </div>
    );
}

/* ─── Pieces ─────────────────────────────────────────────────────────── */

function Banner({ tone, icon, children, action }: { tone: 'blue' | 'red' | 'amber'; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
    const cls = { blue: 'bg-blue-50 text-blue-800', red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-800' }[tone];
    return (
        <div className={cx('mb-5 flex flex-col gap-3 rounded-2xl px-4 py-3 text-sm sm:flex-row sm:items-center', cls)}>
            <div className="flex flex-1 gap-2.5">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <p>{children}</p>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

function Bar({ pct, tone }: { pct: number; tone: 'green' | 'amber' }) {
    return (
        <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={cx('h-full rounded-full transition-all', tone === 'green' ? 'bg-emerald-500' : 'bg-amber-400')} style={{ width: `${pct}%` }} />
        </div>
    );
}

function Line({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="min-w-0 text-gray-500">{label}</dt>
            <dd className={cx('shrink-0 tabular-nums', muted ? 'text-gray-400' : 'text-gray-900')}>{value}</dd>
        </div>
    );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
            <dt className="text-gray-500">{label}</dt>
            <dd className="min-w-0 break-words text-gray-800">{children}</dd>
        </div>
    );
}

/** After goods arrive (or once cancelled) only these three can change. */
function DetailsModal({ p, onClose }: { p: Purchase; onClose: () => void }) {
    const [invoice, setInvoice] = useState(p.supplierInvoice || '');
    const [eta, setEta] = useState(p.eta ? dhakaDay(p.eta) : '');
    const [note, setNote] = useState(p.note || '');
    const [update, { isLoading }] = useUpdatePurchaseMutation();
    const orderDay = dhakaDay(p.orderDate);
    const etaError = eta && eta < orderDay ? 'ETA cannot be before the order date' : '';

    const save = async () => {
        if (etaError) return;
        try {
            await update({ id: p._id, supplierInvoice: invoice.trim(), eta: eta || null, note: note.trim() }).unwrap();
            toast.success('Saved');
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not save'));
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={`Edit ${p.reference}`}
            subtitle={p.status === 'cancelled'
                ? 'This purchase is cancelled — reopen it as a draft to change items or prices.'
                : 'Goods have been received, so items and prices are locked. These can still change.'}
            width="max-w-md"
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" onClick={save} disabled={isLoading || !!etaError}>{isLoading ? 'Saving…' : 'Save'}</Btn>
            </>}
        >
            <div className="space-y-4">
                <Field label="Supplier invoice no.">
                    <input className={INPUT} value={invoice} maxLength={80} onChange={(e) => setInvoice(e.target.value)} autoFocus />
                </Field>
                <Field label="ETA" error={etaError || undefined}>
                    <input className={INPUT} type="date" value={eta} min={orderDay} onChange={(e) => setEta(e.target.value)} />
                </Field>
                <Field label="Note">
                    <textarea className={TEXTAREA} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
            </div>
        </Modal>
    );
}
