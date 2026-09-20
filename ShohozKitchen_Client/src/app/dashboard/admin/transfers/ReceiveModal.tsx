"use client";

import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuArrowRight, LuPackageCheck } from 'react-icons/lu';
import { Modal, Btn, Field, INPUT } from '@/components/admin/ui';
import { useUpdateTransferMutation, type Transfer } from '@/redux/api/transferApi';
import { dhakaDayOf, dhakaToday, errMsg, fmtDay, plural } from './shared';

/** Mark an in-transit transfer as received, on a chosen Bangladesh day. */
export default function ReceiveModal({ transfer, onClose }: { transfer: Transfer; onClose: () => void }) {
    const today = useMemo(() => dhakaToday(), []);
    const sentDay = dhakaDayOf(transfer.transferredAt);
    const [day, setDay] = useState(today < sentDay ? sentDay : today);
    const [error, setError] = useState('');
    const [update, { isLoading }] = useUpdateTransferMutation();

    const submit = async () => {
        if (!day) return setError('Choose the day the goods arrived');
        if (day > today) return setError('The date can’t be in the future');
        if (day < sentDay) return setError(`The goods left on ${fmtDay(transfer.transferredAt)} — pick that day or later`);
        try {
            await update({ id: transfer._id, status: 'received', receivedAt: day }).unwrap();
            toast.success(`${transfer.reference} marked received`);
            onClose();
        } catch (err) {
            toast.error(errMsg(err, 'Could not update the transfer'));
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={`Receive ${transfer.reference}`}
            subtitle="The goods arrived at the destination."
            width="max-w-md"
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" icon={<LuPackageCheck size={15} />} onClick={submit} disabled={isLoading}>
                    {isLoading ? 'Saving…' : 'Mark received'}
                </Btn>
            </>}
        >
            <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <p className="flex flex-wrap items-center gap-1.5 font-medium text-gray-900">
                    {transfer.from?.name || 'Unknown'} <LuArrowRight size={14} className="text-gray-400" /> {transfer.to?.name || 'Unknown'}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                    {plural(transfer.items.length, 'line')} · {plural(transfer.totalQty, 'unit')} · sent {fmtDay(transfer.transferredAt)}
                </p>
            </div>
            <Field label="Received on" required error={error}>
                <input type="date" className={INPUT} value={day} min={sentDay} max={today}
                    onChange={(e) => { setDay(e.target.value); setError(''); }} />
            </Field>
            <p className="mt-3 text-xs text-gray-400">Records only — product stock doesn&apos;t change.</p>
        </Modal>
    );
}
