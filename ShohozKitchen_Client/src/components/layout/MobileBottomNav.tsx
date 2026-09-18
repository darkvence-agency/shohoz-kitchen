"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiGrid, FiShoppingCart, FiUser, FiHeart } from 'react-icons/fi';
import { useAppSelector } from '@/redux';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const cartItems = useAppSelector((s) => s.cart.items);
    const { isAuthenticated } = useAppSelector((s) => s.auth);

    const items = [
        { href: '/',          icon: FiHome,         label: 'Home' },
        { href: '/products',  icon: FiGrid,          label: 'Shop' },
        { href: '/cart',      icon: FiShoppingCart,  label: 'Cart',    badge: cartItems.length },
        { href: '/wishlist',  icon: FiHeart,         label: 'Wishlist' },
        {
            href: isAuthenticated ? '/dashboard/user' : '/login',
            icon: FiUser,
            label: isAuthenticated ? 'Account' : 'Sign In',
        },
    ];

    return (
        <nav
            className="fixed bottom-0 inset-x-0 z-50 sm:hidden bg-white border-t border-gray-100"
            style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.07)' }}
        >
            <div className="flex items-center h-[58px]">
                {items.map((item) => {
                    const active = pathname === item.href || (item.href === '/' && pathname === '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 select-none"
                        >
                            <div className="relative">
                                <item.icon
                                    size={21}
                                    strokeWidth={active ? 2.3 : 1.7}
                                    style={{ color: active ? 'var(--color-primary)' : '#9ca3af' }}
                                />
                                {item.badge && item.badge > 0 ? (
                                    <span
                                        className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-white"
                                        style={{ background: 'var(--color-primary)' }}
                                    >
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                ) : null}
                            </div>
                            <span
                                className="text-[10px] font-medium leading-none"
                                style={{ color: active ? 'var(--color-primary)' : '#9ca3af' }}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
