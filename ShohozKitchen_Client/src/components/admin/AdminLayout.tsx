/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { IconType } from 'react-icons';
import {
    LuLayoutDashboard, LuPackage, LuLayoutGrid, LuRuler, LuTags,
    LuUsers, LuUserPen, LuShoppingCart, LuChartColumn, LuStar, LuTicketPercent, LuUndo2, LuShieldAlert,
    LuStore, LuTruck, LuWarehouse, LuBoxes, LuArrowLeftRight,
    LuReceipt, LuHandCoins, LuWallet, LuSettings,
    LuMapPin, LuZap, LuCreditCard, LuMessageCircle, LuMail, LuLayoutTemplate, LuUser, LuShield,
    LuPanelLeft, LuChevronRight, LuLogOut, LuX,
} from 'react-icons/lu';
import NotificationBell from '@/components/notifications/NotificationBell';
import Logo from '@/components/shared/Logo';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

interface AdminLayoutProps { children: React.ReactNode; }

/**
 * Menu status against the client's requirement screenshots:
 *   'ok'      — built and matches (green)
 *   'partial' — something exists but the scope/shape differs (yellow)
 *   'new'     — nothing built yet (red); these do not navigate anywhere
 *   'extra'   — ours, not in the client's design (grey)
 */
type MenuStatus = 'ok' | 'partial' | 'new' | 'extra';

export const STATUS_COLOR: Record<MenuStatus, string> = {
    ok: '#22c55e',
    partial: '#eab308',
    new: '#ef4444',
    extra: '#94a3b8',
};

const STATUS_TITLE: Record<MenuStatus, string> = {
    ok: 'Matches the client requirement',
    partial: 'Partly built — needs changes',
    new: 'Not built yet',
    extra: 'Extra — not in the client design',
};

type MenuItem = { name: string; href: string; icon: IconType; status: MenuStatus; superadminOnly?: boolean };

// Grouped exactly as the client's screenshots show the sidebar.
const menuSections: { label: string; items: MenuItem[] }[] = [
    {
        label: '',
        items: [
            { name: 'Dashboard', href: '/dashboard/admin', icon: LuLayoutDashboard, status: 'partial' },
        ],
    },
    {
        label: 'Catalog',
        items: [
            { name: 'Products', href: '/dashboard/admin/products', icon: LuPackage, status: 'ok' },
            { name: 'Categories', href: '/dashboard/admin/categories', icon: LuLayoutGrid, status: 'ok' },
            { name: 'Units', href: '', icon: LuRuler, status: 'new' },
            { name: 'Attributes', href: '', icon: LuTags, status: 'partial' },
        ],
    },
    {
        label: 'Sales & CRM',
        items: [
            { name: 'Customers', href: '/dashboard/admin/customers', icon: LuUsers, status: 'ok' },
            { name: 'Update requests', href: '', icon: LuUserPen, status: 'new' },
            { name: 'Orders', href: '/dashboard/admin/orders', icon: LuShoppingCart, status: 'ok' },
            { name: 'Reports', href: '/dashboard/admin/analytics', icon: LuChartColumn, status: 'partial' },
            { name: 'Reviews', href: '/dashboard/admin/reviews', icon: LuStar, status: 'ok' },
            { name: 'Coupons', href: '/dashboard/admin/coupons', icon: LuTicketPercent, status: 'ok' },
            { name: 'Returns', href: '/dashboard/admin/returns', icon: LuUndo2, status: 'ok' },
            { name: 'Fraud check', href: '', icon: LuShieldAlert, status: 'new' },
        ],
    },
    {
        label: 'Procurement',
        items: [
            { name: 'Suppliers', href: '', icon: LuStore, status: 'new' },
            { name: 'Purchases', href: '', icon: LuTruck, status: 'new' },
        ],
    },
    {
        label: 'Inventory',
        items: [
            { name: 'Warehouses', href: '', icon: LuWarehouse, status: 'new' },
            { name: 'Inventory', href: '', icon: LuBoxes, status: 'partial' },
            { name: 'Transfers', href: '', icon: LuArrowLeftRight, status: 'new' },
        ],
    },
    {
        label: 'Accounts',
        items: [
            { name: 'Overview', href: '', icon: LuLayoutGrid, status: 'new' },
            { name: 'Expenses', href: '', icon: LuReceipt, status: 'new' },
            { name: 'Investors', href: '', icon: LuHandCoins, status: 'new' },
            { name: 'Courier payouts', href: '/dashboard/admin/courier', icon: LuWallet, status: 'partial' },
        ],
    },
    {
        label: 'Administration',
        items: [
            { name: 'Settings', href: '/dashboard/admin/settings', icon: LuSettings, status: 'partial' },
        ],
    },
    // Ours — kept, but absent from the client's screenshots.
    {
        label: 'Extra (ours)',
        items: [
            { name: 'Shipping & Zones', href: '/dashboard/admin/shipping', icon: LuMapPin, status: 'extra' },
            { name: 'Offers & Flash Sales', href: '/dashboard/admin/offers', icon: LuZap, status: 'extra' },
            { name: 'Payments', href: '/dashboard/admin/payments', icon: LuCreditCard, status: 'extra' },
            { name: 'Support', href: '/dashboard/admin/messages', icon: LuMessageCircle, status: 'extra' },
            { name: 'Inquiries', href: '/dashboard/admin/inquiries', icon: LuMail, status: 'extra' },
            { name: 'Site Content', href: '/dashboard/admin/site-content', icon: LuLayoutTemplate, status: 'extra' },
            { name: 'Profile', href: '/dashboard/admin/profile', icon: LuUser, status: 'extra' },
            { name: 'Roles & Permissions', href: '/dashboard/admin/roles', icon: LuShield, status: 'extra', superadminOnly: true },
        ],
    },
];

