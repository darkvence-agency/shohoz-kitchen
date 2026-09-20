"use client";

import React, { useState } from 'react';
import { LuExternalLink, LuRefreshCw, LuTrash2, LuImageOff } from 'react-icons/lu';
import { Modal, Btn, taka } from '@/components/admin/ui';
import type { IExpense } from '@/redux/api/expenseApi';
import { fmtDay } from './shared';

/** View an expense's receipt, with Replace and Remove. */
export default function ReceiptModal({ expense, busy, onReplace, onRemove, onClose }: {
    expense: IExpense;
    busy?: boolean;
    onReplace: () => void;
    onRemove: () => void;
    onClose: () => void;
}) {
    const [broken, setBroken] = useState(false);
    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-2xl"
            title={`Receipt · ${expense.voucherNo}`}
            subtitle={`${expense.title} · ${taka(expense.amount, expense.amount % 1 ? 2 : 0)} · ${fmtDay(expense.day)}`}
            footer={<>
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={busy}
                    className="mr-auto inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                    <LuTrash2 size={15} /> Remove
                </button>
                <Btn icon={<LuRefreshCw size={15} />} onClick={onReplace} disabled={busy}>{busy ? 'Uploading…' : 'Replace'}</Btn>
                <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-dark)]"
                >
                    <LuExternalLink size={15} /> Open
                </a>
            </>}
        >
            <div className="flex min-h-[240px] items-center justify-center rounded-xl bg-gray-50 p-3">
                {broken ? (
                    <div className="text-center text-sm text-gray-500">
                        <LuImageOff size={28} className="mx-auto mb-2 text-gray-300" />
                        The receipt could not be shown here. Try opening it in a new tab.
                    </div>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={expense.receiptUrl}
                        alt={`Receipt for ${expense.title}`}
                        onError={() => setBroken(true)}
                        className="max-h-[60vh] max-w-full rounded-lg object-contain"
                    />
                )}
            </div>
        </Modal>
    );
}
