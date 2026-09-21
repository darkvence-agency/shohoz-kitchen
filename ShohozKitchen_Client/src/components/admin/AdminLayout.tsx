/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { IconType } from 'react-icons';
import {
    LuLayoutDashboard, LuPackage, LuLayoutGrid, LuRuler, LuTags,
    LuUsers, LuUserCheck, LuShoppingCart, LuChartColumn, LuStar, LuTicketPercent, LuUndo2, LuShieldAlert,
    LuStore, LuTruck, LuWarehouse, LuBoxes, LuArrowLeftRight, LuScanLine,
    LuReceipt, LuHandCoins, LuWallet, LuSettings, LuActivity,
    LuZap, LuCreditCard, LuLayoutTemplate, LuUser, LuUserCog, LuShield,
    LuMessageSquare, LuMessagesSquare, LuChartLine, LuTarget, LuSearch, LuGlobe,
    LuPanelLeft, LuChevronRight, LuLogOut, LuX,
} from 'react-icons/lu';
import NotificationBell from '@/components/notifications/NotificationBell';
import Logo from '@/components/shared/Logo';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { ADMIN_ROOT, ROLE_LABEL, canOpen, homeFor } from './access';

interface AdminLayoutProps { children: React.ReactNode; }

// Who sees an item follows the page rules in ./access (canOpen), so the menu and the
// pages never disagree. Sections with nothing visible to the role are dropped.
type MenuItem = { name: string; href: string; icon: IconType };

// Ordered by how often the shop actually needs them: the day's work first
// (orders, catalogue, stock), then buying, people, money, and settings last.
const menuSections: { label: string; items: MenuItem[] }[] = [
    {
        label: '',
        items: [
            { name: 'Dashboard', href: '/dashboard/admin', icon: LuLayoutDashboard },
        ],
    },
    {
        label: 'Orders',
        items: [
            { name: 'Orders', href: '/dashboard/admin/orders', icon: LuShoppingCart },
            { name: 'Returns', href: '/dashboard/admin/returns', icon: LuUndo2 },
            { name: 'Fraud check', href: '/dashboard/admin/fraud-check', icon: LuShieldAlert },
            // Steadfast parcel booking and sync.
            { name: 'Courier parcels', href: '/dashboard/admin/courier', icon: LuTruck },
        ],
    },
    {
        label: 'Catalog',
        items: [
            { name: 'Products', href: '/dashboard/admin/products', icon: LuPackage },
            { name: 'Categories', href: '/dashboard/admin/categories', icon: LuLayoutGrid },
            { name: 'Attributes', href: '/dashboard/admin/attributes', icon: LuTags },
            { name: 'Units', href: '/dashboard/admin/units', icon: LuRuler },
            { name: 'Reviews', href: '/dashboard/admin/reviews', icon: LuStar },
            { name: 'Offers & flash sales', href: '/dashboard/admin/offers', icon: LuZap },
            { name: 'Coupons', href: '/dashboard/admin/coupons', icon: LuTicketPercent },
        ],
    },
    {
        label: 'Inventory',
        items: [
            { name: 'Stock', href: '/dashboard/admin/inventory', icon: LuBoxes },
            { name: 'Warehouses', href: '/dashboard/admin/warehouses', icon: LuWarehouse },
            { name: 'Transfers', href: '/dashboard/admin/transfers', icon: LuArrowLeftRight },
            { name: 'Barcode scanner', href: '/dashboard/admin/scanner', icon: LuScanLine },
        ],
    },
    {
        label: 'Purchasing',
        items: [
            { name: 'Suppliers', href: '/dashboard/admin/suppliers', icon: LuStore },
            { name: 'Purchases', href: '/dashboard/admin/purchases', icon: LuTruck },
        ],
    },
    {
        label: 'Customers',
        items: [
            { name: 'Customers', href: '/dashboard/admin/customers', icon: LuUsers },
            { name: 'Inquiries', href: '/dashboard/admin/inquiries', icon: LuMessageSquare },
            { name: 'Support messages', href: '/dashboard/admin/messages', icon: LuMessagesSquare },
        ],
    },
    {
        label: 'Reports',
        items: [
            { name: 'Sales reports', href: '/dashboard/admin/analytics', icon: LuChartColumn },
            { name: 'Staff activity', href: '/dashboard/admin/staff-activity', icon: LuUserCheck },
        ],
    },
    {
        label: 'Finance',
        items: [
            { name: 'Accounts overview', href: '/dashboard/admin/accounts', icon: LuLayoutGrid },
            { name: 'Expenses', href: '/dashboard/admin/expenses', icon: LuReceipt },
            { name: 'Investors', href: '/dashboard/admin/investors', icon: LuHandCoins },
            { name: 'Payments', href: '/dashboard/admin/payments', icon: LuCreditCard },
            { name: 'Courier payouts', href: '/dashboard/admin/courier-payouts', icon: LuWallet },
        ],
    },
    {
        // Super admin only (access.ts).
        label: 'Digital marketing',
        items: [
            { name: 'Tag Manager', href: '/dashboard/admin/marketing/tag-manager', icon: LuTags },
            { name: 'Google Analytics', href: '/dashboard/admin/marketing/analytics', icon: LuChartLine },
            { name: 'Pixels', href: '/dashboard/admin/marketing/pixels', icon: LuTarget },
            { name: 'Search Console', href: '/dashboard/admin/marketing/search-console', icon: LuSearch },
            { name: 'SEO', href: '/dashboard/admin/marketing/seo', icon: LuGlobe },
        ],
    },
    {
        label: 'Settings',
        items: [
            { name: 'Store settings', href: '/dashboard/admin/settings', icon: LuSettings },
            { name: 'Shipping', href: '/dashboard/admin/shipping', icon: LuTruck },
            { name: 'Site content', href: '/dashboard/admin/site-content', icon: LuLayoutTemplate },
            // Super admin only (access.ts): add admins and editors, change roles.
            { name: 'Staff', href: '/dashboard/admin/staff', icon: LuUserCog },
            { name: 'Roles & permissions', href: '/dashboard/admin/roles', icon: LuShield },
            { name: 'System health', href: '/dashboard/admin/health', icon: LuActivity },
            { name: 'My profile', href: '/dashboard/admin/profile', icon: LuUser },
        ],
    },
];

