"use client";

import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    LuPlus, LuFileText, LuDownload, LuTags, LuPencil, LuPrinter, LuPaperclip, LuImage, LuTrash2, LuImageOff,
    LuTriangleAlert, LuWallet, LuReceipt, LuChartPie, LuArrowUp, LuArrowDown, LuArrowUpDown, LuX, LuHash,
} from 'react-icons/lu';
import {
    PageHeader, Btn, SearchInput, SelectPill, FilterBar, StatTile, Badge, TableCard,
    TH, TD, TR, EmptyRow, SkeletonRows, Pager, RowMenu, taka, cx,
} from '@/components/admin/ui';
import {
    PAID_BY_OPTIONS, paidByLabel,
    useGetExpenseListQuery, useGetExpenseSummaryQuery, useGetExpenseCategoryListQuery, useLazyGetExpenseExportQuery,
    useUpdateExpenseMutation, useDeleteExpenseMutation,
    type IExpense, type IExpenseFilters, type ExpenseSort, type PaidBy,
} from '@/redux/api/expenseApi';
import { useUploadImageMutation } from '@/redux/api/uploadApi';
import {
    dhakaToday, fmtDay, fmtRange, presetRange, PERIOD_OPTIONS, type PeriodKey,
    errMsg, useDebounced, usePage, downloadCsv, monthKeysBetween, DATE_PILL,
} from './_components/shared';
import ExpenseFormModal from './_components/ExpenseFormModal';
import CategoriesModal from './_components/CategoriesModal';
import VoucherModal from './_components/VoucherModal';
import ReceiptModal from './_components/ReceiptModal';
import Breakdown from './_components/Breakdown';

/**
 * Expenses — the spending ledger: which head, how much, on which day. Admin only,
 * and not tied to orders, stock or anything else; totals work themselves out.
 */

const PAGE_SIZE = 20;
const money = (n: number) => taka(n, n % 1 ? 2 : 0);

function SortIcon({ sort, col }: { sort: ExpenseSort; col: 'date' | 'amount' }) {
    if (sort === `${col}_desc`) return <LuArrowDown size={13} />;
    if (sort === `${col}_asc`) return <LuArrowUp size={13} />;
    return <LuArrowUpDown size={13} className="text-gray-300" />;
}

