"use client";

import React from 'react';
import { toast } from 'react-hot-toast';
import { LuArrowDownLeft, LuArrowUpRight, LuPencil, LuTrash2, LuTriangleAlert, LuDownload, LuBookOpen } from 'react-icons/lu';
import { Modal, Btn, Badge, TH, TD, TR, taka, cx } from '@/components/admin/ui';
import {
    useGetInvestorLedgerQuery,
    useDeleteInvestorTransactionMutation,
    type IInvestorTx,
    type InvestorTxType,
} from '@/redux/api/investorApi';
import { paidByLabel } from '@/redux/api/expenseApi';
import { fmtDay, errMsg, downloadCsv } from '../../expenses/_components/shared';

const money = (n: number) => taka(n, n % 1 ? 2 : 0);

/** One investor's dated ledger with the running balance (newest first). */
export default function LedgerModal({ investorId, onAdd, onEdit, onClose }: {
    investorId: string;
    onAdd: (type: InvestorTxType, name: string) => void;
    onEdit: (tx: IInvestorTx, name: string) => void;
    onClose: () => void;
}) {
    const { currentData: inv, isFetching, isError, refetch } = useGetInvestorLedgerQuery(investorId);
    const [deleteTx] = useDeleteInvestorTransactionMutation();
    const loading = !inv && isFetching;
    const txs = inv ? [...inv.transactions].reverse() : [];

    const remove = async (t: IInvestorTx) => {
        if (!inv) return;
        const what = t.type === 'in' ? 'money in' : 'money out';
        if (!window.confirm(`Delete this ${what} of ${money(t.amount)} on ${fmtDay(t.day)}? This cannot be undone.`)) return;
        try {
            await deleteTx({ investorId: inv._id, txId: t._id }).unwrap();
            toast.success('Transaction deleted');
        } catch (err) {
            toast.error(errMsg(err, 'Could not delete the transaction'), { duration: 7000 });
        }
    };

    const exportCsv = () => {
        if (!inv?.transactions.length) return;
        downloadCsv(`investor_${inv.name.replace(/[^\w]+/g, '_')}_ledger.csv`, [
            ['Date', 'Type', 'Method', 'Reference', 'Note', 'Money in (BDT)', 'Money out (BDT)', 'Balance (BDT)'],
            ...inv.transactions.map((t) => [t.day, t.type === 'in' ? 'Money in' : 'Money out', paidByLabel(t.method), t.reference, t.note, t.type === 'in' ? t.amount : '', t.type === 'out' ? t.amount : '', t.balance]),
        ]);
    };

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-4xl"
            title={inv ? `${inv.name} · ledger` : 'Ledger'}
            subtitle={inv ? [inv.phone, inv.email].filter(Boolean).join(' · ') || 'Every taka they have put in and taken out.' : undefined}
            footer={<>
                <Btn className="mr-auto" icon={<LuDownload size={15} />} onClick={exportCsv} disabled={!inv?.transactions.length}>Export CSV</Btn>
                <Btn onClick={onClose}>Close</Btn>
            </>}
        >
            {loading ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}</div>
                    {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
                </div>
            ) : !inv ? (
                <div className="py-10 text-center text-sm text-gray-500">
                    <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                    {isError ? 'Couldn’t load the ledger.' : 'Investor not found.'}
                    {isError && <div className="mt-3"><Btn onClick={() => refetch()}>Retry</Btn></div>}
                </div>
            ) : (
                <>
                    <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
                        {[
                            { label: 'Put in', value: inv.moneyIn },
                            { label: 'Taken out', value: inv.moneyOut },
                            { label: 'Balance', value: inv.balance, strong: true },
                        ].map((s) => (
                            <div key={s.label} className="rounded-xl border border-gray-200 px-3 py-2.5">
                                <p className="text-xs text-gray-500">{s.label}</p>
                                <p className={cx('mt-0.5 truncate tabular-nums text-gray-900', s.strong ? 'text-lg font-bold' : 'text-base font-semibold')}>{money(s.value)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Btn variant="primary" icon={<LuArrowDownLeft size={15} />} onClick={() => onAdd('in', inv.name)}>Add money in</Btn>
                        <Btn icon={<LuArrowUpRight size={15} />} onClick={() => onAdd('out', inv.name)} disabled={inv.balance <= 0}>Record money out</Btn>
                        {!inv.isActive && <Badge tone="gray">Inactive</Badge>}
                    </div>

                    {txs.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                            <LuBookOpen size={26} className="mx-auto mb-2 text-gray-300" />
                            No money in or out yet.
                        </div>
                    ) : (
                        <div className={cx('overflow-hidden rounded-xl border border-gray-200', isFetching && 'opacity-60')}>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px]">
                                    <thead>
                                        <tr>
                                            <th className={TH}>Date</th>
                                            <th className={TH}>Type</th>
                                            <th className={TH}>Method / reference</th>
                                            <th className={`${TH} text-right`}>Money in</th>
                                            <th className={`${TH} text-right`}>Money out</th>
                                            <th className={`${TH} text-right`}>Balance</th>
                                            <th className={`${TH} w-20`} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {txs.map((t) => (
                                            <tr key={t._id} className={TR}>
                                                <td className={`${TD} whitespace-nowrap text-gray-900`}>{fmtDay(t.day)}</td>
                                                <td className={TD}>
                                                    {t.type === 'in' ? <Badge tone="green">Money in</Badge> : <Badge tone="amber">Money out</Badge>}
                                                </td>
                                                <td className={TD}>
                                                    <p className="text-gray-700">{paidByLabel(t.method)}{t.reference && <span className="text-gray-400"> · {t.reference}</span>}</p>
                                                    {t.note && <p className="max-w-[260px] truncate text-xs text-gray-400" title={t.note}>{t.note}</p>}
                                                </td>
                                                <td className={`${TD} whitespace-nowrap text-right tabular-nums text-emerald-700`}>{t.type === 'in' ? money(t.amount) : ''}</td>
                                                <td className={`${TD} whitespace-nowrap text-right tabular-nums text-amber-700`}>{t.type === 'out' ? money(t.amount) : ''}</td>
                                                <td className={`${TD} whitespace-nowrap text-right font-semibold tabular-nums text-gray-900`}>{money(t.balance)}</td>
                                                <td className={`${TD} whitespace-nowrap text-right`}>
                                                    <button type="button" aria-label="Edit transaction" onClick={() => onEdit(t, inv.name)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"><LuPencil size={15} /></button>
                                                    <button type="button" aria-label="Delete transaction" onClick={() => remove(t)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-red-50"><LuTrash2 size={15} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {inv.note && <p className="mt-3 text-xs text-gray-500"><span className="font-medium text-gray-600">Note:</span> {inv.note}</p>}
                </>
            )}
        </Modal>
    );
}
