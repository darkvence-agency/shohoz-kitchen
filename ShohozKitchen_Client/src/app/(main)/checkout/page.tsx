/* eslint-disable react-hooks/static-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/redux';
import { removeFromCart, increaseQuantity, decreaseQuantity } from '@/redux/slices/cartSlice';
import { useCreateOrderMutation, useGuestCheckoutMutation } from '@/redux/api/orderApi';
import { useInitPaymentMutation } from '@/redux/api/paymentApi';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import { useGetShippingQuoteQuery, useGetShippingSettingsQuery } from '@/redux/api/shippingApi';
import { useGetMyAddressesQuery, useAddAddressMutation } from '@/redux/api/userApi';
import {
    FiChevronLeft, FiInfo, FiCheck, FiCopy, FiLock, FiTag, FiCreditCard, FiTruck,
    FiPlus, FiMinus, FiTrash2
} from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { trackBeginCheckout, trackPurchase } from '@/lib/marketing';

const COUPON_STORAGE_KEY = 'shohozkitchen_applied_coupon';

// ─── Payment methods offered ──────────────────────────────────────────────
// Cash on Delivery always. bKash, Nagad, Rocket and bank transfer only while the super admin
// has them switched on with an account set (Settings → Payment methods); the customer
// pays manually and tells us where from, the transaction ID and the time.
const PAYMENT_META = [
    {
        id: 'cod',
        label: 'ক্যাশ অন ডেলিভারি',
        sub: 'পণ্য হাতে পেয়ে টাকা দিন',
        color: '#16a34a',
        kind: 'cod' as const,
    },
    {
        id: 'bkash',
        label: 'বিকাশ',
        sub: 'আমাদের বিকাশ নম্বরে সেন্ড মানি করুন',
        color: '#E2136E',
        kind: 'mobile' as const,
    },
    {
        id: 'nagad',
        label: 'নগদ',
        sub: 'আমাদের নগদ নম্বরে সেন্ড মানি করুন',
        color: '#F47920',
        kind: 'mobile' as const,
    },
    {
        id: 'rocket',
        label: 'রকেট',
        sub: 'আমাদের রকেট নম্বরে সেন্ড মানি করুন',
        color: '#8C3EC0',
        kind: 'mobile' as const,
    },
    {
        id: 'bank',
        label: 'ব্যাংক ট্রান্সফার',
        sub: 'আমাদের ব্যাংক অ্যাকাউন্টে পাঠান',
        color: '#0F766E',
        kind: 'bank' as const,
    },
];
const MANUAL_METHODS = ['bkash', 'nagad', 'rocket', 'bank'];

const inputClass =
    "w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded text-sm text-gray-800 outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-gray-400";

const labelClass =
    "block text-xs font-medium text-gray-600 mb-1.5";

const CheckoutPage = () => {
    const allCartItems = useAppSelector((state) => state.cart.items);
    // Honor the cart's selection: only the ticked items are checked out (falls back to all).
    const items = React.useMemo(() => {
        try {
            const sel = JSON.parse(localStorage.getItem('shohozkitchen_selected_cart') || 'null');
            if (Array.isArray(sel) && sel.length > 0) {
                const filtered = allCartItems.filter((i: any) => sel.includes(i.id));
                if (filtered.length > 0) return filtered;
            }
        } catch {}
        return allCartItems;
    }, [allCartItems]);
    const totalPrice = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [createOrder, { isLoading: isPlacingOrder }] = useCreateOrderMutation();
    const [guestCheckout, { isLoading: isGuestPlacing }] = useGuestCheckoutMutation();
    const [initPayment, { isLoading: isInitiatingPayment }] = useInitPaymentMutation();
    const { data: siteRes } = useGetSiteContentQuery({});

    const paymentCfg = siteRes?.data?.payment || {};
    const methods = PAYMENT_META
        .map(m => ({
            ...m,
            number: m.kind === 'mobile' ? (paymentCfg[m.id]?.number || '') : '',
            accountType: m.kind === 'mobile' ? (paymentCfg[m.id]?.accountType || 'Personal') : '',
            active: m.kind === 'cod' || (
                paymentCfg[m.id]?.active === true
                && !!(m.kind === 'bank' ? paymentCfg.bank?.accountNumber : paymentCfg[m.id]?.number)
            ),
        }))
        .filter(m => m.active);
    const bank = paymentCfg.bank || {};
    const paymentInstructions = paymentCfg.instructions || '';
    const availableIds = methods.map(m => m.id).join(',');

    const [formData, setFormData] = useState({
        fullName: '', email: '', phone: '', address: '', city: '', area: '', postalCode: '',
    });

    const [selectedPayment, setSelectedPayment] = useState('cod');
    const [paymentDetails, setPaymentDetails] = useState({
        senderNumber: '', transactionId: '', paymentTime: '',
    });
    const [copied, setCopied] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; freeShipping?: boolean } | null>(null);
    // Set once an order is successfully placed → drives the success modal.
    const [placedOrder, setPlacedOrder] = useState<{ _id?: string; orderId?: string } | null>(null);

    // ─── Saved shipping addresses (set in the dashboard → auto-filled here) ──
    const { data: addrRes } = useGetMyAddressesQuery(undefined, { skip: !isAuthenticated });
    const savedAddresses: any[] = addrRes?.data || [];
    const [selectedAddressId, setSelectedAddressId] = useState<string>(''); // '' = undecided · 'new' = manual entry
    const [addAddress] = useAddAddressMutation();
    // When a logged-in user types a fresh address, save it back to their account
    // (dashboard) so it auto-fills next time. Ticked by default.
    const [saveAddress, setSaveAddress] = useState(true);

    const applyAddress = (a: any) => {
        setFormData(prev => ({
            ...prev,
            fullName: a.fullName || prev.fullName,
            phone: a.phone || prev.phone,
            address: a.address || '',
            area: a.area || '',
            city: a.city || '',
            postalCode: a.postalCode || '',
        }));
        setErrors({});
    };

    // Load coupon from cart page
    useEffect(() => {
        try {
            const saved = localStorage.getItem(COUPON_STORAGE_KEY);
            if (saved) setAppliedCoupon(JSON.parse(saved));
        } catch {}
    }, []);

    // ─── Shipping quote (debounced on city; recomputes when subtotal changes) ──
    const [debouncedCity, setDebouncedCity] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedCity(formData.city.trim()), 400);
        return () => clearTimeout(t);
    }, [formData.city]);

    // ─── Delivery charge: a single flat charge from Settings (no Inside/Outside,
    //     no zones). Free when a free-delivery rule applies (product / coupon /
    //     threshold / quantity). ──
    const { data: shipSettings } = useGetShippingSettingsQuery();
    const cartProductIds = React.useMemo(
        () => Array.from(new Set(items.map((i: any) => i.productId || i.id).filter(Boolean))) as string[],
        [items],
    );

    const { data: shippingQuote } = useGetShippingQuoteQuery(
        { city: debouncedCity || undefined, subtotal: totalPrice, productIds: cartProductIds },
        { skip: totalPrice <= 0 },
    );
    const freeShipping = Boolean(appliedCoupon?.freeShipping) || (shippingQuote?.freeShipping ?? false);
    const deliveryCharge = shippingQuote?.shippingCost ?? (shipSettings?.defaultInsideDhakaRate ?? 60);
    const shippingCost = freeShipping ? 0 : deliveryCharge;
    const estimatedDays = shippingQuote?.estimatedDays ?? '';
    const FREE_REASON_LABEL: Record<string, string> = {
        threshold: 'অর্ডারটি যোগ্য', coupon: 'কুপন প্রযোজ্য', product: 'ফ্রি ডেলিভারি পণ্য', quantity: 'বেশি পরিমাণে অর্ডার',
    };
    const freeReasonLabel = shippingQuote?.freeReason ? FREE_REASON_LABEL[shippingQuote.freeReason] : '';

    // Fill name / email / phone from the logged-in account.
    useEffect(() => {
        if (isAuthenticated && user) {
            setFormData(prev => ({
                ...prev,
                fullName: prev.fullName || user.name || '',
                email: prev.email || user.email || '',
                phone: prev.phone || user.phone || '',
            }));
        }
    }, [isAuthenticated, user]);

    // Default-select a saved address (the default one, else the first) and auto-fill.
    useEffect(() => {
        if (savedAddresses.length > 0 && !selectedAddressId) {
            const def = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
            setSelectedAddressId(def._id);
            applyAddress(def);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedAddresses.length]);

    useEffect(() => {
        // Don't bounce to the cart once the order is placed — the cart is emptied
        // on success and we want the confirmation modal to stay on screen.
        if (items.length === 0 && !placedOrder) router.push('/cart');
    }, [items, router, placedOrder]);

    // InitiateCheckout / begin_checkout — once per visit to the checkout page.
    const checkoutTracked = React.useRef(false);
    useEffect(() => {
        if (checkoutTracked.current || items.length === 0) return;
        checkoutTracked.current = true;
        trackBeginCheckout(
            items.map((i: any) => ({ id: i.productId || i.id, name: i.name, price: Number(i.price) || 0, quantity: i.quantity, category: i.category || undefined })),
            totalPrice,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length]);

    // Keep selected payment valid if admin hides the current method
    useEffect(() => {
        if (methods.length && !methods.some(m => m.id === selectedPayment)) {
            setSelectedPayment(methods[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableIds]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors(prev => { const n = { ...prev }; delete n[e.target.name]; return n; });
    };

    const handlePaymentDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors(prev => { const n = { ...prev }; delete n[e.target.name]; return n; });
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!formData.fullName.trim()) e.fullName = 'নাম লিখুন';
        if (!formData.phone.trim()) e.phone = 'ফোন নম্বর লিখুন';
        else if (!/^01\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) e.phone = 'সঠিক ১১ সংখ্যার নম্বর দিন';
        if (!formData.address.trim()) e.address = 'ঠিকানা লিখুন';
        // bKash / Nagad / Rocket / bank transfer need the payment's details so staff can check
        // it; COD is paid on delivery and needs none.
        if (MANUAL_METHODS.includes(selectedPayment)) {
            if (!paymentDetails.senderNumber.trim()) e.senderNumber = selectedPayment === 'bank' ? 'যে অ্যাকাউন্ট থেকে পাঠিয়েছেন তা লিখুন' : 'প্রেরকের নম্বর লিখুন';
            if (!paymentDetails.transactionId.trim()) e.transactionId = 'ট্রানজেকশন আইডি লিখুন';
            if (!paymentDetails.paymentTime.trim()) e.paymentTime = 'পেমেন্টের সময় দিন';
        }
        return e;
    };

    const activeMethod = methods.find(m => m.id === selectedPayment) || methods[0]
        || { ...PAYMENT_META[0], number: '', accountType: '', active: true };
    // The account the customer pays to: the bKash / Nagad / Rocket number, or the bank account number.
    const payTo = activeMethod.kind === 'bank' ? (bank.accountNumber || '') : activeMethod.number;

    const copyNumber = () => {
        if (!payTo) return;
        navigator.clipboard.writeText(payTo);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error('লাল দাগানো ঘরগুলো ঠিক করুন');
            const firstField = Object.keys(validationErrors)[0];
            document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
            return;
        }
        setErrors({});

        // Persist a freshly-typed address to the logged-in user's account so it
        // auto-fills next checkout. Best-effort: a failure here never blocks the order.
        const persistAddressIfNeeded = async () => {
            const isManualEntry = selectedAddressId === 'new' || savedAddresses.length === 0;
            if (!saveAddress || !isAuthenticated || !isManualEntry) return;
            const norm = (s: string) => (s || '').trim().toLowerCase();
            const alreadySaved = savedAddresses.some(a =>
                norm(a.address) === norm(formData.address) &&
                norm(a.city) === norm(formData.city) &&
                norm(a.phone) === norm(formData.phone),
            );
            if (alreadySaved) return;
            try {
                await addAddress({
                    label: 'Home',
                    fullName: formData.fullName,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    isDefault: savedAddresses.length === 0, // first address becomes the default
                }).unwrap();
            } catch {
                // best-effort only
            }
        };

        const orderPayload = {
            items: items.map(item => ({
                product: item.productId || item.id,
                quantity: item.quantity,
                color: item.color || undefined,
                size: item.size || undefined,
            })),
            shippingAddress: {
                fullName: formData.fullName,
                phone: formData.phone,
                address: formData.address,
            },
            paymentMethod: selectedPayment,
            // Only manual payments (bKash / Nagad / Rocket / bank) carry the payment's details.
            paymentDetails: MANUAL_METHODS.includes(selectedPayment) ? {
                senderNumber: paymentDetails.senderNumber,
                transactionId: paymentDetails.transactionId,
                paymentTime: paymentDetails.paymentTime,
            } : {},
            shippingCost,
            ...(appliedCoupon ? { couponCode: appliedCoupon.code, discount: appliedCoupon.discount } : {}),
        };

        // Only an online gateway (SSLCommerz, not offered for now) hands the browser off
        // after the order is created. COD and the manual bKash / Nagad / Rocket / bank payments
        // land on the confirmation like before; staff check the payment afterwards.
        const isGatewayMethod = selectedPayment === 'sslcommerz';

        const goToGateway = async (orderId: string) => {
            try {
                const initRes = await initPayment({ orderId, method: selectedPayment }).unwrap();
                const redirectUrl = initRes?.data?.redirectUrl;
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                    return;
                }
                router.push('/checkout/success');
            } catch {
                toast.error('অর্ডার হয়েছে, তবে পেমেন্ট শুরু করা যায়নি। My Orders থেকে আবার চেষ্টা করুন।', { duration: 7000 });
                router.push('/checkout/success');
            }
        };

        // Purchase — captured now, because the cart is emptied the moment the order goes
        // through. Sent before any hand-off to a payment gateway, while the page is still here.
        const purchasedItems = items.map((i: any) => ({
            id: i.productId || i.id, name: i.name, price: Number(i.price) || 0, quantity: i.quantity, category: i.category || undefined,
        }));
        const reportPurchase = (ord: any) => trackPurchase(
            {
                id: String(ord?.orderId || ord?._id || ''),
                value: Number(ord?.total) || totalPrice + shippingCost - (appliedCoupon?.discount || 0),
                shipping: Number(ord?.shippingCost ?? shippingCost) || 0,
            },
            purchasedItems,
        );

        try {
            if (isAuthenticated) {
                const result = await createOrder(orderPayload).unwrap();
                reportPurchase(result?.data?.order || result?.data);
                items.forEach((i: any) => dispatch(removeFromCart(i.id)));
                try { localStorage.removeItem('shohozkitchen_selected_cart'); } catch {}
                localStorage.removeItem(COUPON_STORAGE_KEY);
                await persistAddressIfNeeded();

                if (isGatewayMethod) {
                    const orderId = result?.data?._id;
                    if (orderId) {
                        await goToGateway(orderId);
                        return;
                    }
                }

                const ord = result?.data?.order || result?.data;
                setPlacedOrder({ _id: ord?._id, orderId: ord?.orderId || ord?.orderNumber });
            } else {
                const result = await guestCheckout(orderPayload).unwrap();
                reportPurchase(result?.data?.order || result?.data);
                items.forEach((i: any) => dispatch(removeFromCart(i.id)));
                try { localStorage.removeItem('shohozkitchen_selected_cart'); } catch {}
                localStorage.removeItem(COUPON_STORAGE_KEY);

                if (isGatewayMethod) {
                    const orderId = result?.data?.order?._id;
                    if (orderId) {
                        await goToGateway(orderId);
                        return;
                    }
                }

                const ord = result?.data?.order || result?.data;
                setPlacedOrder({ _id: ord?._id, orderId: ord?.orderId || ord?.orderNumber });
            }
        } catch (err: any) {
            const errorData = err?.data;
            const msg = errorData?.message || '';
            if (msg.includes('Product not found:')) {
                const missingId = msg.split('Product not found:')[1]?.trim();
                if (missingId) {
                    const target = items.find((i: any) => i.productId === missingId || i.id === missingId);
                    if (target) {
                        dispatch(removeFromCart(target.id));
                        toast.error(`"${target.name}" এখন আর নেই, কার্ট থেকে সরানো হলো। আবার অর্ডার করার চেষ্টা করুন।`, { duration: 7000 });
                        return;
                    }
                }
            }
            if (errorData?.errorMessages?.length > 0) {
                errorData.errorMessages.forEach((er: any) => toast.error(er.message, { duration: 6000 }));
            } else {
                toast.error(errorData?.message || 'অর্ডার করা যায়নি। আবার চেষ্টা করুন।', { duration: 6000 });
            }
        }
    };

    const isSubmitting = isPlacingOrder || isGuestPlacing || isInitiatingPayment;

    // Total = subtotal − the coupon's discount + shippingCost, worked out from the
    // discount itself, the way the server does it (order.service.ts).
    const baseAmount = appliedCoupon ? Math.max(0, totalPrice - appliedCoupon.discount) : totalPrice;
    const orderTotal = baseAmount + shippingCost;
    const totalQuantity = items.reduce((a, i) => a + i.quantity, 0);

    const cls = (field: string) =>
        `${inputClass} ${errors[field] ? 'border-red-400 focus:border-red-500' : ''}`;
    const FieldError = ({ field }: { field: string }) =>
        errors[field] ? <p className="mt-1 text-xs text-red-500">{errors[field]}</p> : null;

    // ── Order placed → confirmation modal ──
    if (placedOrder) {
        const orderRef = placedOrder.orderId || (placedOrder._id ? `#${placedOrder._id.slice(-8).toUpperCase()}` : '');
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 sm:p-8 text-center animate-[popIn_0.25s_ease-out]">
                    {/* Success check */}
                    <div className="mx-auto mb-5 w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                            <FiCheck size={32} className="text-white" strokeWidth={3} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">অর্ডার সম্পন্ন হয়েছে!</h2>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                        আপনার অর্ডারটি সফলভাবে জমা হয়েছে
                        {orderRef && <> — <span className="font-semibold text-gray-700">{orderRef}</span></>}।
                        {selectedPayment === 'cod' && ' পণ্য হাতে পেয়ে টাকা দিন।'}
                        {MANUAL_METHODS.includes(selectedPayment) && ' আপনার পেমেন্ট যাচাই করে আমরা নিশ্চিত করব।'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-7">
                        {isAuthenticated && (
                            <button
                                onClick={() => router.push('/dashboard/user/orders')}
                                className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:brightness-95 transition-all shadow-md shadow-[var(--color-primary)]/20"
                            >
                                আমার অর্ডার দেখুন
                            </button>
                        )}
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all"
                        >
                            কেনাকাটা চালিয়ে যান
                        </button>
                    </div>
                </div>
                <style>{`@keyframes popIn { 0% { opacity: 0; transform: scale(0.92) translateY(8px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="bg-[#F8FAFC] min-h-screen pb-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 max-w-6xl">

                {/* Back */}
                <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <FiChevronLeft size={16} />
                    কার্টে ফিরে যান
                </Link>

                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-5">অর্ডার সম্পন্ন করুন</h1>

                {/* Guest Banner */}
                {!isAuthenticated && (
                    <div className="mb-5 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-start gap-3">
                        <FiInfo size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-700 leading-relaxed">
                            অ্যাকাউন্ট ছাড়াই অর্ডার করতে পারবেন।{' '}
                            <Link href="/login?redirect=/checkout" className="font-medium underline">আগে থেকে অ্যাকাউন্ট থাকলে লগইন করুন</Link>
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5">

                        {/* ══ LEFT COLUMN ══ */}
                        <div className="lg:col-span-7 space-y-5">

                            {/* ── Shipping Address ── */}
                            <div className="bg-white rounded-lg border border-gray-200">
                                <div className="px-5 py-3.5 border-b border-gray-100">
                                    <h2 className="text-sm font-semibold text-gray-900">ডেলিভারি ঠিকানা</h2>
                                </div>
                                {/* Saved addresses — auto-filled from the dashboard. Pick one or add a new one. */}
                                {isAuthenticated && savedAddresses.length > 0 && (
                                    <div className="px-5 pt-4 space-y-2.5">
                                        {savedAddresses.map((a: any) => {
                                            const active = selectedAddressId === a._id;
                                            return (
                                                <label
                                                    key={a._id}
                                                    className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${active ? 'bg-[var(--color-primary-lightest)]/40' : 'border-gray-200 hover:border-gray-300'}`}
                                                    style={active ? { borderColor: 'var(--color-primary)' } : {}}
                                                >
                                                    <input type="radio" name="savedAddress" className="sr-only" checked={active} onChange={() => { setSelectedAddressId(a._id); applyAddress(a); }} />
                                                    <span className="w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: active ? 'var(--color-primary)' : '#d1d5db' }}>
                                                        {active && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-medium text-gray-900">
                                                            {a.fullName} <span className="text-gray-400 font-normal">· {a.phone}</span>
                                                            {a.isDefault && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)] bg-[var(--color-primary-lightest)] rounded px-1.5 py-0.5">ডিফল্ট</span>}
                                                        </span>
                                                        <span className="block text-xs text-gray-500 mt-0.5">{[a.address, a.city].filter(Boolean).join(', ')}</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedAddressId('new'); setFormData(prev => ({ ...prev, address: '', area: '', city: '', postalCode: '' })); }}
                                            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${selectedAddressId === 'new' ? 'bg-[var(--color-primary-lightest)]/40 text-gray-900' : 'border-dashed border-gray-300 text-gray-500 hover:border-gray-400'}`}
                                            style={selectedAddressId === 'new' ? { borderColor: 'var(--color-primary)' } : {}}
                                        >
                                            + নতুন ঠিকানায় ডেলিভারি
                                        </button>
                                        <Link href="/dashboard/user/addresses" className="inline-block text-xs text-[var(--color-primary)] hover:underline">সংরক্ষিত ঠিকানা ম্যানেজ করুন →</Link>
                                    </div>
                                )}

                                {/* Manual form — guests, no saved address, or "new address" */}
                                {(!isAuthenticated || savedAddresses.length === 0 || selectedAddressId === 'new') && (
                                <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>পূর্ণ নাম <span className="text-red-500">*</span></label>
                                        <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="আপনার নাম লিখুন" className={cls('fullName')} />
                                        <FieldError field="fullName" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>ফোন নম্বর <span className="text-red-500">*</span></label>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="01XXXXXXXXX" className={cls('phone')} />
                                        <FieldError field="phone" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>ঠিকানা <span className="text-red-500">*</span></label>
                                        <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="বাসা, রোড, এলাকা, থানা, জেলা" className={cls('address')} />
                                        <FieldError field="address" />
                                    </div>
                                    {isAuthenticated && (
                                        <label className="md:col-span-2 flex items-center gap-2.5 mt-1 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={saveAddress}
                                                onChange={(e) => setSaveAddress(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 accent-[var(--color-primary)] cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-600">পরের বার দ্রুত অর্ডারের জন্য এই ঠিকানা আমার অ্যাকাউন্টে সংরক্ষণ করুন</span>
                                        </label>
                                    )}
                                </div>
                                )}
                            </div>


                            {/* ── Payment Method ── */}
                            <div className="bg-white rounded-lg border border-gray-200">
                                <div className="px-5 py-3.5 border-b border-gray-100">
                                    <h2 className="text-sm font-semibold text-gray-900">পেমেন্ট পদ্ধতি</h2>
                                </div>
                                <div className="px-5 py-5 space-y-3">

                                    {/* Selectable option rows */}
                                    {methods.map((method) => {
                                        const active = selectedPayment === method.id;
                                        return (
                                            <label
                                                key={method.id}
                                                className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border cursor-pointer transition-colors ${
                                                    active ? 'bg-[var(--color-primary-lightest)]/40' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                                style={active ? { borderColor: method.color } : {}}
                                            >
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value={method.id}
                                                    checked={active}
                                                    onChange={() => setSelectedPayment(method.id)}
                                                    className="sr-only"
                                                />
                                                {/* Radio dot */}
                                                <span
                                                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                                    style={{ borderColor: active ? method.color : '#d1d5db' }}
                                                >
                                                    {active && <span className="w-2 h-2 rounded-full" style={{ background: method.color }} />}
                                                </span>
                                                {/* Icon badge */}
                                                <span
                                                    className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                                                    style={{ background: method.color }}
                                                >
                                                    {method.kind === 'cod'
                                                        ? <FiTruck size={16} />
                                                        : method.kind === 'bank'
                                                            ? <FiCreditCard size={16} />
                                                            : method.label[0]}
                                                </span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-sm font-medium text-gray-900 truncate">{method.label}</span>
                                                    <span className="block text-xs text-gray-400 mt-0.5 truncate">{method.sub}</span>
                                                </span>
                                            </label>
                                        );
                                    })}

                                    {/* ── Method-specific details ── */}
                                    {selectedPayment === 'cod' && (
                                        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <FiTruck size={15} className="text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-green-800">পণ্য হাতে পেয়ে টাকা দিন!</p>
                                                <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                                                    কোনো অগ্রিম টাকা লাগবে না। পণ্য আপনার দরজায় পৌঁছে দিলে ডেলিভারি এজেন্ট পুরো টাকা নগদে নিয়ে নেবেন।
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {MANUAL_METHODS.includes(selectedPayment) && (
                                        <div className="pt-1">
                                            {/* Where to pay: the bKash / Nagad / Rocket number, or the bank account */}
                                            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
                                                {activeMethod.kind === 'bank' ? (
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-gray-500">এই ব্যাংক অ্যাকাউন্টে মোট টাকা পাঠান</p>
                                                        <p className="text-base font-semibold tracking-wide text-gray-900 mt-0.5 break-all">{bank.accountNumber}</p>
                                                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                                            {bank.accountName}
                                                            {bank.bankName && <> · {bank.bankName}</>}
                                                            {bank.branch && <> · {bank.branch} শাখা</>}
                                                            {bank.routingNumber && <> · রাউটিং {bank.routingNumber}</>}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-xs text-gray-500">
                                                            এই {activeMethod.label} নম্বরে সেন্ড মানি ({activeMethod.accountType}) করুন
                                                        </p>
                                                        <p className="text-base font-semibold tracking-wide text-gray-900 mt-0.5">{activeMethod.number}</p>
                                                    </div>
                                                )}
                                                {payTo && (
                                                    <button
                                                        type="button"
                                                        onClick={copyNumber}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-600 hover:border-gray-400 transition-colors"
                                                    >
                                                        {copied ? <><FiCheck size={13} /> কপি হয়েছে</> : <><FiCopy size={13} /> কপি</>}
                                                    </button>
                                                )}
                                            </div>

                                            {paymentInstructions && (
                                                <p className="mt-3 text-xs text-gray-500 leading-relaxed">{paymentInstructions}</p>
                                            )}

                                            {/* Payment details form */}
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    {activeMethod.kind === 'bank' ? (
                                                        <>
                                                            <label className={labelClass}>যে অ্যাকাউন্ট থেকে পাঠিয়েছেন (ব্যাংক ও অ্যাকাউন্ট নম্বর) <span className="text-red-500">*</span></label>
                                                            <input type="text" name="senderNumber" value={paymentDetails.senderNumber} onChange={handlePaymentDetailChange} placeholder="যেমন: City Bank, 1234567890" className={cls('senderNumber')} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <label className={labelClass}>আপনার {activeMethod.label} নম্বর <span className="text-red-500">*</span></label>
                                                            <input type="tel" name="senderNumber" value={paymentDetails.senderNumber} onChange={handlePaymentDetailChange} placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন" className={cls('senderNumber')} />
                                                        </>
                                                    )}
                                                    <FieldError field="senderNumber" />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>{activeMethod.kind === 'bank' ? 'ট্রানজেকশন / রেফারেন্স আইডি' : 'ট্রানজেকশন আইডি'} <span className="text-red-500">*</span></label>
                                                    <input type="text" name="transactionId" value={paymentDetails.transactionId} onChange={handlePaymentDetailChange} placeholder="যেমন: 9A1B2C3D4E" className={cls('transactionId')} />
                                                    <FieldError field="transactionId" />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>পেমেন্টের সময় <span className="text-red-500">*</span></label>
                                                    <input type="datetime-local" name="paymentTime" value={paymentDetails.paymentTime} onChange={handlePaymentDetailChange} className={cls('paymentTime')} />
                                                    <FieldError field="paymentTime" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ══ RIGHT COLUMN: Sticky Order Summary ══ */}
                        <div className="lg:col-span-5 lg:sticky lg:top-24 h-fit">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-gray-900">অর্ডার সারাংশ</h2>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
                                        {totalQuantity} টি পণ্য
                                    </span>
                                </div>

                                {/* ── Order Items inside Order Summary ── */}
                                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto px-5">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex gap-3.5 py-3.5 items-center">
                                            <div className="w-14 h-14 bg-gray-50 rounded border border-gray-100 p-1 flex-shrink-0 relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-1">
                                                    <h4 className="text-xs font-semibold text-gray-800 line-clamp-1 leading-snug">{item.name}</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => dispatch(removeFromCart(item.id))}
                                                        className="text-gray-300 hover:text-red-500 transition-colors p-0.5 ml-1 flex-shrink-0"
                                                        title="সরান"
                                                    >
                                                        <FiTrash2 size={13} />
                                                    </button>
                                                </div>
                                                {(item.color || item.size) && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.color && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
                                                                {item.colorHex && <span className="w-2 h-2 rounded-full border border-gray-200" style={{ background: item.colorHex }} />}
                                                                {item.color}
                                                            </span>
                                                        )}
                                                        {item.size && (
                                                            <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
                                                                সাইজ: {item.size}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between mt-2">
                                                    {/* Quantity Controls (+ -) */}
                                                    <div className="inline-flex items-center border border-gray-200 rounded overflow-hidden bg-white shadow-2xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (item.quantity > 1) {
                                                                    dispatch(decreaseQuantity(item.id));
                                                                } else {
                                                                    dispatch(removeFromCart(item.id));
                                                                }
                                                            }}
                                                            className="w-6 h-6 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                                                            title={item.quantity === 1 ? 'সরান' : 'কমান'}
                                                        >
                                                            <FiMinus size={11} />
                                                        </button>
                                                        <span className="w-7 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => dispatch(increaseQuantity(item.id))}
                                                            className="w-6 h-6 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                                                            title="বাড়ান"
                                                        >
                                                            <FiPlus size={11} />
                                                        </button>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-bold text-gray-900">৳{(item.price * item.quantity).toLocaleString()}</span>
                                                        {item.quantity > 1 && (
                                                            <p className="text-[10px] text-gray-400">৳{item.price.toLocaleString()} × {item.quantity}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals */}
                                <div className="px-5 py-4 space-y-2.5 border-t border-gray-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">সাবটোটাল</span>
                                        <span className="text-gray-900 font-medium">৳{totalPrice.toLocaleString()}</span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span className="flex items-center gap-1">
                                                <FiTag size={12} /> কুপন ({appliedCoupon.code})
                                            </span>
                                            <span className="font-medium">-৳{appliedCoupon.discount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">
                                            ডেলিভারি চার্জ
                                            {estimatedDays && (
                                                <span className="block text-xs text-gray-400">আনুমানিক {estimatedDays}</span>
                                            )}
                                        </span>
                                        {freeShipping ? (
                                            <span className="text-right">
                                                <span className="font-medium text-green-600">ফ্রি</span>
                                                {freeReasonLabel && <span className="block text-[10px] text-green-600/70">{freeReasonLabel}</span>}
                                            </span>
                                        ) : (
                                            <span className="text-gray-900">৳{shippingCost.toLocaleString()}</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-100">
                                        <span className="text-sm font-semibold text-gray-900">সর্বমোট</span>
                                        <div className="text-right">
                                            {appliedCoupon && (
                                                <p className="text-xs line-through text-gray-400">৳{(totalPrice + shippingCost).toLocaleString()}</p>
                                            )}
                                            <span className="text-xl font-bold text-[var(--color-primary)]">
                                                ৳{orderTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {selectedPayment === 'cod'
                                            ? <><span className="font-medium text-green-600">ক্যাশ অন ডেলিভারি</span> — পণ্য পেয়ে টাকা দিন</>
                                            : <>পেমেন্ট: <span className="font-medium" style={{ color: activeMethod.color }}>{activeMethod.label}</span></>
                                        }
                                    </p>
                                </div>

                                {/* Place Order */}
                                <div className="px-5 pb-5">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[var(--color-primary)] text-white rounded text-sm font-semibold hover:brightness-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                অর্ডার হচ্ছে...
                                            </>
                                        ) : (
                                            <><FiLock size={14} /> অর্ডার করুন</>
                                        )}
                                    </button>
                                    <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
                                        অর্ডার করার মাধ্যমে আপনি আমাদের{' '}
                                        <Link href="/terms" className="underline hover:text-gray-600">শর্তাবলীতে</Link> সম্মত হচ্ছেন
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckoutPage;
