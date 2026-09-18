/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    FiShoppingCart, FiChevronDown, FiMenu, FiX,
    FiUser, FiHeart, FiPhone, FiMail, FiLogOut,
    FiGrid, FiBox, FiSmartphone, FiHeadphones, FiMapPin, FiGlobe,
} from 'react-icons/fi';
import { useAppSelector, useAppDispatch } from '@/redux';
import { useGetCategoriesQuery } from '@/redux/api/categoryApi';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import { logout } from '@/redux/slices/authSlice';
import Logo from '@/components/shared/Logo';
import SearchAutocomplete from '@/components/shared/SearchAutocomplete';
import { useWishlist } from '@/hooks/useWishlist';

interface Category {
    _id: string;
    name: string;
    slug: string;
    icon?: string;
    image?: string;
}

const isCatImg = (c: Category) => Boolean(c.image || (c.icon && (c.icon.startsWith('http') || c.icon.startsWith('/'))));
const getCatImg = (c: Category) => c.image || c.icon || '';

const FALLBACK_CATEGORIES: Category[] = [
    { _id: 'f-cookware',      name: 'Cookware',       slug: 'cookware',       icon: '🍳', image: '/categories/cookware.png' },
    { _id: 'f-dinnerware',    name: 'Dinnerware',     slug: 'dinnerware',     icon: '🍽️', image: '/categories/dinnerware.png' },
    { _id: 'f-kitchen-tools', name: 'Kitchen Tools',  slug: 'kitchen-tools',  icon: '🔪', image: '/categories/kitchen-tools.png' },
    { _id: 'f-food-storage',  name: 'Food Storage',   slug: 'food-storage',   icon: '🫙', image: '/categories/food-storage.png' },
    { _id: 'f-appliances',    name: 'Appliances',     slug: 'appliances',     icon: '⚡', image: '/categories/appliances.png' },
    { _id: 'f-bakeware',      name: 'Bakeware',       slug: 'bakeware',       icon: '🧁', image: '/categories/bakeware.png' },
    { _id: 'f-drinkware',     name: 'Drinkware',      slug: 'drinkware',      icon: '🥤', image: '/categories/drinkware.png' },
    { _id: 'f-cutlery',       name: 'Cutlery',        slug: 'cutlery',        icon: '🍴', image: '/categories/cutlery.png' },
];

