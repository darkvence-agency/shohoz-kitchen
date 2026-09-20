"use client";

import React from 'react';
import { LuArrowRight, LuPackageCheck, LuPencil, LuTriangleAlert } from 'react-icons/lu';
import { Modal, Btn, Badge } from '@/components/admin/ui';
import { useGetTransferByIdQuery, type Transfer, type TransferWarehouse } from '@/redux/api/transferApi';
import TransferItems from './TransferItems';
import { TRANSFER_STATUS, fmtDay, fmtDayTime, plural } from './shared';

function Place({ label, w }: { label: string; w: TransferWarehouse | null }) {
    return (
        <div className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{w?.name || 'Deleted warehouse'}</p>
            {w?.location && <p className="truncate text-xs text-gray-500">{w.location}</p>}
            {w && w.isActive === false && <p className="text-xs text-gray-400">Inactive</p>}
        </div>
    );
}

export default function TransferDetailModal({ id, onClose, onEdit, onReceive }: {
    id: string;
    onClose: () => void;
    onEdit: (t: Transfer) => void;
    onReceive: (t: Transfer) => void;
}) {
    const { data: t, isLoading, isError, refetch, isFetching } = useGetTransferByIdQuery(id);
    const by = t?.createdBy ? [t.createdBy.firstName, t.createdBy.lastName].filter(Boolean).join(' ') : '';

    return (
        <Modal
            open
            onClose={onClose}
            title={t ? t.reference : 'Transfer'}
            subtitle={t ? <Badge tone={TRANSFER_STATUS[t.status].tone}>{TRANSFER_STATUS[t.status].label}</Badge> : undefined}
            width="max-w-xl"
            footer={
                // Wraps on narrow phones instead of pushing "Close" off the dialog's left edge.
                <div className="flex flex-wrap justify-end gap-2">
                    <Btn onClick={onClose}>Close</Btn>
                    {t?.status === 'in_transit' && <>
                        <Btn icon={<LuPencil size={15} />} onClick={() => onEdit(t)}>Edit</Btn>
                        <Btn variant="primary" icon={<LuPackageCheck size={15} />} onClick={() => onReceive(t)}>Mark received</Btn>
                    </>}
                </div>
            }
        >
            {isLoading ? (
                <div className="space-y-3">
                    <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
                    <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
                </div>
            ) : isError || !t ? (
                <div className="py-8 text-center text-sm text-gray-500">
                    <LuTriangleAlert size={26} className="mx-auto mb-2 text-amber-500" />
                    Couldn&apos;t load this transfer.
                    <div className="mt-3"><Btn onClick={() => refetch()} disabled={isFetching}>Retry</Btn></div>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                        <Place label="From" w={t.from} />
                        <LuArrowRight size={18} className="mx-auto shrink-0 rotate-90 text-gray-400 sm:rotate-0" />
                        <Place label="To" w={t.to} />
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                            <dt className="text-xs text-gray-400">Transferred</dt>
                            <dd className="mt-0.5 text-gray-900">{fmtDay(t.transferredAt)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-400">{t.status === 'cancelled' ? 'Cancelled' : 'Received'}</dt>
                            <dd className="mt-0.5 text-gray-900">
                                {t.status === 'received' ? fmtDay(t.receivedAt)
                                    : t.status === 'cancelled' ? fmtDay(t.cancelledAt)
                                        : <span className="text-amber-600">Not yet — in transit</span>}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-400">Items</dt>
                            <dd className="mt-0.5 text-gray-900">{plural(t.items.length, 'line')} · {plural(t.totalQty, 'unit')}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-400">Recorded</dt>
                            <dd className="mt-0.5 text-gray-900">{fmtDayTime(t.createdAt)}{by && <span className="text-gray-500"> by {by}</span>}</dd>
                        </div>
                    </dl>

                    <TransferItems items={t.items} thumbs />

                    {t.note && (
                        <div>
                            <p className="text-xs text-gray-400">Note</p>
                            <p className="mt-0.5 whitespace-pre-line text-sm text-gray-700 [overflow-wrap:anywhere]">{t.note}</p>
                        </div>
                    )}

                    <p className="text-xs text-gray-400">
                        {t.status === 'received'
                            ? 'Received transfers stay in your records. If this was marked by mistake, use “Undo receive” in the row menu.'
                            : 'Records only — product stock and the inventory ledger don’t change.'}
                    </p>
                </div>
            )}
        </Modal>
    );
}
