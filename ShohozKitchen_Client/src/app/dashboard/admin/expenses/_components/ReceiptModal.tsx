"use client";

import React from 'react';
import { Modal, Btn, taka } from '@/components/admin/ui';
import { MAX_EXPENSE_ATTACHMENTS, type IExpense, type IExpenseAttachment } from '@/redux/api/expenseApi';
import { fmtDay } from './shared';
import { AttachmentDrop, AttachmentTiles, useAttachmentUpload } from './Attachments';

/**
 * Every receipt and paper filed with an expense: open any of them, add more, remove one.
 * Each change is saved straight away through `onSave`, with the whole new list.
 */
export default function ReceiptModal({ expense, busy, onSave, onClose }: {
    expense: IExpense;
    busy?: boolean;
    onSave: (attachments: IExpenseAttachment[]) => Promise<void> | void;
    onClose: () => void;
}) {
    const files = expense.attachments || [];
    const { upload, uploading } = useAttachmentUpload();

    const add = async (picked: FileList | null) => {
        const added = await upload(picked, MAX_EXPENSE_ATTACHMENTS - files.length);
        if (added.length) await onSave([...files, ...added]);
    };

    const remove = async (i: number) => {
        const name = files[i]?.name || 'this file';
        if (!window.confirm(`Remove ${name} from ${expense.voucherNo}?`)) return;
        await onSave(files.filter((_, j) => j !== i));
    };

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-2xl"
            title={`Receipts & documents · ${expense.voucherNo}`}
            subtitle={`${expense.title} · ${taka(expense.amount, expense.amount % 1 ? 2 : 0)} · ${fmtDay(expense.day)}`}
            footer={<Btn onClick={onClose}>Done</Btn>}
        >
            <div className={busy || uploading ? 'pointer-events-none opacity-60' : undefined}>
                {files.length ? (
                    <AttachmentTiles items={files} onRemove={remove} size="lg" />
                ) : (
                    <p className="py-6 text-center text-sm text-gray-500">Nothing filed with this expense yet.</p>
                )}
                <p className="mt-3 text-xs text-gray-400">
                    {files.length}/{MAX_EXPENSE_ATTACHMENTS} files · click one to open it full size
                </p>
                {files.length < MAX_EXPENSE_ATTACHMENTS && (
                    <div className="mt-4"><AttachmentDrop onFiles={add} uploading={uploading || busy} /></div>
                )}
            </div>
        </Modal>
    );
}