const allMenuItems = menuSections.flatMap((s) => s.items);
const ROOT = ADMIN_ROOT;

/** A menu item shows when the role may open the page behind it. */
const showItem = (role: string | undefined, item: MenuItem) => canOpen(role, item.href);

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
                <Link href={homeFor(role)} className="flex items-center gap-2.5">
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
                {menuSections.map((section) => ({ section, items: section.items.filter((i) => showItem(role, i)) }))
                    .filter(({ items }) => items.length > 0)
                    .map(({ section, items }) => (
                    <div key={section.label || 'main'} className="mb-1">
                        {section.label && <p className="px-3 pb-1 pt-4 text-xs font-medium text-gray-500">{section.label}</p>}
                        {items.map((item) => {
                            const on = isActive(item);
                            const Icon = item.icon;
                            const cls = 'group flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors';
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`${cls} ${on ? 'bg-gray-200/60 font-medium text-gray-900' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                                >
                                    <Icon size={17} className={on ? 'text-[var(--color-primary)]' : 'text-gray-500 group-hover:text-gray-700'} />
                                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

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

    // A page this role may not open (typed URL, old link) → the role's own start page.
    const allowed = canOpen(role, pathname);
    useEffect(() => {
        if (role && !allowed) router.replace(homeFor(role));
    }, [role, allowed, router]);

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
                        {role && (
                            <span className="hidden rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 md:inline">
                                {ROLE_LABEL[role] || role}
                            </span>
                        )}
                        <span
                            title={`${name}${role ? ` · ${ROLE_LABEL[role] || role}` : ''}`}
                            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700"
                        >
                            {initials}
                        </span>
                    </div>
                </header>

                <main className="px-4 py-6 sm:px-6 lg:px-8">
                    {/* Nothing of a page this role may not open, even for a moment before the redirect. */}
                    {allowed ? children : null}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