const Header: React.FC = () => {

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isSearchCatOpen, setIsSearchCatOpen] = useState(false);
    const [selectedSearchCat, setSelectedSearchCat] = useState<Category | null>(null);
    const [isCatMenuOpen, setIsCatMenuOpen] = useState(false);
    const [isServicesOpen, setIsServicesOpen] = useState(false);

    const profileRef = useRef<HTMLDivElement>(null);
    const searchCatRef = useRef<HTMLDivElement>(null);
    const mobileSearchCatRef = useRef<HTMLDivElement>(null);
    const catMenuRef = useRef<HTMLDivElement>(null);
    const servicesRef = useRef<HTMLDivElement>(null);

    const cartItems = useAppSelector((state) => state.cart.items);
    const { count: wishlistCount } = useWishlist();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const router = useRouter();

    // Storefront wishlist page handles both logged-in (server) and guest (local) wishlists.
    const wishlistHref = '/wishlist';

    const { data: categoriesData } = useGetCategoriesQuery({});
    const categories: Category[] = categoriesData?.data?.length > 0 ? categoriesData.data : FALLBACK_CATEGORIES;
    const { data: siteContentRes } = useGetSiteContentQuery(undefined);
    const contact = siteContentRes?.data?.contact || {};
    const contactPhone: string = contact.phone || '+8801611829111';
    const contactEmail: string = contact.email || 'info@shohozkitchen.com';
    const contactAddress: string = contact.address || 'Dhaka, Bangladesh';


    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
            const inDesktop = searchCatRef.current && searchCatRef.current.contains(e.target as Node);
            const inMobile = mobileSearchCatRef.current && mobileSearchCatRef.current.contains(e.target as Node);
            if (!inDesktop && !inMobile) setIsSearchCatOpen(false);
            if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) setIsCatMenuOpen(false);
            if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setIsServicesOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        localStorage.removeItem('token');
        setIsProfileOpen(false);
        router.push('/');
    };

    const handleGoHome = () => {
        setSearchQuery('');
    };

    const handleSearch = (rawTerm?: string) => {
        const trimmed = (rawTerm ?? searchQuery).trim();
        if (!trimmed && !selectedSearchCat) return;
        const params = new URLSearchParams();
        if (trimmed) params.set('q', trimmed);
        if (selectedSearchCat) params.set('category', selectedSearchCat._id);
        router.push(`/products?${params.toString()}`);
    };

    const actionCls = "flex flex-col items-center gap-0.5 px-2.5 py-2 text-gray-600 hover:text-[var(--color-primary)] transition-colors rounded-md hover:bg-[var(--color-primary-lightest)] cursor-pointer select-none";

    const renderCategorySelector = (isMobile: boolean) => (
        <div className="relative shrink-0" ref={isMobile ? mobileSearchCatRef : searchCatRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsSearchCatOpen((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 ${
                    isMobile ? 'ml-1 px-2 h-[32px] text-xs' : 'ml-1 px-2.5 h-[36px] text-[13px]'
                } font-semibold whitespace-nowrap transition-colors rounded cursor-pointer select-none`}
                style={{
                    background: 'var(--color-soft)',
                    border: '1px solid var(--color-soft-border)',
                    color: 'var(--color-text-primary)',
                }}
                title="Select category to filter"
            >
                <FiGlobe size={13} strokeWidth={2} style={{ color: 'var(--color-primary)' }} className="shrink-0" />
                <span className={isMobile ? 'max-w-[62px] truncate' : 'max-w-[90px] truncate'}>
                    {selectedSearchCat ? selectedSearchCat.name : 'All'}
                </span>
                <FiChevronDown
                    size={12}
                    strokeWidth={2.5}
                    className={`transition-transform duration-200 shrink-0 text-gray-500 ${isSearchCatOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isSearchCatOpen && (
                <div
                    className={`absolute top-full left-0 mt-2 ${
                        isMobile ? 'w-60 max-w-[85vw]' : 'w-64'
                    } bg-white rounded-2xl shadow-2xl shadow-gray-900/20 border border-gray-100 z-[100] max-h-80 overflow-y-auto p-1.5 animate-fadeIn`}
                    style={{
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)',
                    }}
                >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-1">
                        Filter by Category
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedSearchCat(null);
                            setIsSearchCatOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            !selectedSearchCat
                                ? 'bg-[var(--color-primary-lightest)] text-[var(--color-primary)] font-bold'
                                : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <span>🛒</span> All Categories
                        </span>
                        {!selectedSearchCat && <span className="text-xs font-bold text-[var(--color-primary)]">✓</span>}
                    </button>
                    {categories.map((cat) => {
                        const isSelected = selectedSearchCat?._id === cat._id;
                        return (
                            <button
                                key={cat._id}
                                type="button"
                                onClick={() => {
                                    setSelectedSearchCat(cat);
                                    setIsSearchCatOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-[var(--color-primary-lightest)] text-[var(--color-primary)] font-bold'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="flex items-center gap-2 truncate pr-2">
                                    {/* {isCatImg(cat) ? (
                                        <img
                                            src={getCatImg(cat)}
                                            alt=""
                                            className="w-4 h-4 object-contain rounded-xs shrink-0"
                                        />
                                    ) : (
                                        cat.icon && (
                                            <span className="text-xs leading-none shrink-0">
                                                {cat.icon}
                                            </span>
                                        )
                                    )} */}
                                    <span className="truncate">{cat.name}</span>
                                </span>
                                {isSelected && <span className="text-xs font-bold text-[var(--color-primary)] shrink-0">✓</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return (
        <>
            <header
                className="sticky top-0 z-50 bg-white"
                style={{
                    transition: 'box-shadow 0.25s ease',
                    boxShadow: scrolled
                        ? '0 4px 28px -6px rgba(0,0,0,0.14)'
                        : '0 1px 0 rgba(0,0,0,0.07)',
                }}
            >

                {/* ════════════════ TOP BAR ════════════════ */}
                <div
                    className="hidden md:block border-b"
                    style={{ background: 'var(--color-topbar)', borderColor: 'var(--color-soft-border)' }}
                >
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-between h-9 text-[12px]" style={{ color: 'var(--color-text-primary)' }}>

                            {/* Left: app + support */}
                            <div className="flex items-center gap-5">
                                <a href={`tel:${contactPhone}`} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                                    <FiSmartphone size={13} strokeWidth={2} />
                                    <span>Shohoz Kitchen App</span>
                                </a>
                                <Link href="/contact" className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                                    <FiHeadphones size={13} strokeWidth={2} />
                                    <span>Support</span>
                                </Link>
                            </div>

                            {/* Right: wishlist · ship to · locale */}
                            <div className="flex items-center gap-5">
                                <Link href={wishlistHref} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                                    <FiHeart size={13} strokeWidth={2} />
                                    <span>Wishlist</span>
                                </Link>
                                <Link href="/track" className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                                    <FiMapPin size={13} strokeWidth={2} />
                                    <span>Ship to</span>
                                </Link>
                                <span className="flex items-center gap-1.5 select-none">
                                    <span
                                        className="inline-block w-[13px] h-[13px] rounded-full shrink-0"
                                        style={{ background: 'var(--color-primary)' }}
                                        aria-hidden
                                    />
                                    <span>EN/BDT</span>
                                    <FiChevronDown size={12} strokeWidth={2.5} className="text-gray-500" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ════════════════ MAIN HEADER ════════════════ */}
                <div className="bg-white border-b border-gray-100">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center gap-3 lg:gap-4 h-[68px]">

                            {/* Logo — always leftmost */}
                            <Link href="/" className="shrink-0" onClick={handleGoHome}>
                                <HeaderLogo />
                            </Link>

                            {/* Categories — a top-level dropdown, left of the search field */}
                            <div className="relative shrink-0 hidden lg:block" ref={catMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsCatMenuOpen((p) => !p)}
                                    className="flex items-center gap-1.5 px-1 h-[40px] text-[14px] font-semibold whitespace-nowrap hover:opacity-70 transition-opacity cursor-pointer select-none"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    <span>Categories</span>
                                    <FiChevronDown
                                        size={14}
                                        strokeWidth={2.5}
                                        className={`transition-transform duration-200 text-gray-500 ${isCatMenuOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {isCatMenuOpen && (
                                    <div
                                        className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg border z-[100] max-h-96 overflow-y-auto p-1.5"
                                        style={{ borderColor: 'var(--color-soft-border)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.18)' }}
                                    >
                                        <Link
                                            href="/products"
                                            onClick={() => setIsCatMenuOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-semibold hover:bg-[var(--color-primary-lightest)] transition-colors"
                                            style={{ color: 'var(--color-primary)' }}
                                        >
                                            <FiGrid size={15} /> All Products
                                        </Link>
                                        <div className="my-1 border-t" style={{ borderColor: 'var(--color-soft-border)' }} />
                                        {categories.map((cat) => (
                                            <Link
                                                key={cat._id}
                                                href={`/products?category=${cat._id}`}
                                                onClick={() => setIsCatMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-3 py-2 rounded text-[13px] text-gray-700 hover:bg-[var(--color-primary-lightest)] hover:text-[var(--color-primary)] transition-colors"
                                            >
                                                {isCatImg(cat) ? (
                                                    <img src={getCatImg(cat)} alt="" className="w-5 h-5 object-contain rounded shrink-0" />
                                                ) : (
                                                    cat.icon && <span className="text-base shrink-0">{cat.icon}</span>
                                                )}
                                                <span className="truncate">{cat.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Search Bar (Desktop) */}
                            <div className="flex-1 hidden md:flex">
                                <SearchAutocomplete
                                    variant="desktop"
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    onSubmit={(term) => handleSearch(term)}
                                    leading={renderCategorySelector(false)}
                                />
                            </div>

                            {/* Right Action Icons */}
                            <div className="flex items-center shrink-0 gap-1 ml-auto">

                                {/* Services — dropdown */}
                                <div className="relative hidden xl:block" ref={servicesRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsServicesOpen((p) => !p)}
                                        className="flex items-center gap-1.5 px-2.5 h-[40px] text-[14px] font-semibold whitespace-nowrap hover:opacity-70 transition-opacity cursor-pointer select-none"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        <span>Services</span>
                                        <FiChevronDown
                                            size={14}
                                            strokeWidth={2.5}
                                            className={`transition-transform duration-200 text-gray-500 ${isServicesOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {isServicesOpen && (
                                        <div
                                            className="absolute top-full right-0 mt-2 w-52 bg-white rounded-lg border z-[100] p-1.5"
                                            style={{ borderColor: 'var(--color-soft-border)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.18)' }}
                                        >
                                            {[
                                                { href: '/track', label: 'Track Order', icon: <FiBox size={15} /> },
                                                { href: '/contact', label: 'Help & Support', icon: <FiHeadphones size={15} /> },
                                                { href: '/refund', label: 'Returns & Refunds', icon: <FiMapPin size={15} /> },
                                            ].map((s) => (
                                                <Link
                                                    key={s.href}
                                                    href={s.href}
                                                    onClick={() => setIsServicesOpen(false)}
                                                    className="flex items-center gap-2.5 px-3 py-2 rounded text-[13px] text-gray-700 hover:bg-[var(--color-primary-lightest)] hover:text-[var(--color-primary)] transition-colors"
                                                >
                                                    {s.icon} {s.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href="/cart"
                                    className="hidden sm:flex items-center justify-center w-[42px] h-[40px] rounded transition-colors hover:bg-[var(--color-primary-lightest)] cursor-pointer select-none"
                                    style={{ color: 'var(--color-text-primary)' }}
                                    aria-label="Cart"
                                >
                                    <div className="relative">
                                        <FiShoppingCart size={22} strokeWidth={1.8} />
                                        <span
                                            className="absolute -top-2 -right-2.5 text-white text-[9px] min-w-[17px] h-[17px] px-0.5 rounded-full flex items-center justify-center font-bold ring-2 ring-white"
                                            style={{ background: 'var(--color-sale)' }}
                                        >
                                            {cartItems.length > 99 ? '99+' : cartItems.length}
                                        </span>
                                    </div>
                                </Link>

                                {isAuthenticated && user ? (
                                    <div className="relative hidden sm:block" ref={profileRef}>
                                        <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={actionCls}>
                                            {user.avatar
                                                ? <img src={user.avatar} alt="" className="w-[22px] h-[22px] rounded-full object-cover ring-1 ring-gray-200" />
                                                : <FiUser size={22} strokeWidth={1.7} />
                                            }
                                            <span className="text-[10px] font-medium max-w-[72px] truncate">
                                                {user.name?.split(' ')[0] || 'Account'}
                                            </span>
                                        </button>

                                        {isProfileOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-md shadow-2xl shadow-gray-900/12 border border-gray-100 overflow-hidden z-50">
                                                <div className="px-4 py-3.5 border-b border-gray-100" style={{ background: 'var(--color-primary-lightest)' }}>
                                                    <p className="text-sm font-bold text-gray-800 truncate">{user.name || 'User'}</p>
                                                    <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                                                </div>
                                                <div className="py-1.5">
                                                    {[
                                                        {
                                                            href: (user.role === 'admin' || user.role === 'superadmin') ? '/dashboard/admin' : '/dashboard/user',
                                                            icon: <FiGrid size={15} />, label: 'Dashboard',
                                                        },
                                                        ...((user.role === 'admin' || user.role === 'superadmin') ? [] : [
                                                            { href: '/dashboard/user/orders', icon: <FiBox size={15} />, label: 'My Orders' }
                                                        ]),
                                                        { href: wishlistHref, icon: <FiHeart size={15} />, label: 'Wishlist' },
                                                    ].map(item => (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            onClick={() => setIsProfileOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[var(--color-primary-lightest)] hover:text-[var(--color-primary)] transition-colors"
                                                        >
                                                            {item.icon} {item.label}
                                                        </Link>
                                                    ))}
                                                </div>
                                                <div className="border-t border-gray-100 py-1.5">
                                                    <button
                                                        onClick={handleLogout}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <FiLogOut size={15} /> Logout
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        href="/login"
                                        className="hidden sm:flex items-center gap-2 px-2.5 h-[40px] text-[14px] font-medium whitespace-nowrap hover:opacity-70 transition-opacity"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        <FiUser size={20} strokeWidth={1.8} />
                                        <span>Sign In/ Register</span>
                                    </Link>
                                )}

                                {/* Hamburger — mobile only, rightmost */}
                                <button
                                    className="lg:hidden p-2 text-gray-700 hover:text-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary-lightest)] transition-colors flex-shrink-0"
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    aria-label="Menu"
                                >
                                    {isMobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
                                </button>
                            </div>
                        </div>

                        {/* Mobile Search */}
                        <div className="md:hidden pb-3">
                            <SearchAutocomplete
                                variant="mobile"
                                value={searchQuery}
                                onChange={setSearchQuery}
                                onSubmit={(term) => handleSearch(term)}
                                placeholder="Search products…"
                                leading={
                                    <>
                                        {renderCategorySelector(true)}
                                        {/* Separator */}
                                        <div className="shrink-0 h-5 w-px bg-gray-200 mr-0.5" />
                                    </>
                                }
                            />
                        </div>

                        {/* Mobile Menu */}
                        {isMobileMenuOpen && (
                            <div className="lg:hidden border-t border-gray-100 py-3">
                                <div className="space-y-0.5">
                                    <button
                                        onClick={() => setIsMobileCategoryOpen(!isMobileCategoryOpen)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 text-gray-800 font-semibold text-sm rounded-md hover:bg-gray-50"
                                    >
                                        <span>Categories</span>
                                        <FiChevronDown size={14} className={`transition-transform ${isMobileCategoryOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isMobileCategoryOpen && (
                                        <div className="pl-3 space-y-0.5">
                                            <Link href="/products" className="block px-3 py-2 text-gray-600 text-sm rounded-md hover:bg-[var(--color-primary-lightest)] hover:text-[var(--color-primary)] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                                                🛒 All Products
                                            </Link>
                                            {categories.map(cat => (
                                                <Link
                                                    key={cat._id}
                                                    href={`/products?category=${cat._id}`}
                                                    className="flex items-center gap-2 px-3 py-2 text-gray-600 text-sm rounded-md hover:bg-[var(--color-primary-lightest)] hover:text-[var(--color-primary)] transition-colors"
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    {isCatImg(cat) ? (
                                                        <img src={getCatImg(cat)} alt="" className="w-4 h-4 object-contain rounded-xs shrink-0" />
                                                    ) : (
                                                        cat.icon && <span className="text-sm shrink-0">{cat.icon}</span>
                                                    )}
                                                    {cat.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                    {[
                                        { href: '/track', label: '📦 Track Order' },
                                        { href: '/contact', label: '💬 Help & Support' },
                                        { href: wishlistHref, label: '♥ Wishlist' },
                                    ].map(item => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className="block px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] rounded-md transition-colors"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>



            </header>
        </>
    );
};

function HeaderLogo() {
    return (
        <div className="group select-none transition-transform duration-300 group-hover:scale-105" aria-label="Shohoz Kitchen">
            <Logo size={42} />
        </div>
    );
}

export default Header;
