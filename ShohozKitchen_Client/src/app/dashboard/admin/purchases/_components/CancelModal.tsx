"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuTriangleAlert } from 'react-icons/lu';
import { Modal, Btn, Field, TEXTAREA, taka } from '@/components/admin/ui';
import { useCancelPurchaseMutation } from '@/redux/api/purchaseApi';
import { errorMessage } from '@/app/dashboard/admin/inventory/shared';

type Target = { _id: string; reference: string; paid: number };

/** Cancel a purchase that has received nothing yet. */
export default function CancelModal({ purchase, onClose }: { purchase: Target; onClose: () => void }) {
    const [reason, setReason] = useState('');
    const [cancel, { isLoading }] = useCancelPurchaseMutation();

    const submit = async () => {
        try {
            await cancel({ id: purchase._id, reason: reason.trim() || undefined }).unwrap();
            toast.success(`${purchase.reference} cancelled`);
            if (purchase.paid > 0) {
                toast(`${taka(purchase.paid, 2)} was paid on it — get it back from the supplier, then remove the payment.`, { duration: 8000 });
            }
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not cancel the purchase'));
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={`Cancel ${purchase.reference}?`}
            subtitle="A cancelled purchase leaves every total. You can reopen it as a draft later."
            width="max-w-md"
            footer={<>
                <Btn onClick={onClose}>Keep it</Btn>
                <Btn variant="danger" onClick={submit} disabled={isLoading}>{isLoading ? 'Cancelling…' : 'Cancel purchase'}</Btn>
            </>}
        >
            {purchase.paid > 0 && (
                <div className="mb-4 flex gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <LuTriangleAlert size={17} className="mt-0.5 shrink-0" />
                    <p>{taka(purchase.paid, 2)} has been paid on this purchase. It stays recorded until you remove the payment (once the supplier refunds it).</p>
                </div>
            )}
            <Field label="Reason" hint="Optional — shown on the purchase.">
                <textarea className={TEXTAREA} rows={3} maxLength={300} value={reason} autoFocus onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Supplier out of stock" />
            </Field>
        </Modal>
    );
}
