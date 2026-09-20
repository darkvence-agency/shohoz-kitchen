"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { LuPrinter } from 'react-icons/lu';
import { Modal, Btn, taka, cx } from '@/components/admin/ui';
import { PAID_BY_OPTIONS, type IExpense } from '@/redux/api/expenseApi';
import { fmtDay, takaInWords } from './shared';

/**
 * A printable expense voucher. With an expense it is filled in; without one it is a
 * blank voucher to fill by hand (two copies per A4 sheet, with a cut line).
 *
 * Printing: the voucher is also rendered straight into <body> (outside the admin
 * layout), and the print stylesheet below hides everything else — sidebar, header,
 * this modal — so only the voucher reaches the paper.
 */

const PRINT_ROOT_ID = 'sk-expense-voucher-print';

const PRINT_CSS = `
#${PRINT_ROOT_ID} { display: none; }
@media print {
  body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
  #${PRINT_ROOT_ID} { display: block !important; }
  html, body { background: #fff !important; }
  @page { size: A4 portrait; margin: 12mm; }
  #${PRINT_ROOT_ID} .voucher { break-inside: avoid; page-break-inside: avoid; }
  #${PRINT_ROOT_ID} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

function Line({ label, value, className }: { label: string; value?: React.ReactNode; className?: string }) {
    return (
        <div className={cx('flex items-end gap-3', className)}>
            <span className="shrink-0 text-[12px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
            <span className="min-h-[22px] flex-1 border-b border-dotted border-gray-400 pb-0.5 text-[14px] text-gray-900">{value}</span>
        </div>
    );
}

function Box({ checked }: { checked: boolean }) {
    return (
        <span className={cx('inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border', checked ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-400')}>
            {checked && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </span>
    );
}

export function VoucherSheet({ expense }: { expense?: IExpense | null }) {
    const e = expense || null;
    return (
        <div className="voucher rounded-xl border border-gray-300 bg-white p-6 text-gray-900">
            {/* Head */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--color-primary)] pb-4">
                <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-mark.svg" alt="" className="h-10 w-10" />
                    <div>
                        <p className="text-lg font-bold leading-tight">Shohoz Kitchen</p>
                        <p className="text-xs text-gray-500">Expense voucher</p>
                    </div>
                </div>
                <div className="space-y-1 text-right text-sm">
                    <p><span className="text-gray-500">No.</span> <span className="inline-block min-w-[96px] border-b border-dotted border-gray-400 text-left font-semibold">{e?.voucherNo || ''}</span></p>
                    <p><span className="text-gray-500">Date</span> <span className="inline-block min-w-[96px] border-b border-dotted border-gray-400 text-left">{e ? fmtDay(e.day) : ''}</span></p>
                </div>
            </div>

            {/* Body */}
            <div className="mt-5 space-y-4">
                <Line label="Paid to" value={e?.paidTo} />
                <Line label="What for" value={e?.title} />
                <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
                    <Line label="Category" value={e?.category?.name} />
                    <Line label="Reference" value={e?.reference} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-[12px] font-medium uppercase tracking-wide text-gray-500">Paid by</span>
                    {PAID_BY_OPTIONS.map((o) => (
                        <span key={o.value} className="inline-flex items-center gap-1.5 text-[13px]">
                            <Box checked={e?.paidBy === o.value} /> {o.label}
                        </span>
                    ))}
                </div>
                <div className="flex items-stretch gap-3">
                    <div className="flex-1 space-y-4">
                        <Line label="Amount in words" value={e ? takaInWords(e.amount) : ''} />
                        <Line label="Note" value={e?.note} />
                    </div>
                    <div className="flex w-40 shrink-0 flex-col justify-center rounded-lg border-2 border-gray-900 px-3 py-2 text-right">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Amount</span>
                        <span className="text-xl font-bold tabular-nums">{e ? taka(e.amount, e.amount % 1 ? 2 : 0) : '৳'}</span>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="mt-12 grid grid-cols-3 gap-6 text-center text-[12px] text-gray-600">
                {['Prepared by', 'Approved by', 'Received by'].map((s) => (
                    <div key={s}>
                        <div className="mb-1.5 border-t border-gray-500" />
                        {s}
                    </div>
                ))}
            </div>
        </div>
    );
}

function PrintCopies({ expense }: { expense?: IExpense | null }) {
    const copies = expense ? 1 : 2;
    return (
        <div id={PRINT_ROOT_ID}>
            {Array.from({ length: copies }).map((_, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <div className="my-6 border-t border-dashed border-gray-400 text-center text-[10px] text-gray-400">cut here</div>}
                    <VoucherSheet expense={expense} />
                </React.Fragment>
            ))}
        </div>
    );
}

export default function VoucherModal({ expense, onClose }: { expense?: IExpense | null; onClose: () => void }) {
    const blank = !expense;
    return (
        <>
            <Modal
                open
                onClose={onClose}
                width="max-w-3xl"
                title={blank ? 'Blank expense voucher' : `Voucher ${expense?.voucherNo}`}
                subtitle={blank
                    ? 'Print it, fill it in by hand when you pay, then record the expense here. Two copies print on one A4 sheet.'
                    : 'Print it for your files or to get it signed.'}
                footer={<>
                    <Btn onClick={onClose}>Close</Btn>
                    <Btn variant="primary" icon={<LuPrinter size={15} />} onClick={() => window.print()}>Print</Btn>
                </>}
            >
                <div className="overflow-x-auto">
                    <div className="min-w-[560px]">
                        <VoucherSheet expense={expense} />
                    </div>
                </div>
            </Modal>
            {typeof document !== 'undefined' && createPortal(
                <>
                    <style>{PRINT_CSS}</style>
                    <PrintCopies expense={expense} />
                </>,
                document.body,
            )}
        </>
    );
}
