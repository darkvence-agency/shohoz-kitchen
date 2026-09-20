"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuShieldCheck, LuBan, LuTriangleAlert } from 'react-icons/lu';
import { Modal, Btn, Field, TEXTAREA, taka, cx } from '@/components/admin/ui';
import { useReviewFraudFlagMutation, useCancelFraudOrderMutation, type IFraudFlag } from '@/redux/api/fraudApi';
import { errMsg, plural, orderClosed, closedHint } from './shared';

const MAX_NOTE = 500;

function NoteField({ label, value, onChange, placeholder, autoFocus }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean;
}) {
    const tooLong = value.trim().length > MAX_NOTE;
    return (
        <Field
            label={label}
            error={tooLong ? `Keep it under ${MAX_NOTE} characters (${value.trim().length} now)` : undefined}
            hint={`Optional. Saved on the flag${label === 'Reason' ? ' and in the order timeline' : ''}. ${value.trim().length}/${MAX_NOTE}`}
        >
            <textarea
                rows={3}
                autoFocus={autoFocus}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cx(TEXTAREA, tooLong && 'border-red-300')}
            />
        </Field>
    );
}

/**
 * Mark a flag as cleared: the admin checked the customer and the order can go ahead.
 * When the order already closed elsewhere (cancelled, delivered…) it is worded as
 * "Close flag" instead: there is nothing left to check.
 */
export function ClearFlagModal({ flag, onClose }: { flag: IFraudFlag; onClose: () => void }) {
    const [note, setNote] = useState(flag.reviewNote || '');
    const [review, { isLoading }] = useReviewFraudFlagMutation();
    const invalid = note.trim().length > MAX_NOTE;
    const closed = orderClosed(flag);
    const action = closed ? 'Close flag' : 'Mark cleared';

    const save = async () => {
        if (invalid) return;
        try {
            await review({ id: flag._id, status: 'cleared', note: note.trim() }).unwrap();
            toast.success(closed ? `Flag on ${flag.orderRef} closed` : `${flag.orderRef} cleared`);
            onClose();
        } catch (err) {
            toast.error(errMsg(err, closed ? 'Couldn’t close this flag' : 'Couldn’t clear this flag'));
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={closed ? 'Close this flag' : 'Mark as cleared'}
            subtitle={`${flag.orderRef} · ${flag.customer.name || flag.customer.phone}`}
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" icon={<LuShieldCheck size={15} />} onClick={save} disabled={isLoading || invalid}>
                    {isLoading ? 'Saving…' : action}
                </Btn>
            </>}
        >
            <p className="mb-4 text-sm text-gray-600">
                {closed ? (
                    <>{closedHint(flag)}. Closing the flag takes it off the review list. The order itself does not change.</>
                ) : (
                    <>
                        Use this once you have checked the customer, for example by calling them, and the order can go ahead.
                        The order itself does not change.
                    </>
                )}
            </p>
            <NoteField
                label="Note"
                value={note}
                onChange={setNote}
                placeholder={closed ? 'e.g. Customer cancelled on the phone' : 'e.g. Called the customer, confirmed the address'}
                autoFocus
            />
        </Modal>
    );
}

/** Cancel the flagged order. The server restocks the items and tells the customer. */
export function CancelOrderModal({ flag, onClose }: { flag: IFraudFlag; onClose: () => void }) {
    const [note, setNote] = useState('');
    const [cancelOrder, { isLoading }] = useCancelFraudOrderMutation();
    const invalid = note.trim().length > MAX_NOTE;

    const confirm = async () => {
        if (invalid) return;
        try {
            await cancelOrder({ id: flag._id, note: note.trim() || undefined }).unwrap();
            toast.success(`${flag.orderRef} cancelled. Its items are back in stock`);
            onClose();
        } catch (err) {
            toast.error(errMsg(err, 'Couldn’t cancel the order'), { duration: 6000 });
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={`Cancel order ${flag.orderRef}?`}
            subtitle={`${flag.customer.name || flag.customer.phone}${flag.order ? ` · ${taka(flag.order.total)}` : ''}`}
            footer={<>
                <Btn onClick={onClose}>Keep order</Btn>
                <Btn variant="danger" icon={<LuBan size={15} />} onClick={confirm} disabled={isLoading || invalid}>
                    {isLoading ? 'Cancelling…' : 'Cancel order'}
                </Btn>
            </>}
        >
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                <LuTriangleAlert size={16} className="mt-0.5 shrink-0" />
                <p>
                    The order is cancelled, its items go back into stock and the customer is told it was cancelled.
                    This can&apos;t be undone from here.
                </p>
            </div>
            <p className="mb-4 text-sm text-gray-600">
                This customer returned {plural(flag.returnCount, 'order')} before
                {flag.previousOrderCount > 0 && <> out of {plural(flag.previousOrderCount, 'earlier order')}</>}.
            </p>
            <NoteField
                label="Reason"
                value={note}
                onChange={setNote}
                placeholder="e.g. Returned 3 orders and didn’t answer the phone"
                autoFocus
            />
        </Modal>
    );
}