export default function ExpensesPage() {
    /* ─── Filters ─── */
    const [today] = useState(dhakaToday);
    const [period, setPeriod] = useState<PeriodKey>('this_month');
    const [range, setRange] = useState<{ from?: string; to?: string }>(() => presetRange('this_month', today));
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [paidBy, setPaidBy] = useState<'' | PaidBy>('');
    const [sort, setSort] = useState<ExpenseSort>('date_desc');
    const q = useDebounced(search);

    const badRange = !!(range.from && range.to && range.from > range.to);
    const filters: IExpenseFilters = {
        search: q.trim() || undefined,
        category: category || undefined,
        paidBy: paidBy || undefined,
        from: range.from || undefined,
        to: range.to || undefined,
    };
    const [page, setPage] = usePage(JSON.stringify([filters, sort]));

    // currentData, not data: data would keep showing the previous filter's rows while the new ones load.
    const list = useGetExpenseListQuery({ ...filters, sort, page, limit: PAGE_SIZE }, { skip: badRange });
    const sum = useGetExpenseSummaryQuery(filters, { skip: badRange });
    const { data: categories = [] } = useGetExpenseCategoryListQuery();

    const rows = useMemo(() => list.currentData?.data || [], [list.currentData]);
    const meta = list.currentData?.meta || { total: 0, totalPages: 1 };
    const loading = !list.currentData && list.isFetching;
    const failed = !list.currentData && !list.isFetching && list.isError;
    const summary = sum.currentData;
    const sumLoading = !summary && sum.isFetching;
    const sumFailed = !summary && !sum.isFetching && sum.isError;
    const noSum = sumLoading || sumFailed;
    const retrySum = <button type="button" onClick={() => sum.refetch()} className="font-medium text-[var(--color-primary)] hover:underline">Couldn&apos;t load totals · Retry</button>;

    const filtered = !!(q.trim() || category || paidBy);
    const periodLabel = fmtRange(range.from, range.to);

    const choosePeriod = (p: PeriodKey) => {
        setPeriod(p);
        if (p !== 'custom') setRange(presetRange(p, today));
    };
    const setDay = (k: 'from' | 'to', v: string) => {
        setPeriod('custom');
        setRange((r) => ({ ...r, [k]: v || undefined }));
    };
    const clearFilters = () => { setSearch(''); setCategory(''); setPaidBy(''); };

    const periodMonths = useMemo(
        () => (range.from || range.to ? new Set(monthKeysBetween(range.from || '2000-01-01', range.to || today)) : null),
        [range.from, range.to, today],
    );

    /* ─── Modals ─── */
    const [form, setForm] = useState<{ key: number; expense: IExpense | null } | null>(null);
    const [managing, setManaging] = useState(false);
    const [voucher, setVoucher] = useState<{ expense: IExpense | null } | null>(null);
    const [viewingId, setViewingId] = useState<string | null>(null);
    const viewing = rows.find((r) => r._id === viewingId) || null;

    const payees = useMemo(() => [...new Set(rows.map((r) => r.paidTo).filter(Boolean))].slice(0, 30), [rows]);

    const onSaved = (e: IExpense) => {
        const outside = (range.from && e.day < range.from) || (range.to && e.day > range.to);
        if (outside) toast(`It is dated ${fmtDay(e.day)}, outside the period shown (${periodLabel}).`, { duration: 6000 });
    };

    /* ─── Receipts ─── */
    const [updateExpense] = useUpdateExpenseMutation();
    const [uploadImage] = useUploadImageMutation();
    const fileRef = useRef<HTMLInputElement>(null);
    const attachFor = useRef<IExpense | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const pickReceipt = (e: IExpense) => {
        attachFor.current = e;
        fileRef.current?.click();
    };

    const onReceiptFile = async (file?: File) => {
        const e = attachFor.current;
        if (!file || !e) return;
        if (!file.type.startsWith('image/')) { toast.error('Attach a photo or scan of the receipt (JPG, PNG, WebP)'); return; }
        if (file.size > 10 * 1024 * 1024) { toast.error('The file must be under 10 MB'); return; }
        setUploadingId(e._id);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await uploadImage(fd).unwrap();
            await updateExpense({ id: e._id, receiptUrl: res.data.url }).unwrap();
            toast.success(e.receiptUrl ? `Receipt replaced on ${e.voucherNo}` : `Receipt attached to ${e.voucherNo}`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not attach the receipt'));
        } finally {
            setUploadingId(null);
        }
    };

    const removeReceipt = async (e: IExpense) => {
        if (!window.confirm(`Remove the receipt from ${e.voucherNo} (${e.title})?`)) return;
        try {
            await updateExpense({ id: e._id, receiptUrl: '' }).unwrap();
            toast.success('Receipt removed');
            setViewingId(null);
        } catch (err) {
            toast.error(errMsg(err, 'Could not remove the receipt'));
        }
    };

    /* ─── Delete ─── */
    const [deleteExpense] = useDeleteExpenseMutation();
    const remove = async (e: IExpense) => {
        if (!window.confirm(`Delete ${e.voucherNo}: "${e.title}", ${money(e.amount)} on ${fmtDay(e.day)}?\n\nIt leaves every total. This cannot be undone.`)) return;
        try {
            await deleteExpense(e._id).unwrap();
            toast.success(`${e.voucherNo} deleted`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not delete the expense'));
        }
    };

    /* ─── CSV ─── */
    const [runExport, { isFetching: exporting }] = useLazyGetExpenseExportQuery();
    const exportCsv = async () => {
        try {
            const res = await runExport({ ...filters, sort }, false).unwrap();
            if (!res.rows.length) { toast.error('Nothing to export for these filters'); return; }
            downloadCsv(`expenses_${range.from || 'start'}_to_${range.to || today}.csv`, [
                ['Voucher', 'Date', 'What for', 'Category', 'Paid to', 'Reference', 'Paid by', 'Amount (BDT)', 'Note', 'Receipt'],
                ...res.rows.map((r) => [r.voucherNo, r.day, r.title, r.category?.name || '', r.paidTo, r.reference, paidByLabel(r.paidBy), r.amount, r.note, r.receiptUrl]),
            ]);
            toast.success(res.truncated
                ? `Exported the first ${res.rows.length.toLocaleString('en-IN')} of ${res.total.toLocaleString('en-IN')}. Narrow the period for the rest.`
                : `Exported ${res.rows.length.toLocaleString('en-IN')} expense${res.rows.length === 1 ? '' : 's'}`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not export the expenses'));
        }
    };

    /* ─── Sorting by column ─── */
    const sortBy = (col: 'date' | 'amount') => {
        const desc = `${col}_desc` as ExpenseSort;
        setSort(sort === desc ? (`${col}_asc` as ExpenseSort) : desc);
    };

    const categoryOptions = useMemo(() => [
        { value: '', label: 'All categories' },
        ...categories.map((c) => ({ value: c._id, label: c.isActive ? c.name : `${c.name} (off)` })),
    ], [categories]);

    const COLS = 10;
    const biggest = summary?.biggestCategory;

    /* ─── Row pieces shared by the table and the phone cards ─── */
    const receiptButton = (e: IExpense) => (
        uploadingId === e._id ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 px-3 text-xs text-gray-500">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--color-primary)]" /> Uploading…
            </span>
        ) : e.receiptUrl ? (
            <button type="button" onClick={() => setViewingId(e._id)} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100">
                <LuImage size={14} /> View receipt
            </button>
        ) : (
            <button type="button" onClick={() => pickReceipt(e)} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50">
                <LuPaperclip size={14} /> Attach receipt
            </button>
        )
    );

    const menu = (e: IExpense) => (
        <RowMenu items={[
            { label: 'Edit', icon: <LuPencil size={15} />, onClick: () => setForm({ key: Date.now(), expense: e }) },
            { label: 'Print voucher', icon: <LuPrinter size={15} />, onClick: () => setVoucher({ expense: e }) },
            { label: 'View receipt', icon: <LuImage size={15} />, onClick: () => setViewingId(e._id), hidden: !e.receiptUrl },
            { label: e.receiptUrl ? 'Replace receipt' : 'Attach receipt', icon: <LuPaperclip size={15} />, onClick: () => pickReceipt(e) },
            { label: 'Remove receipt', icon: <LuImageOff size={15} />, onClick: () => removeReceipt(e), hidden: !e.receiptUrl },
            { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => remove(e), danger: true },
        ]} />
    );

    const emptyState = failed ? (
        <>
            <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
            Couldn&apos;t load the expenses.
            <div className="mt-3"><Btn onClick={() => { list.refetch(); sum.refetch(); }}>Retry</Btn></div>
        </>
    ) : badRange ? (
        <>
            <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
            The start date is after the end date.
        </>
    ) : (
        <>
            <LuWallet size={28} className="mx-auto mb-2 text-gray-300" />
            {filtered
                ? <>No expenses match these filters. <button type="button" onClick={clearFilters} className="font-medium text-[var(--color-primary)] hover:underline">Clear filters</button></>
                : <>Nothing spent in {periodLabel === 'All time' ? 'the books yet' : 'this period'}. Record the first expense to see it here.</>}
            {!filtered && <div className="mt-3"><Btn variant="primary" icon={<LuPlus size={15} />} onClick={() => setForm({ key: Date.now(), expense: null })}>Record expense</Btn></div>}
        </>
    );

    return (
        <div>
            <PageHeader
                title="Expenses"
                subtitle="What the business spends money on: which head, how much and when. Record each payment and the totals work themselves out."
                actions={<>
                    <Btn icon={<LuTags size={15} />} onClick={() => setManaging(true)}>Categories</Btn>
                    <Btn icon={<LuDownload size={15} />} onClick={exportCsv} disabled={exporting || badRange}>{exporting ? 'Exporting…' : 'Export CSV'}</Btn>
                    <Btn icon={<LuFileText size={15} />} onClick={() => setVoucher({ expense: null })}>Blank voucher</Btn>
                    <Btn variant="primary" icon={<LuPlus size={16} />} onClick={() => setForm({ key: Date.now(), expense: null })}>Record expense</Btn>
                </>}
            />

            {/* ═══ Tiles ═══ */}
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <StatTile
                    label="Spent in this period"
                    icon={<LuWallet size={16} />}
                    value={noSum ? '—' : money(summary?.total || 0)}
                    hint={sumFailed ? retrySum : periodLabel}
                />
                <StatTile
                    label="Entries"
                    icon={<LuHash size={16} />}
                    value={noSum ? '—' : (summary?.count || 0).toLocaleString('en-IN')}
                    hint={summary?.count
                        ? `Avg ${money(summary.average)} each · ${summary.withReceipt} with receipt${summary.withReceipt === 1 ? '' : 's'}`
                        : 'No expenses in this view'}
                />
                <StatTile
                    label="Biggest category"
                    icon={<LuChartPie size={16} />}
                    value={noSum ? '—' : biggest ? <span className="block truncate">{biggest.name}</span> : '—'}
                    hint={biggest ? `${money(biggest.total)} · ${biggest.share.toFixed(0)}% of spending` : undefined}
                    active={!!biggest?.categoryId && category === biggest.categoryId}
                    onClick={biggest?.categoryId ? () => setCategory(category === biggest.categoryId ? '' : (biggest.categoryId as string)) : undefined}
                />
            </div>

            {/* ═══ Filters ═══ */}
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search what for, paid to, reference" className="sm:w-72" />
                <SelectPill ariaLabel="Category" value={category} onChange={setCategory} options={categoryOptions} className="sm:w-48" />
                <SelectPill
                    ariaLabel="Paid by"
                    value={paidBy}
                    onChange={(v) => setPaidBy(v as '' | PaidBy)}
                    options={[{ value: '', label: 'Any method' }, ...PAID_BY_OPTIONS]}
                    className="sm:w-40"
                />
                <SelectPill ariaLabel="Period" value={period} onChange={(v) => choosePeriod(v as PeriodKey)} options={PERIOD_OPTIONS} className="sm:w-40" />
                <div className="flex items-center gap-2">
                    <input type="date" aria-label="From" className={DATE_PILL} value={range.from || ''} max={range.to || undefined} onChange={(e) => setDay('from', e.target.value)} />
                    <span className="text-sm text-gray-400">to</span>
                    <input type="date" aria-label="To" className={DATE_PILL} value={range.to || ''} min={range.from || undefined} onChange={(e) => setDay('to', e.target.value)} />
                </div>
                {(filtered || period !== 'this_month') && (
                    <button
                        type="button"
                        onClick={() => { clearFilters(); choosePeriod('this_month'); }}
                        className="inline-flex h-9 items-center gap-1 self-start rounded-full px-3 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 sm:self-auto"
                    >
                        <LuX size={14} /> Reset
                    </button>
                )}
            </FilterBar>

            <Breakdown
                summary={summary}
                loading={sumLoading}
                activeCategory={category}
                onCategory={setCategory}
                periodMonths={periodMonths}
            />

            {/* ═══ Phone: cards ═══ */}
            <div className="space-y-2 md:hidden">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />)
                ) : rows.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">{emptyState}</div>
                ) : rows.map((e) => (
                    <div key={e._id} className={cx('rounded-2xl border border-gray-200 bg-white p-4', list.isFetching && 'opacity-60')}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{e.title}</p>
                                <p className="mt-0.5 text-xs text-gray-500">{fmtDay(e.day)} · {e.voucherNo} · {paidByLabel(e.paidBy)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <span className="font-semibold tabular-nums text-gray-900">{money(e.amount)}</span>
                                {menu(e)}
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            {e.category && <Badge tone="gray">{e.category.name}</Badge>}
                            {e.paidTo && <span>To {e.paidTo}</span>}
                            {e.reference && <span>Ref {e.reference}</span>}
                        </div>
                        <div className="mt-3">{receiptButton(e)}</div>
                    </div>
                ))}
                {!loading && rows.length > 0 && (
                    <Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="expenses" />
                )}
            </div>

            {/* ═══ Desktop / tablet: table ═══ */}
            <div className="hidden md:block">
                <TableCard footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="expenses" />}>
                    <table className={cx('w-full', list.isFetching && !loading && 'opacity-60')}>
                        <thead>
                            <tr>
                                <th className={`${TH} w-12`}>#</th>
                                <th className={TH}>
                                    <button type="button" onClick={() => sortBy('date')} className="inline-flex items-center gap-1 hover:text-[var(--color-primary)]">Date <SortIcon sort={sort} col="date" /></button>
                                </th>
                                <th className={TH}>What for</th>
                                <th className={TH}>Category</th>
                                <th className={TH}>Paid to</th>
                                <th className={TH}>Reference</th>
                                <th className={TH}>Paid by</th>
                                <th className={`${TH} text-right`}>
                                    <button type="button" onClick={() => sortBy('amount')} className="inline-flex items-center gap-1 hover:text-[var(--color-primary)]">Amount <SortIcon sort={sort} col="amount" /></button>
                                </th>
                                <th className={TH}>Receipt</th>
                                <th className={`${TH} w-12`} />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <SkeletonRows cols={COLS} rows={8} /> : rows.length === 0 ? (
                                <EmptyRow colSpan={COLS}>{emptyState}</EmptyRow>
                            ) : rows.map((e, i) => (
                                <tr key={e._id} className={TR}>
                                    <td className={`${TD} text-gray-400`}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                    <td className={`${TD} whitespace-nowrap`}>
                                        <p className="text-gray-900">{fmtDay(e.day)}</p>
                                        <p className="text-xs text-gray-400">{e.voucherNo}</p>
                                    </td>
                                    <td className={TD}>
                                        <button type="button" onClick={() => setForm({ key: Date.now(), expense: e })} className="max-w-[240px] truncate text-left font-medium text-gray-900 hover:text-[var(--color-primary)]" title={e.title}>
                                            {e.title}
                                        </button>
                                        {e.note && <p className="max-w-[240px] truncate text-xs text-gray-400" title={e.note}>{e.note}</p>}
                                    </td>
                                    <td className={TD}>{e.category ? <Badge tone="gray">{e.category.name}</Badge> : <span className="text-gray-300">—</span>}</td>
                                    <td className={`${TD} max-w-[180px] truncate text-gray-500`} title={e.paidTo || undefined}>{e.paidTo || <span className="text-gray-300">—</span>}</td>
                                    <td className={`${TD} max-w-[160px] truncate text-gray-500`} title={e.reference || undefined}>{e.reference || <span className="text-gray-300">—</span>}</td>
                                    <td className={`${TD} whitespace-nowrap text-gray-500`}>{paidByLabel(e.paidBy)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right font-semibold tabular-nums text-gray-900`}>{money(e.amount)}</td>
                                    <td className={TD}>{receiptButton(e)}</td>
                                    <td className={`${TD} text-right`}>{menu(e)}</td>
                                </tr>
                            ))}
                        </tbody>
                        {!loading && rows.length > 0 && summary && (
                            <tfoot>
                                <tr className="border-t border-gray-200 bg-gray-50/60">
                                    <td className={TD} />
                                    <td className={`${TD} font-medium text-gray-700`} colSpan={6}>
                                        Total of {summary.count.toLocaleString('en-IN')} expense{summary.count === 1 ? '' : 's'}{filtered ? ' matching the filters' : ''} · {periodLabel}
                                    </td>
                                    <td className={`${TD} whitespace-nowrap text-right font-bold tabular-nums text-gray-900`}>{money(summary.total)}</td>
                                    <td className={TD} colSpan={2}>
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-400"><LuReceipt size={13} /> {summary.withReceipt}/{summary.count}</span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </TableCard>
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(ev) => { onReceiptFile(ev.target.files?.[0]); ev.target.value = ''; }} />

            {form && (
                <ExpenseFormModal
                    key={form.key}
                    expense={form.expense}
                    categories={categories}
                    payees={payees}
                    onSaved={onSaved}
                    onClose={() => setForm(null)}
                />
            )}
            {managing && <CategoriesModal onClose={() => setManaging(false)} />}
            {voucher && <VoucherModal expense={voucher.expense} onClose={() => setVoucher(null)} />}
            {viewing && (
                <ReceiptModal
                    expense={viewing}
                    busy={uploadingId === viewing._id}
                    onReplace={() => pickReceipt(viewing)}
                    onRemove={() => removeReceipt(viewing)}
                    onClose={() => setViewingId(null)}
                />
            )}
        </div>
    );
}
