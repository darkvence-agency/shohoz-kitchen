"use client";

/**
 * What an editor lands on: the order desk's queue right now, and their own work
 * for the period — confirmations, their value, where that puts them. Only the
 * signed-in person's numbers; the rank is a place, never other people's names.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { LuClock, LuPackageCheck, LuTruck, LuCircleCheck, LuWallet, LuCircleX, LuTrophy } from 'react-icons/lu';
import { RootState } from '@/redux/store';
import { useGetMyActivityQuery } from '@/redux/api/analyticsApi';
import { PageHeader, Segmented, StatTile, Card, Badge, taka, cx } from '@/components/admin/ui';
import { dhakaToday, fmtPeriod } from '@/app/dashboard/admin/analytics/_components/period';

type Preset = 'today' | 'month' | 'year';

const rangeOf = (p: Preset) => {
    const t = dhakaToday();
    if (p === 'today') return { from: t, to: t };
    if (p === 'month') return { from: `${t.slice(0, 8)}01`, to: t };
    return { from: `${t.slice(0, 4)}-01-01`, to: t };
};

const PERIOD_WORD: Record<Preset, string> = { today: 'today', month: 'this month', year: 'this year' };

const STATUS_TONE: Record<string, 'blue' | 'indigo' | 'purple' | 'green' | 'red' | 'amber' | 'gray'> = {
    confirmed: 'blue',
    processing: 'indigo',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red',
    returned: 'amber',
};

const Pill = ({ value }: { value: string }) => (
    <Badge tone={STATUS_TONE[value] || 'gray'}><span className="capitalize">{(value || '—').replace(/_/g, ' ')}</span></Badge>
);

const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka',
    });

export default function EditorDashboard() {
    const router = useRouter();
    const user = useSelector((s: RootState) => s.auth.user);
    const [preset, setPreset] = useState<Preset>('month');
    const range = rangeOf(preset);

    const { data, isLoading } = useGetMyActivityQuery(range);
    const a = data?.data;
    const me = a?.me;
    const q = a?.queue;
    const n = (v?: number) => (isLoading || v === undefined ? '—' : v.toLocaleString('en-IN'));

    const rankHint = !a
        ? undefined
        : a.rank
            ? `#${a.rank} of ${a.staffCount} on the desk ${PERIOD_WORD[preset]}`
            : `No confirmations ${PERIOD_WORD[preset]} yet`;

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Hi, ${user?.name?.split(' ')[0] || 'there'}`}
                subtitle={`Your work on the order desk — ${fmtPeriod(range.from, range.to)}`}
                actions={
                    <Segmented
                        value={preset}
                        onChange={(v) => setPreset(v as Preset)}
                        options={[{ value: 'today', label: 'Today' }, { value: 'month', label: 'This month' }, { value: 'year', label: 'This year' }]}
                    />
                }
            />

            {/* ── What is waiting right now (shop-wide) ── */}
            <section>
                <h2 className="mb-2 text-sm font-medium text-gray-500">Waiting on the desk right now</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                    <StatTile
                        label="New, to confirm" value={n(q?.toConfirm)} icon={<LuClock size={18} />}
                        hint="Call the customer, then confirm" onClick={() => router.push('/dashboard/admin/orders?status=pending')}
                    />
                    <StatTile
                        label="Confirmed, to pack & ship" value={n(q?.toShip)} icon={<LuPackageCheck size={18} />}
                        hint="Confirmed or being processed" onClick={() => router.push('/dashboard/admin/orders?status=confirmed')}
                    />
                    <StatTile
                        label="On the way" value={n(q?.onTheWay)} icon={<LuTruck size={18} />}
                        hint="With the courier" onClick={() => router.push('/dashboard/admin/orders?status=shipped')}
                    />
                </div>
            </section>

            {/* ── My own numbers for the period ── */}
            <section>
                <h2 className="mb-2 text-sm font-medium text-gray-500">My work {PERIOD_WORD[preset]}</h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile label="Orders I confirmed" value={n(me?.confirmed)} icon={<LuCircleCheck size={18} />} hint={rankHint} />
                    <StatTile label="Value confirmed" value={isLoading || !me ? '—' : taka(me.confirmedValue)} icon={<LuWallet size={18} />} />
                    <StatTile label="Delivered" value={n(me?.delivered)} icon={<LuTrophy size={18} />} hint="Orders I marked delivered" />
                    <StatTile label="Cancelled" value={n(me?.cancelled)} icon={<LuCircleX size={18} />} hint="Orders I cancelled" />
                </div>
            </section>

            {/* ── What I did last ── */}
            <Card
                title="My recent changes"
                description={`Every status change you made ${PERIOD_WORD[preset]}, newest first.`}
                actions={<Link href="/dashboard/admin/orders" className="text-sm font-medium text-[var(--color-primary)] hover:underline">Open orders</Link>}
            >
                {isLoading ? (
                    <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
                ) : !a?.recent.length ? (
                    <p className="py-6 text-center text-sm text-gray-400">
                        Nothing yet {PERIOD_WORD[preset]}. Orders you confirm or update will show up here.
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {a.recent.map((h) => (
                            <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                                <span className="w-28 shrink-0 text-gray-500">{fmtWhen(h.at)}</span>
                                {h.orderId ? (
                                    <Link href={`/dashboard/admin/orders/${h.orderId}`} className="w-24 shrink-0 font-medium text-[var(--color-primary)] hover:underline">
                                        {h.orderNo || h.orderId.slice(-8)}
                                    </Link>
                                ) : <span className="w-24 shrink-0 text-gray-400">—</span>}
                                <span className="inline-flex items-center gap-1.5">
                                    <Pill value={h.from} />
                                    <span className="text-gray-400">→</span>
                                    <Pill value={h.to} />
                                </span>
                                <span className={cx('ml-auto whitespace-nowrap text-gray-600')}>{taka(h.total)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
