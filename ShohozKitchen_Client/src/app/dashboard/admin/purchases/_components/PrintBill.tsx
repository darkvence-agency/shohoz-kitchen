"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { LuPrinter } from 'react-icons/lu';
import { Modal, Btn } from '@/components/admin/ui';
import Logo from '@/components/shared/Logo';
import type { Purchase } from '@/redux/api/purchaseApi';
import {
    money, fmtDay, shippingLabel, statusMeta, methodLabel, currencySymbol,
} from './shared';

/**
 * A printable purchase bill — blank (to fill in by hand) or filled from a purchase.
 *
 * On screen it is previewed in a modal. For printing, a second copy is portalled
 * straight under <body>, and a print-only stylesheet hides every other child of
 * <body> (the admin sidebar, header, this modal). The stylesheet exists only while
 * this component is mounted, so no other page's printing is affected.
 */
const PRINT_ROOT_ID = 'purchase-bill-print-root';

const PRINT_CSS = `
#${PRINT_ROOT_ID} { display: none; }
@media print {
    @page { size: A4; margin: 12mm; }
    html, body { background: #fff !important; }
    body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
    #${PRINT_ROOT_ID} { display: block !important; }
    #${PRINT_ROOT_ID} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

const BLANK_ROWS = 14;

export default function PrintBill({ purchase, onClose }: { purchase?: Purchase | null; onClose: () => void }) {
    const title = purchase ? `Purchase bill · ${purchase.reference}` : 'Blank purchase bill';
    return (
        <>
            <style>{PRINT_CSS}</style>
            <Modal
                open
                onClose={onClose}
                title={title}
                subtitle={purchase ? 'Check it, then print or save as PDF.' : 'Print it and fill it in by hand — at the supplier, the port or the warehouse.'}
                width="max-w-4xl"
                footer={<>
                    <Btn onClick={onClose}>Close</Btn>
                    <Btn variant="primary" icon={<LuPrinter size={15} />} onClick={() => window.print()}>Print</Btn>
                </>}
            >
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-5">
                    <div className="mx-auto min-w-[640px] max-w-[794px] bg-white p-6 shadow-sm sm:p-8">
                        <Bill purchase={purchase} />
                    </div>
                </div>
            </Modal>
            {typeof document !== 'undefined' && createPortal(
                <div id={PRINT_ROOT_ID}><Bill purchase={purchase} /></div>,
                document.body,
            )}
        </>
    );
}

/* ─── The bill itself (plain black-on-white, prints the same everywhere) ─── */

const cell = 'border border-gray-300 px-2 py-1.5 align-top';
const head = `${cell} bg-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700`;
const blankLine = 'mt-1 h-5 border-b border-dotted border-gray-400';

function Row({ label, value, strong }: { label: string; value?: React.ReactNode; strong?: boolean }) {
    return (
        <tr>
            <td className={`${cell} ${strong ? 'font-semibold' : ''} text-gray-700`}>{label}</td>
            <td className={`${cell} w-40 text-right tabular-nums ${strong ? 'font-semibold text-black' : ''}`}>{value ?? ''}</td>
        </tr>
    );
}

function Labeled({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            {value !== undefined && value !== null && value !== ''
                ? <p className="mt-0.5 break-words text-[13px] text-black">{value}</p>
                : <div className={blankLine} />}
        </div>
    );
}

function Bill({ purchase: p }: { purchase?: Purchase | null }) {
    const blank = !p;
    const cur = p?.currency || 'BDT';
    const foreign = cur !== 'BDT';
    const s = p?.supplier;

    return (
        <div className="text-[13px] leading-snug text-black" style={{ fontFamily: 'inherit' }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
                <div>
                    <Logo size={34} />
                    <p className="mt-1 text-[11px] text-gray-600">Purchase record — for internal use</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold uppercase tracking-wide">Purchase bill</p>
                    <p className="mt-0.5 font-mono text-sm">{p ? p.reference : 'PO ____________________'}</p>
                    {p && <p className="text-[11px] text-gray-600">Status: {statusMeta(p.status).label}</p>}
                </div>
            </div>

            {/* Supplier + order */}
            <div className="mt-4 grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Supplier</p>
                    <Labeled label="Name" value={s?.name} />
                    <Labeled label="Contact person" value={blank ? undefined : s?.contactPerson || '—'} />
                    <Labeled label="Phone / email" value={blank ? undefined : [s?.phone, s?.email].filter(Boolean).join(' · ') || '—'} />
                    <Labeled label="Address / country" value={blank ? undefined : [s?.address, s?.country].filter(Boolean).join(', ') || '—'} />
                </div>
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Order</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <Labeled label="Order date" value={p ? fmtDay(p.orderDate) : undefined} />
                        <Labeled label="ETA" value={blank ? undefined : p?.eta ? fmtDay(p.eta) : '—'} />
                        <Labeled label="Supplier invoice" value={blank ? undefined : p?.supplierInvoice || '—'} />
                        <Labeled label="Shipping" value={blank ? undefined : shippingLabel(p?.shippingMode) || '—'} />
                        <Labeled label="Currency" value={blank ? undefined : cur} />
                        <Labeled label="Exchange rate" value={blank ? undefined : foreign ? `1 ${cur} = ৳${p!.exchangeRate}` : '—'} />
                    </div>
                    {blank && <p className="pt-1 text-[11px] text-gray-500">Shipping: ☐ Sea ☐ Air ☐ Road ☐ Local &nbsp; Currency: ☐ BDT ☐ RMB ☐ USD</p>}
                </div>
            </div>

            {/* Items */}
            <table className="mt-5 w-full border-collapse">
                <thead>
                    <tr>
                        <th className={`${head} w-8`}>#</th>
                        <th className={head}>Item / description</th>
                        <th className={`${head} w-24`}>SKU</th>
                        <th className={`${head} w-16 text-right`}>Qty</th>
                        <th className={`${head} w-24 text-right`}>Unit cost{p ? ` (${currencySymbol(cur)})` : ''}</th>
                        <th className={`${head} w-28 text-right`}>Amount{p ? ` (${currencySymbol(cur)})` : ''}</th>
                    </tr>
                </thead>
                <tbody>
                    {p ? p.items.map((it, i) => (
                        <tr key={it._id}>
                            <td className={`${cell} text-gray-600`}>{i + 1}</td>
                            <td className={cell}>
                                {it.name}
                                {it.variantLabel && <span className="text-gray-600"> · {it.variantLabel}</span>}
                            </td>
                            <td className={`${cell} text-gray-600`}>{it.sku}</td>
                            <td className={`${cell} text-right tabular-nums`}>{it.qty.toLocaleString('en-IN')}</td>
                            <td className={`${cell} text-right tabular-nums`}>{money(it.unitCost, cur, 4)}</td>
                            <td className={`${cell} text-right tabular-nums`}>{money(it.lineTotal, cur)}</td>
                        </tr>
                    )) : Array.from({ length: BLANK_ROWS }).map((_, i) => (
                        <tr key={i}>
                            <td className={`${cell} h-7 text-gray-400`}>{i + 1}</td>
                            <td className={cell} />
                            <td className={cell} />
                            <td className={cell} />
                            <td className={cell} />
                            <td className={cell} />
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals + payments */}
            <div className="mt-4 grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    {p && p.payments.length > 0 && (
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-700">Payments</p>
                            <table className="w-full border-collapse">
                                <tbody>
                                    {p.payments.map((x) => (
                                        <tr key={x._id}>
                                            <td className={`${cell} text-gray-700`}>{fmtDay(x.date)}</td>
                                            <td className={`${cell} text-gray-700`}>{methodLabel(x.method)}{x.reference ? ` · ${x.reference}` : ''}</td>
                                            <td className={`${cell} text-right tabular-nums`}>{money(x.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Note</p>
                        {p?.note
                            ? <p className="mt-1 whitespace-pre-line text-gray-800">{p.note}</p>
                            : <><div className={blankLine} /><div className={blankLine} /><div className={blankLine} /></>}
                    </div>
                </div>
                <table className="w-full self-start border-collapse">
                    <tbody>
                        {(foreign || blank) && <Row label={`Subtotal${p ? ` (${cur})` : ' (currency)'}`} value={p ? money(p.subtotal, cur) : undefined} />}
                        <Row label="Subtotal (BDT)" value={p ? money(p.subtotalBdt) : undefined} />
                        <Row label="Shipping" value={p ? money(p.shippingCost) : undefined} />
                        <Row label="Customs duty" value={p ? money(p.customsDuty) : undefined} />
                        <Row label={p?.otherCostLabel ? `Other — ${p.otherCostLabel}` : 'Other cost'} value={p ? money(p.otherCost) : undefined} />
                        <Row label="Discount" value={p ? (p.discount ? `− ${money(p.discount)}` : money(0)) : undefined} />
                        <Row label="Grand total (BDT)" value={p ? money(p.grandTotal) : undefined} strong />
                        <Row label="Paid" value={p ? money(p.paid) : undefined} />
                        <Row label={p?.status === 'cancelled' ? 'Due (cancelled)' : 'Due'} value={p ? money(p.due) : undefined} strong />
                    </tbody>
                </table>
            </div>

            {/* Signatures */}
            <div className="mt-12 grid grid-cols-4 gap-6 text-center text-[11px] text-gray-600">
                {['Prepared by', 'Checked by', 'Approved by', 'Supplier'].map((l) => (
                    <div key={l}>
                        <div className="border-t border-black pt-1">{l}</div>
                    </div>
                ))}
            </div>
            <p className="mt-6 text-[10px] text-gray-400">
                {p ? `Printed from Shohoz Kitchen admin · ${p.reference}` : 'Shohoz Kitchen · purchase bill'} · amounts in BDT unless marked
            </p>
        </div>
    );
}
