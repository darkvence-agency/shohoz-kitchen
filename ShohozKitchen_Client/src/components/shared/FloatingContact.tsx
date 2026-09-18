/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { FaWhatsapp, FaRobot, FaFacebookMessenger } from 'react-icons/fa';
import { FiX, FiSend, FiMessageCircle, FiPhone } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import { useAppSelector } from '@/redux';

const PRIMARY = 'var(--color-primary)';

type Action = { label: string; href?: string; topic?: Topic };
type Msg = { from: 'bot' | 'user'; text: string; actions?: Action[] };
type Topic = 'order' | 'delivery' | 'payment' | 'track' | 'contact' | 'hi';

const QUICK: Action[] = [
    { label: '🛒 How to order', topic: 'order' },
    { label: '🚚 Delivery', topic: 'delivery' },
    { label: '💳 Payment', topic: 'payment' },
    { label: '📦 Track order', topic: 'track' },
    { label: '📞 Contact', topic: 'contact' },
];

const FloatingContact: React.FC = () => {
    const { data: res } = useGetSiteContentQuery({});
    const router = useRouter();
    const { isAuthenticated } = useAppSelector((s) => s.auth);

    const f = res?.data?.floating;
    const contact = res?.data?.contact || {};
    const payment = res?.data?.payment || {};

    const showWhatsapp = f?.showWhatsapp !== false; // default true
    const digits = (f?.whatsapp || contact.whatsapp || '8801611829111').replace(/\D/g, '');
    const whatsappNumber = digits.startsWith('880') ? digits : digits.startsWith('0') ? '88' + digits : digits ? '880' + digits : '';
    const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';

    const showPhone = f?.showPhone === true;
    const phone = f?.phone || contact.phone || '+8801611829111';

    const showMessenger = f?.showMessenger === true && !!f?.messenger;
    const messengerLink = f?.messenger ? `https://m.me/${f.messenger}` : '';
    const email = contact.email || 'info@shohozkitchen.com';
    const address = contact.address || 'Dhaka, Bangladesh';

    // ── Chat state ──────────────────────────────────────────────
    const [open, setOpen] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [typing, setTyping] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Msg[]>([
        {
            from: 'bot',
            text: "Hi! 👋 I'm ShohozBot, your shopping assistant. How can I help you today?",
            actions: QUICK,
        },
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hintShownRef = useRef(false);

    // Auto-scroll to newest message
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, typing, open]);

    // One-time gentle hint bubble after a few seconds
    useEffect(() => {
        if (hintShownRef.current) return;
        const t = setTimeout(() => {
            if (!open) { setShowHint(true); hintShownRef.current = true; setTimeout(() => setShowHint(false), 6000); }
        }, 4000);
        return () => clearTimeout(t);
    }, [open]);

    // Lock body scroll when open on mobile
    useEffect(() => {
        const mobile = typeof window !== 'undefined' && window.innerWidth < 640;
        if (open && mobile) { document.body.style.overflow = 'hidden'; }
        else { document.body.style.overflow = ''; }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const labelFor = (k: string) => (k === 'bkash' ? 'bKash' : k === 'nagad' ? 'Nagad' : k === 'rocket' ? 'Rocket' : k);

    const buildAnswer = (topic: Topic): Msg => {
        switch (topic) {
            case 'order':
                return {
                    from: 'bot',
                    text: "Ordering is easy:\n1️⃣ Browse products & open one you like\n2️⃣ Pick color/size, then tap “Add to Cart” or “Buy Now”\n3️⃣ Go to Cart → Checkout\n4️⃣ Fill your address & choose a payment method\n5️⃣ Confirm — done! 🎉",
                    actions: [{ label: 'Browse products', href: '/products' }, { label: 'View cart', href: '/cart' }],
                };
            case 'delivery':
                return {
                    from: 'bot',
                    text: "🚚 We deliver across Bangladesh.\n• Inside Dhaka: usually 1–3 days\n• Outside Dhaka: usually 3–5 days\n• Cash on Delivery is available\nYou’ll get a tracking update once your order ships.",
                    actions: [{ label: 'Track my order', topic: 'track' }],
                };
            case 'payment': {
                const lines = ['bkash', 'rocket', 'nagad']
                    .filter((k) => payment?.[k]?.active !== false && payment?.[k]?.number)
                    .map((k) => `• ${labelFor(k)}: ${payment[k].number} (${payment[k].accountType || 'Personal'})`);
                const body = lines.length
                    ? `We accept:\n${lines.join('\n')}\n• Cash on Delivery (COD)\n\nSend money to the number, then enter the Transaction ID at checkout.`
                    : "We accept bKash, Nagad, Rocket and Cash on Delivery (COD). The active numbers are shown on the checkout page.";
                return { from: 'bot', text: `💳 ${body}`, actions: [{ label: 'Go to checkout', href: '/cart' }] };
            }
            case 'track':
                return {
                    from: 'bot',
                    text: isAuthenticated
                        ? "📦 You can see live status of every order in your dashboard."
                        : "📦 Please log in to track your orders — then you’ll see live status for each one.",
                    actions: [{ label: isAuthenticated ? 'Open My Orders' : 'Login to track', href: isAuthenticated ? '/dashboard/user/orders' : '/login?redirect=/dashboard/user/orders' }],
                };
            case 'contact':
                return {
                    from: 'bot',
                    text: `📞 We’re here to help:\n• Phone: ${phone}\n• Email: ${email}\n• Address: ${address}`,
                    actions: [
                        ...(whatsappLink ? [{ label: 'Chat on WhatsApp', href: whatsappLink }] : []),
                        { label: 'Contact page', href: '/contact' },
                    ],
                };
            default:
                return { from: 'bot', text: "I’m here to help! Pick a topic below 👇", actions: QUICK };
        }
    };

    const matchTopic = (text: string): Topic => {
        const t = text.toLowerCase();
        if (/(order|buy|purchase|kinbo|kenbo|kivabe)/.test(t)) return 'order';
        if (/(deliver|shipping|ship|koto din|how long|time|courier)/.test(t)) return 'delivery';
        if (/(pay|payment|bkash|nagad|rocket|cod|cash|taka|price)/.test(t)) return 'payment';
        if (/(track|status|where|kothay|my order)/.test(t)) return 'track';
        if (/(contact|phone|email|call|number|help|support|address)/.test(t)) return 'contact';
        if (/(hi|hello|hey|salam|assalamu)/.test(t)) return 'hi';
        return 'order'; // safe default → still helpful
    };

    const pushBot = (msg: Msg) => {
        setTyping(true);
        setTimeout(() => {
            setTyping(false);
            setMessages((m) => [...m, msg]);
        }, 550);
    };

    const handleTopic = (topic: Topic, label?: string) => {
        setMessages((m) => [...m, { from: 'user', text: label || topic }]);
        if (topic === 'hi') {
            pushBot({ from: 'bot', text: "Hello! 😊 What can I help you with?", actions: QUICK });
        } else {
            pushBot(buildAnswer(topic));
        }
    };

    // Guaranteed local answer if the AI is unavailable (keeps the bot useful).
    const ruleFallback = (text: string): Msg => {
        const topic = matchTopic(text);
        return topic === 'hi'
            ? { from: 'bot', text: "Hello! 😊 What can I help you with?", actions: QUICK }
            : buildAnswer(topic);
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        // Snapshot recent turns for AI context BEFORE adding this message.
        const history = messages.slice(-8).map((m) => ({ from: m.from, text: m.text }));
        setMessages((m) => [...m, { from: 'user', text }]);
        setTyping(true);

        try {
            const base = process.env.NEXT_PUBLIC_API_URL || '';
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 30000);
            const r = await fetch(`${base}/assistant/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history }),
                signal: controller.signal,
            });
            clearTimeout(timer);
            const j = await r.json().catch(() => null);
            const reply: string | null = j?.data?.reply ?? null;
            setTyping(false);
            // Use the AI reply when available; otherwise fall back to built-in answers.
            setMessages((m) => [...m, r.ok && reply ? { from: 'bot', text: reply } : ruleFallback(text)]);
        } catch {
            setTyping(false);
            setMessages((m) => [...m, ruleFallback(text)]);
        }
    };

    const onAction = (a: Action) => {
        if (a.href) {
            if (a.href.startsWith('http')) window.open(a.href, '_blank');
            else router.push(a.href);
            return;
        }
        if (a.topic) handleTopic(a.topic, a.label);
    };

    return (
        <>
            {/* ── Chat Panel ── */}
            {open && (
                <div
                    className="fixed z-[10000] shadow-2xl flex flex-col overflow-hidden bg-white
                               right-3 left-3 bottom-3
                               sm:left-auto sm:right-4 sm:bottom-24
                               sm:w-[370px]"
                    style={{
                        borderRadius: '16px',
                        height: 'min(560px, calc(100dvh - 1.5rem))',
                        maxHeight: 'calc(100dvh - 1.5rem)',
                        border: '1px solid #eee',
                        animation: 'preloaderFadeUp 0.25s ease-out both',
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center gap-3 px-4 py-3 text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, var(--color-secondary) 100%)` }}
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                                <FaRobot size={20} />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight">Shohoz Kitchen Assistant</p>
                            <p className="text-[11px] opacity-90 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" /> Online · typically replies instantly
                            </p>
                        </div>
                        <button onClick={() => setOpen(false)} aria-label="Close chat"
                            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
                            <FiX size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3" style={{ background: '#f7f8fa' }}>
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[82%]">
                                    {m.from === 'bot' && (
                                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold text-gray-400">
                                            <FaRobot size={10} /> ShohozBot
                                        </div>
                                    )}
                                    <div
                                        className="text-[13px] leading-relaxed whitespace-pre-line px-3.5 py-2.5"
                                        style={
                                            m.from === 'user'
                                                ? { background: PRIMARY, color: '#fff', borderRadius: '14px 14px 4px 14px' }
                                                : { background: '#fff', color: '#374151', borderRadius: '14px 14px 14px 4px', border: '1px solid #eef0f2' }
                                        }
                                    >
                                        {m.text}
                                    </div>
                                    {m.actions && m.actions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {m.actions.map((a, j) => (
                                                <button
                                                    key={j}
                                                    onClick={() => onAction(a)}
                                                    className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                                                    style={{ borderColor: 'rgba(var(--color-primary-rgb), 0.35)', color: PRIMARY, background: 'rgba(var(--color-primary-rgb), 0.06)' }}
                                                >
                                                    {a.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {typing && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-[#eef0f2] rounded-[14px] rounded-bl-[4px] px-4 py-3 flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300"
                                            style={{ animation: `preloaderDotPulse 1.1s ease-in-out ${i * 0.18}s infinite` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2.5">
                        <div className="flex items-center gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                                placeholder="Type your message…"
                                className="flex-1 text-[13px] px-3.5 py-2.5 rounded-full bg-gray-100 outline-none focus:bg-white focus:ring-2 transition-all"
                                style={{ ['--tw-ring-color' as any]: 'rgba(var(--color-primary-rgb), 0.3)' }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                aria-label="Send"
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition-transform hover:scale-105 disabled:opacity-40"
                                style={{ background: PRIMARY }}
                            >
                                <FiSend size={16} />
                            </button>
                        </div>
                        <p className="text-[9.5px] text-gray-300 text-center mt-1.5">Powered by Shohoz Kitchen · we usually reply instantly</p>
                    </div>
                </div>
            )}

            {/* ── Floating buttons stack ── */}
            {/* On mobile, sit above the 58px MobileBottomNav so it never covers the Sign In tab; normal position on sm+ */}
            <div className="fixed bottom-[72px] right-4 z-[9999] flex flex-col items-end gap-3 sm:bottom-5">
                {/* Chat assistant button */}
                <div className="group relative flex items-center">
                    {/* Hint / tooltip */}
                    {!open && (
                        <div className={`absolute right-full mr-2 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg transition-all duration-200 pointer-events-none
                            ${showHint ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                            {showHint ? '👋 Need help? Ask me!' : 'Chat with ShohozBot'}
                            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-900" />
                        </div>
                    )}
                    <button
                        onClick={() => { setOpen((o) => !o); setShowHint(false); }}
                        aria-label="Open chat assistant"
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform duration-200 relative"
                        style={{ background: `linear-gradient(135deg, ${PRIMARY}, var(--color-secondary))`, boxShadow: '0 4px 15px rgba(var(--color-primary-rgb), 0.45)' }}
                    >
                        {open ? <FiX size={22} /> : <FiMessageCircle size={23} />}
                        {!open && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white" />}
                    </button>
                </div>

                {/* Phone Call button (if enabled) */}
                {showPhone && phone && (
                    <div className="group relative flex items-center">
                        <div className="absolute right-full mr-2 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 pointer-events-none transition-all duration-200 shadow-lg">
                            Call {phone}
                            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-blue-600" />
                        </div>
                        <a
                            href={`tel:${phone}`}
                            aria-label="Call support"
                            className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-200 text-white shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)' }}
                        >
                            <FiPhone size={20} />
                        </a>
                    </div>
                )}

                {/* Messenger button (if enabled) */}
                {showMessenger && messengerLink && (
                    <div className="group relative flex items-center">
                        <div className="absolute right-full mr-2 bg-[#0084FF] text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 pointer-events-none transition-all duration-200 shadow-lg">
                            Chat on Messenger
                            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-[#0084FF]" />
                        </div>
                        <a
                            href={messengerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Chat on Messenger"
                            className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-200 text-white shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #00B2FF, #006AFF)', boxShadow: '0 4px 15px rgba(0, 132, 255, 0.4)' }}
                        >
                            <FaFacebookMessenger size={22} />
                        </a>
                    </div>
                )}

                {/* WhatsApp button */}
                {showWhatsapp && whatsappLink && (
                    <div className="group relative flex items-center">
                        <div className="absolute right-full mr-2 bg-[#25D366] text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 pointer-events-none transition-all duration-200 shadow-lg">
                            Chat on WhatsApp
                            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-[#25D366]" />
                        </div>
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Chat on WhatsApp"
                            className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-200 text-white shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)' }}
                        >
                            <FaWhatsapp size={24} />
                        </a>
                    </div>
                )}
            </div>
        </>
    );
};

export default FloatingContact;
