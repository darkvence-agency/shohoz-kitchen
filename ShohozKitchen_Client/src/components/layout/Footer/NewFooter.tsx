/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/redux';
import { logout } from '@/redux/slices/authSlice';
import Logo from '@/components/shared/Logo';
import { FiMapPin, FiMail, FiPhone, FiGlobe } from 'react-icons/fi';
import { FaFacebookF, FaLinkedinIn, FaYoutube, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { toast } from 'react-hot-toast';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import type { IconType } from 'react-icons';

/* ─── Map a social label to its icon (case-insensitive) ─── */
const SOCIAL_ICONS: { match: string; icon: IconType }[] = [
    { match: 'facebook', icon: FaFacebookF },
    { match: 'instagram', icon: FaInstagram },
    { match: 'youtube', icon: FaYoutube },
    { match: 'linkedin', icon: FaLinkedinIn },
    { match: 'twitter', icon: FaXTwitter },
    { match: 'tiktok', icon: FaTiktok },
    { match: 'whatsapp', icon: FaWhatsapp },
];

const getSocialIcon = (label: string): IconType => {
    const found = SOCIAL_ICONS.find((s) => label.toLowerCase().includes(s.match));
    return found?.icon || FaFacebookF;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const NewFooter: React.FC = () => {
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { data: siteRes } = useGetSiteContentQuery({});

    // ── Newsletter subscribe ──
    const [email, setEmail] = React.useState('');
    const [subscribing, setSubscribing] = React.useState(false);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        if (!value) {
            toast.error('Please enter your email');
            return;
        }
        setSubscribing(true);
        try {
            const res = await fetch(`${API_BASE}/newsletter/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: value }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.message || 'Subscription failed');
            }
            toast.success(json?.message || 'Subscribed! Thanks for joining our newsletter.');
            setEmail('');
        } catch (err: any) {
            toast.error(err?.message || 'Subscription failed. Please try again.');
        } finally {
            setSubscribing(false);
        }
    };

    // Social links from DB (admin → site-content). Only show ones with a real URL.
    const socials: { label: string; url: string }[] = (siteRes?.data?.contact?.socials || [])
        .filter((s: any) => s?.url && s.url !== '#');

    // Contact info from DB with sensible Shohoz Kitchen defaults
    const contact = siteRes?.data?.contact || {};
    const phoneList: string[] = (Array.isArray(contact.phones) && contact.phones.length > 0)
        ? contact.phones
        : (contact.phone ? [contact.phone] : ['01611829111', '01955668133', '01624033566']);
    const emailList: string[] = (Array.isArray(contact.emails) && contact.emails.length > 0)
        ? contact.emails
        : (contact.email ? [contact.email] : ['info@shohozkitchen.com']);
    const website: string = contact.website || 'shohozkitchen.com';
    const corporateOffice: string = contact.corporateOffice || contact.address || '13/7, Gulistan Shopping Complex, Shaheed Abrar Fahad Avenue, Dhaka-1000';
    const warehouse: string = contact.warehouse || 'Badsha Electronics Ltd, Vimbazar, Bhawa Mirzapur, Gazipur Sadar, Gazipur-1703';

    // WhatsApp link for "Live Chat" — normalized to wa.me format (88 + local digits)
    const waDigits = (siteRes?.data?.contact?.whatsapp || siteRes?.data?.floating?.whatsapp || '8801611829111').replace(/\D/g, '');
    const waNumber = waDigits.startsWith('880') ? waDigits : waDigits.startsWith('0') ? '88' + waDigits : '880' + waDigits;
    const whatsappLink = `https://wa.me/${waNumber}`;

    const handleLogout = () => {
        dispatch(logout());
        localStorage.removeItem('token');
        toast.success('Logged out successfully');
        router.push('/');
    };

    return (
        <footer className="bg-white border-t border-gray-200">
            {/* ── Main Footer (single section) ── */}
            <div className="container mx-auto px-4 py-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

                    {/* Brand + Address + Social */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <Link href="/" className="inline-flex items-center mb-5 group select-none" aria-label="Shohoz Kitchen">
                            <Logo size={66} />
                        </Link>
                        <div className="space-y-2.5">
                            <div className="flex items-start gap-2.5">
                                <FiMapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-gray-500"><span className="font-semibold text-gray-600">Corporate Office:</span> {corporateOffice}</p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <FiMapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-gray-500"><span className="font-semibold text-gray-600">Warehouse:</span> {warehouse}</p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <FiGlobe size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                <a href={`https://${website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">{website}</a>
                            </div>
                            {emailList.map((em) => (
                                <div key={em} className="flex items-center gap-2.5">
                                    <FiMail size={14} className="text-gray-400 shrink-0" />
                                    <a href={`mailto:${em}`} className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors break-all">{em}</a>
                                </div>
                            ))}
                        </div>
                        {/* Social Icons — dynamic from admin / site-content */}
                        {socials.length > 0 && (
                            <div className="flex items-center gap-3 mt-4">
                                {socials.map((s) => {
                                    const Icon = getSocialIcon(s.label);
                                    return (
                                        <a
                                            key={s.label}
                                            href={s.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={s.label}
                                            className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white hover:bg-[var(--color-primary)] transition-colors"
                                        >
                                            <Icon size={14} />
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Menu 1 - Quick Links */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Quick Links</h4>
                        <ul className="space-y-2.5">
                            <li><Link href="/" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">Home</Link></li>
                            <li><Link href="/products" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">All Products</Link></li>
                            <li><Link href="/track" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">Track Order</Link></li>
                            <li><Link href="/services" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">Our Services</Link></li>
                            <li><Link href="/contact" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">Contact Us</Link></li>
                        </ul>
                    </div>

                    {/* Menu 2 - Support */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Support</h4>
                        <ul className="space-y-2.5">
                            {phoneList.map((p, i) => {
                                const digits = p.replace(/\D/g, '');
                                const tel = digits.startsWith('880') ? `+${digits}` : digits.startsWith('0') ? `+880${digits.slice(1)}` : `+880${digits}`;
                                return (
                                    <li key={p}>
                                        <a href={`tel:${tel}`} className={`flex items-center gap-2 text-sm ${i === 0 ? 'font-semibold text-[var(--color-primary)] hover:underline' : 'text-gray-500 hover:text-[var(--color-primary)] transition-colors'}`}>
                                            <FiPhone size={14} /> {p}
                                        </a>
                                    </li>
                                );
                            })}
                            <li><a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">Live Chat (WhatsApp)</a></li>
                            {isAuthenticated ? (
                                <li><Link href={user?.role === 'admin' ? '/dashboard/admin' : '/dashboard/user'} className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">My Account</Link></li>
                            ) : (
                                <li><Link href="/login" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">Sign In / Register</Link></li>
                            )}
                        </ul>
                    </div>

                    {/* Payment Methods */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">We Accept</h4>
                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-white border border-gray-200 rounded-md px-2 py-2 flex items-center justify-center h-9">
                                <span className="text-xs font-bold tracking-tight" style={{ color: '#1A1F71' }}>VISA</span>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-md px-2 py-2 flex items-center justify-center h-9">
                                <div className="flex items-center gap-0.5">
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B] opacity-80" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] opacity-80 -ml-2" />
                                </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-md px-2 py-2 flex items-center justify-center h-9">
                                <span className="text-[10px] font-bold" style={{ color: '#D12053' }}>bKash</span>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-md px-2 py-2 flex items-center justify-center h-9">
                                <span className="text-[10px] font-bold" style={{ color: '#F6921E' }}>Nagad</span>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-md px-2 py-2 flex items-center justify-center h-9">
                                <span className="text-[10px] font-bold" style={{ color: '#8B2F8B' }}>Rocket</span>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-md px-2 py-2 flex items-center justify-center h-9">
                                <span className="text-[9px] font-bold" style={{ color: '#00529B' }}>DBBL</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Newsletter ── */}
            <div className="border-t border-gray-200">
                <div className="container mx-auto px-4 py-7">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Subscribe to our newsletter</h4>
                            <p className="mt-1 text-sm text-gray-500">Get the latest deals, offers and product updates straight to your inbox.</p>
                        </div>
                        <form onSubmit={handleSubscribe} className="flex w-full max-w-md items-stretch gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                aria-label="Email address"
                                disabled={subscribing}
                                className="flex-1 min-w-0 rounded-md border border-gray-300 px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60"
                            />
                            <button
                                type="submit"
                                disabled={subscribing}
                                className="shrink-0 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{ background: 'var(--color-primary)' }}
                            >
                                {subscribing ? 'Subscribing…' : 'Subscribe'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* ── Bottom Footer ── */}
            <div className="border-t border-gray-200">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-2">
                        <p className="text-xs text-gray-400">
                            {siteRes?.data?.footer?.copyright || `© 2019-${new Date().getFullYear()} ${siteRes?.data?.footer?.companyName || 'Shohoz Kitchen'}. All Rights Reserved.`}
                        </p>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">
                                Developed by{' '}
                                <a
                                    href="https://www.extrainweb.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-gray-500 hover:text-[var(--color-primary)] transition-colors"
                                >
                                    Extrain Web
                                </a>
                            </span>
                            <a
                                href="https://www.facebook.com/extrainweb"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Extrain Web on Facebook"
                                className="text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                            >
                                <FaFacebookF size={14} />
                            </a>
                            <a
                                href="https://www.extrainweb.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Extrain Web website"
                                className="text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                            >
                                <FiGlobe size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default NewFooter;
