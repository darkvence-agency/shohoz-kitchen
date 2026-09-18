"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import NotificationBell from '@/components/notifications/NotificationBell';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { logout } from '@/redux/slices/authSlice';
import { LogoMark } from '@/components/shared/Logo';
import {
    FiUser, FiMapPin, FiCreditCard, FiSettings,
    FiShoppingBag, FiRefreshCw, FiSlash, FiFileText,
    FiStar, FiMessageCircle, FiHeart, FiShoppingCart,
    FiLogOut, FiMenu, FiX, FiChevronRight, FiHome, FiArrowLeft,
} from 'react-icons/fi';

// ── Daraz-style grouped account menu ──────────────────────────────
// Bold section header (optionally a link), with lighter indented children.
interface MenuLink { label: string; href: string; icon: React.ElementType; badge?: 'wishlist'; external?: boolean; }
interface MenuSection { title: string; href?: string; icon?: React.ElementType; children?: MenuLink[]; standalone?: boolean; }

const SECTIONS: MenuSection[] = [
    {
        title: 'Manage My Account',
        href: '/dashboard/user',
        children: [
            { label: 'My Profile', href: '/dashboard/user/profile', icon: FiUser },
            { label: 'Address Book', href: '/dashboard/user/addresses', icon: FiMapPin },
            { label: 'Payment History', href: '/dashboard/user/payments', icon: FiCreditCard },
        ],
    },
    {
        title: 'My Orders',
        href: '/dashboard/user/orders',
        icon: FiShoppingBag,
        children: [
            { label: 'My Returns', href: '/dashboard/user/returns', icon: FiRefreshCw },
            { label: 'My Cancellations', href: '/dashboard/user/orders?status=cancelled', icon: FiSlash },
            { label: 'My Invoices', href: '/dashboard/user/invoices', icon: FiFileText },
        ],
    },
    { title: 'My Reviews', href: '/dashboard/user/reviews', icon: FiStar, standalone: true },
    { title: 'My Messages', href: '/dashboard/user/messages', icon: FiMessageCircle, standalone: true },
    { title: 'My Wishlist & Followed Stores', href: '/dashboard/user/wishlist', icon: FiHeart, standalone: true },
    { title: 'Sell On Shohoz Kitchen', href: '/become-seller', icon: FiShoppingCart, standalone: true },
    { title: 'Account Settings', href: '/dashboard/user/settings', icon: FiSettings, standalone: true },
];