const allMenuItems = menuSections.flatMap((s) => s.items).filter((i) => i.href);
const ROOT = '/dashboard/admin';

/** The menu item a path belongs to — the longest href that prefixes it. */
function matchItem(pathname: string): MenuItem | undefined {
    return allMenuItems
        .filter((i) => i.href !== ROOT && (pathname === i.href || pathname.startsWith(i.href + '/')))
        .sort((a, b) => b.href.length - a.href.length)[0];
}

const titleCase = (s: string) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Dashboard › Orders › New — derived from the path and the menu above. */
function buildCrumbs(pathname: string): { label: string; href?: string }[] {
    const crumbs: { label: string; href?: string }[] = [{ label: 'Dashboard', href: ROOT }];
    if (pathname === ROOT) return [{ label: 'Dashboard' }];

    const item = matchItem(pathname);
    let rest: string[];
    if (item) {
        crumbs.push({ label: item.name, href: item.href });
        rest = pathname.slice(item.href.length).split('/').filter(Boolean);
    } else {
        rest = pathname.slice(ROOT.length).split('/').filter(Boolean);
    }
    rest.forEach((seg, i) => {
        const label = /^[a-f0-9]{24}$/i.test(seg) ? 'Details' : seg === 'new' ? 'New' : titleCase(seg);
        const href = (item ? item.href : ROOT) + '/' + rest.slice(0, i + 1).join('/');
        crumbs.push({ label, href });
    });
    // The current page is never a link.
    delete crumbs[crumbs.length - 1].href;
    return crumbs;
}