const UserLayout = ({ children }: { children: React.ReactNode }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const wishlistCount = useAppSelector((state: any) => state.wishlist.totalItems);

    const handleLogout = () => {
        dispatch(logout());
        localStorage.removeItem('token');
        router.push('/');
    };

    // Active state — special-cased so "My Cancellations" (orders?status=cancelled)
    // and the plain "My Orders" tab don't both light up at once.
    const isActive = (href: string) => {
        const [path, qs] = href.split('?');
        const onCancellations = pathname.startsWith('/dashboard/user/orders') && searchParams.get('status') === 'cancelled';
        if (qs) {
            const want = new URLSearchParams(qs).get('status');
            return pathname.startsWith(path) && searchParams.get('status') === want;
        }
        if (path === '/dashboard/user') return pathname === path;
        if (path === '/dashboard/user/orders') return pathname.startsWith(path) && !onCancellations;
        return pathname.startsWith(path);
    };

    const getInitials = () => {
        if (!user?.name) return 'U';
        const parts = user.name.split(' ');
        return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0];
    };

    // Breadcrumb current-page label
    const currentLabel = (() => {
        for (const s of SECTIONS) {
            if (s.standalone && isActive(s.href!)) return s.title;
            for (const c of s.children || []) if (isActive(c.href)) return c.label;
        }
        if (pathname === '/dashboard/user') return 'My Account';
        return 'My Account';
    })();

    // ── One menu row (used for both child links and standalone sections) ──
    const Row = ({ link, child, bold, onNav }: { link: MenuLink | MenuSection; child?: boolean; bold?: boolean; onNav?: () => void }) => {
        const href = (link as any).href as string;
        const label = (link as any).label ?? (link as any).title;
        const Icon = (link as any).icon as React.ElementType;
        const active = isActive(href);
        const badge = (link as any).badge === 'wishlist' || label === 'My Wishlist & Followed Stores';
        return (
            <Link
                href={href}
                onClick={onNav}
                style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: child ? '8px 12px 8px 30px' : '9px 12px',
                    margin: '0 8px',
                    borderRadius: '8px', textDecoration: 'none',
                    fontSize: bold ? '13.5px' : '13px',
                    fontWeight: active ? 700 : bold ? 700 : 500,
                    color: active ? 'var(--color-primary)' : bold ? '#1f2937' : '#5b6470',
                    background: active ? 'var(--color-primary-lightest, var(--color-primary-light))' : 'transparent',
                    transition: 'all 0.14s ease', lineHeight: 1.3,
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F6F7F9'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
                {Icon && <Icon size={bold ? 16 : 15} style={{ flexShrink: 0, color: active ? 'var(--color-primary)' : bold ? '#374151' : '#9aa3af' }} />}
                <span style={{ flex: 1 }}>{label}</span>
                {badge && wishlistCount > 0 && (
                    <span style={{ minWidth: '18px', height: '18px', padding: '0 5px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {wishlistCount}
                    </span>
                )}
            </Link>
        );
    };

    // ── The grouped navigation, shared by desktop sidebar + mobile drawer ──
    const Nav = ({ onNav }: { onNav?: () => void }) => (
        <nav style={{ flex: 1, padding: '10px 0' }}>
            {SECTIONS.map((section, i) => {
                if (section.standalone) {
                    return (
                        <div key={section.title} style={{ marginBottom: '2px' }}>
                            <Row link={section} onNav={onNav} />
                        </div>
                    );
                }
                return (
                    <div key={section.title} style={{ marginBottom: '10px' }}>
                        {/* Section header — clickable (goes to overview / orders) */}
                        {section.href ? (
                            <Row link={section} bold onNav={onNav} />
                        ) : (
                            <p style={{ margin: '0 0 2px', padding: '9px 20px 4px', fontSize: '12px', fontWeight: 800, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                {section.title}
                            </p>
                        )}
                        {/* Children */}
                        <div style={{ marginTop: '2px' }}>
                            {section.children?.map(c => <Row key={c.href} link={c} child onNav={onNav} />)}
                        </div>
                    </div>
                );
            })}
        </nav>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#F1F3F6', display: 'flex' }}>
            {/* ── Fixed Left Sidebar ── */}
            <aside style={{
                width: '248px', flexShrink: 0, background: '#fff',
                borderRight: '1px solid #ECECEC', position: 'fixed',
                top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column',
                zIndex: 100, overflowY: 'auto',
            }} className="user-sidebar">
                {/* Brand */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', padding: '18px 20px 14px', borderBottom: '1px solid #F2F2F2' }}>
                    <LogoMark size={36} />
                    <p style={{ fontSize: '12px', color: '#9aa3af', margin: 0, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>My Account</p>
                </Link>

                {/* Greeting card */}
                <Link href="/dashboard/user" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '14px 20px', borderBottom: '1px solid #F2F2F2' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>
                            {getInitials()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '11px', color: '#9aa3af', margin: '0 0 1px', fontWeight: 600 }}>Hello,</p>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</p>
                        </div>
                    </div>
                </Link>

                <Nav />

                {/* Bottom actions */}
                <div style={{ padding: '10px 0 16px', borderTop: '1px solid #F2F2F2' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', margin: '0 8px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, color: '#5b6470' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F6F7F9'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <FiArrowLeft size={15} style={{ color: '#9aa3af' }} /> Back to Store
                    </Link>
                    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'calc(100% - 16px)', margin: '2px 8px 0', padding: '9px 12px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#5b6470', textAlign: 'left' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#5b6470'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <FiLogOut size={15} /> Logout
                    </button>
                </div>
            </aside>

            {/* ── Mobile Drawer ── */}
            {mobileMenuOpen && (
                <>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 199 }} onClick={() => setMobileMenuOpen(false)} />
                    <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '270px', background: '#fff', zIndex: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 30px rgba(0,0,0,0.12)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '14px' }}>{getInitials()}</div>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#111', margin: 0 }}>{user?.name || 'User'}</p>
                                    <p style={{ fontSize: '11px', color: '#9aa3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>{user?.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '4px' }}><FiX size={20} /></button>
                        </div>
                        <Nav onNav={() => setMobileMenuOpen(false)} />
                        <div style={{ padding: '10px 0 16px', borderTop: '1px solid #F2F2F2' }}>
                            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'calc(100% - 16px)', margin: '0 8px', padding: '10px 12px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                                <FiLogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ── Right Column ── */}
            <div style={{ marginLeft: '248px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} className="user-main">
                {/* Top Header */}
                <header className="user-topbar" style={{ background: '#fff', borderBottom: '1px solid #ECECEC', height: '54px', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '4px', display: 'none' }} className="mobile-hamburger">
                            <FiMenu size={20} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9aa3af' }}>
                            <Link href="/" style={{ color: '#9aa3af', textDecoration: 'none', display: 'flex' }}><FiHome size={13} /></Link>
                            <FiChevronRight size={11} />
                            <Link href="/dashboard/user" style={{ color: '#9aa3af', textDecoration: 'none' }}>My Account</Link>
                            <FiChevronRight size={11} />
                            <span style={{ color: '#111', fontWeight: 700 }}>{currentLabel}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <NotificationBell theme="orange" seeAllHref="/dashboard/user/notifications" />
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '12px' }}>{getInitials()}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }} className="header-userinfo">
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{user?.name || 'User'}</span>
                            <span style={{ fontSize: '10px', color: '#9aa3af' }}>{user?.email}</span>
                        </div>
                    </div>
                </header>

                <main className="user-content" style={{ flex: 1, padding: '24px', background: '#F1F3F6' }}>
                    {children}
                </main>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .user-sidebar { display: none !important; }
                    .user-main { margin-left: 0 !important; }
                    .mobile-hamburger { display: flex !important; }
                    .header-userinfo { display: none !important; }
                    .user-content { padding: 14px !important; }
                    .user-topbar { padding: 0 14px !important; }
                }
            `}</style>
        </div>
    );
};

export default UserLayout;