function Sidebar({ pathname, role, onClose, onLogout }: {
    pathname: string; role?: string; onClose?: () => void; onLogout: () => void;
}) {
    const active = matchItem(pathname);
    const isActive = (item: MenuItem) => (item.href === ROOT ? pathname === ROOT : active?.href === item.href);

    return (
        <div className="flex h-full flex-col">
            {/* Brand */}
            <div className="flex h-16 shrink-0 items-center justify-between px-4">
                <Link href={ROOT} className="flex items-center gap-2.5">
                    <Logo iconOnly size={34} />
                    <span className="leading-tight">
                        <span className="block text-[15px] font-semibold text-gray-900">Shohoz Kitchen</span>
                        <span className="block text-xs text-gray-500">Admin Dashboard</span>
                    </span>
                </Link>
                {onClose && (
                    <button type="button" aria-label="Close menu" onClick={onClose} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden">
                        <LuX size={18} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 pb-3">
                {menuSections.map((section) => (
                    <div key={section.label || 'main'} className="mb-1">
                        {section.label && <p className="px-3 pb-1 pt-4 text-xs font-medium text-gray-500">{section.label}</p>}
                        {section.items.filter((i) => !i.superadminOnly || role === 'superadmin').map((item) => {
                            const on = isActive(item);
                            // Nothing is built behind a red item yet, so it must not navigate.
                            const unbuilt = item.status === 'new' || !item.href;
                            const Icon = item.icon;
                            const body = (
                                <>
                                    <Icon size={17} className={on ? 'text-[var(--color-primary)]' : unbuilt ? 'text-gray-300' : 'text-gray-500 group-hover:text-gray-700'} />
                                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                    <span
                                        title={STATUS_TITLE[item.status]}
                                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                                        style={{ background: STATUS_COLOR[item.status] }}
                                    />
                                </>
                            );
                            const cls = 'group flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors';
                            return unbuilt ? (
                                <div key={item.name} title={STATUS_TITLE[item.status]} className={`${cls} cursor-not-allowed text-gray-400`}>{body}</div>
                            ) : (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`${cls} ${on ? 'bg-gray-200/60 font-medium text-gray-900' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                                >
                                    {body}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Legend — what the dots beside each menu mean */}
            <div className="shrink-0 border-t border-gray-200 px-4 py-3">
                <p className="mb-2 text-[11px] font-medium text-gray-500">Against client requirement</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {([
                        ['ok', 'Done'],
                        ['partial', 'Partly done'],
                        ['new', 'Not built yet'],
                        ['extra', 'Extra (ours)'],
                    ] as [MenuStatus, string][]).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[key] }} />
                            <span className="text-[11px] text-gray-500">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="shrink-0 border-t border-gray-200 p-3">
                <button
                    type="button"
                    onClick={onLogout}
                    className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                    <LuLogOut size={17} /> Logout
                </button>
            </div>
        </div>
    );
}

const COLLAPSE_KEY = 'sk-admin-sidebar-collapsed';

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const user = useSelector((s: RootState) => s.auth.user);
    const role = user?.role;

    useEffect(() => { setMobileOpen(false); }, [pathname]);

    // Desktop collapse is a per-browser preference only.
    useEffect(() => {
        try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch { /* storage unavailable */ }
    }, []);

    const toggleSidebar = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) { setMobileOpen(true); return; }
        setCollapsed((c) => {
            try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* storage unavailable */ }
            return !c;
        });
    };

    const handleLogout = () => { localStorage.removeItem('token'); router.push('/'); };

    const crumbs = buildCrumbs(pathname);
    const name = user?.name?.trim() || 'Admin';
    const initials = name.split(/\s+/).map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="min-h-screen bg-white">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} />
            )}

            {/* Desktop sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 hidden w-[248px] border-r border-gray-200 bg-gray-50 transition-transform duration-200 lg:block ${collapsed ? '-translate-x-full' : 'translate-x-0'}`}
            >
                <Sidebar pathname={pathname} role={role} onLogout={handleLogout} />
            </aside>

            {/* Mobile sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-[100] w-[272px] border-r border-gray-200 bg-gray-50 shadow-xl transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <Sidebar pathname={pathname} role={role} onClose={() => setMobileOpen(false)} onLogout={handleLogout} />
            </aside>

            {/* Main */}
            <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? 'lg:ml-0' : 'lg:ml-[248px]'}`}>
                <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur sm:px-6">
                    <div className="flex min-w-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            aria-label="Toggle sidebar"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
                        >
                            <LuPanelLeft size={17} />
                        </button>
                        <span className="h-5 w-px shrink-0 bg-gray-200" />
                        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
                            {crumbs.map((c, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <LuChevronRight size={14} className="shrink-0 text-gray-400" />}
                                    {c.href ? (
                                        <Link href={c.href} className={`truncate text-gray-500 hover:text-gray-900 ${i < crumbs.length - 2 ? 'hidden sm:inline' : ''}`}>{c.label}</Link>
                                    ) : (
                                        <span className="truncate font-medium text-gray-900">{c.label}</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </nav>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        <NotificationBell theme="indigo" seeAllHref="/dashboard/admin/notifications" />
                        <Link
                            href="/"
                            className="hidden h-8 items-center gap-1.5 rounded-full px-3 text-sm text-gray-600 hover:bg-gray-100 sm:inline-flex"
                        >
                            <LuStore size={15} /> Store
                        </Link>
                        <span
                            title={name}
                            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700"
                        >
                            {initials}
                        </span>
                    </div>
                </header>

                <main className="px-4 py-6 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
