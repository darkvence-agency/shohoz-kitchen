/* eslint-disable react-hooks/static-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/redux';
import { removeFromCart, increaseQuantity, decreaseQuantity } from '@/redux/slices/cartSlice';
import { loginSuccess } from '@/redux/slices/authSlice';
import { useCreateOrderMutation, useGuestCheckoutMutation } from '@/redux/api/orderApi';
import { useInitPaymentMutation } from '@/redux/api/paymentApi';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import { useGetShippingQuoteQuery } from '@/redux/api/shippingApi';
import { useGetMyAddressesQuery, useAddAddressMutation } from '@/redux/api/userApi';
import {
    FiChevronLeft, FiInfo, FiCheck, FiCopy, FiLock, FiTag, FiCreditCard, FiTruck,
    FiPlus, FiMinus, FiTrash2
} from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const COUPON_STORAGE_KEY = 'shohozkitchen_applied_coupon';

// ─── Payment methods offered: bKash + SSLCommerz + Cash on Delivery ──────────
// (bKash account number/instructions come dynamically from site settings)
const PAYMENT_META = [
    {
        id: 'bkash',
        label: 'bKash',
        sub: 'Send Money to our bKash number',
        color: '#E2136E',
        kind: 'mobile' as const,
    },
    {
        id: 'sslcommerz',
        label: 'Cards & Mobile Banking (SSLCommerz)',
        sub: 'Visa, Mastercard, Nagad, Rocket & more',
        color: '#1F6FEB',
        kind: 'gateway' as const,
    },
    {
        id: 'cod',
        label: 'Cash on Delivery',
        sub: 'Pay in cash when your order arrives',
        color: '#16a34a',
        kind: 'cod' as const,
    },
];

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
            active: paymentCfg[m.id]?.active !== false,
        }))
        .filter(m => m.active);
    const paymentInstructions = paymentCfg.instructions || '';
    const availableIds = methods.map(m => m.id).join(',');

    const [formData, setFormData] = useState({
        fullName: '', email: '', phone: '', address: '', city: '', area: '', postalCode: '',
    });

    const [selectedPayment, setSelectedPayment] = useState('bkash');
    const [paymentDetails, setPaymentDetails] = useState({
        senderNumber: '', transactionId: '', paymentTime: '',
    });
    const [copied, setCopied] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; finalAmount: number; freeShipping?: boolean } | null>(null);
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

    // Delivery-zone dropdown → deterministic rate. If none picked, the quote falls
    // back to city-string matching (backwards compatible).
    // const { data: deliveryZones = [] } = useGetDeliveryZonesQuery();
    const [selectedZoneId, ] = useState('');
    const quoteZoneId = selectedZoneId && selectedZoneId !== 'other' ? selectedZoneId : undefined;

    // const handleZoneChange = (value: string) => {
    //     setSelectedZoneId(value);
    //     if (value === 'other') {
    //         setFormData((prev) => ({ ...prev, city: '' }));
    //     } else if (value) {
    //         const zone = deliveryZones.find((z) => z._id === value);
    //         if (zone) setFormData((prev) => ({ ...prev, city: zone.name }));
    //     }
    // };

    const { data: shippingQuote } = useGetShippingQuoteQuery(
        { city: debouncedCity || undefined, subtotal: totalPrice, zoneId: quoteZoneId },
        { skip: totalPrice <= 0 },
    );

    // Fall back to a sensible default so a number always shows while the quote loads.
    // A free-shipping coupon zeroes delivery here too (matches the server's charge).
    const freeShipping = Boolean(appliedCoupon?.freeShipping) || (shippingQuote?.freeShipping ?? (totalPrice >= 5000));
    const shippingCost = freeShipping ? 0 : (shippingQuote?.shippingCost ?? (totalPrice >= 5000 ? 0 : 120));
    const estimatedDays = shippingQuote?.estimatedDays ?? '3-5 days';
    const FREE_REASON_LABEL: Record<string, string> = {
        threshold: 'Order qualifies', coupon: 'Coupon applied', product: 'Free-delivery items', quantity: 'Bulk order',
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
        if (!formData.fullName.trim()) e.fullName = 'Full name is required';
        if (!formData.phone.trim()) e.phone = 'Phone number is required';
        else if (!/^01\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid 11-digit number';
        if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) e.email = 'Enter a valid email';
        if (!formData.address.trim()) e.address = 'Address is required';
        if (!formData.city.trim()) e.city = 'City is required';
        // bKash requires the "send money" confirmation details. SSLCommerz redirects
        // to the gateway (later phase) and COD is paid on delivery — neither needs them.
        if (selectedPayment === 'bkash') {
            if (!paymentDetails.senderNumber.trim()) e.senderNumber = 'Sender number is required';
            if (!paymentDetails.transactionId.trim()) e.transactionId = 'Transaction ID is required';
            if (!paymentDetails.paymentTime.trim()) e.paymentTime = 'Payment time is required';
        }
        return e;
    };

    const activeMethod = methods.find(m => m.id === selectedPayment) || methods[0]
        || { ...PAYMENT_META[0], number: '', accountType: 'Personal', active: true };

    const copyNumber = () => {
        if (!activeMethod?.number) return;
        navigator.clipboard.writeText(activeMethod.number);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error('Please fix the highlighted fields');
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
                    area: formData.area,
                    city: formData.city,
                    postalCode: formData.postalCode,
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
                email: formData.email,
                address: formData.address,
                area: formData.area,
                city: formData.city,
                postalCode: formData.postalCode,
            },
            paymentMethod: selectedPayment,
            // Only bKash carries the manual send-money confirmation details.
            paymentDetails: selectedPayment === 'bkash' ? {
                senderNumber: paymentDetails.senderNumber,
                transactionId: paymentDetails.transactionId,
                paymentTime: paymentDetails.paymentTime,
            } : {},
            shippingCost,
            ...(quoteZoneId ? { zoneId: quoteZoneId } : {}),
            ...(appliedCoupon ? { couponCode: appliedCoupon.code, discount: appliedCoupon.discount } : {}),
        };

        // For online gateways (bKash / SSLCommerz) we hand the browser off to the
        // gateway after the order is created. COD never touches the gateway and
        // simply lands on the success page like before.
        const isGatewayMethod = selectedPayment === 'bkash' || selectedPayment === 'sslcommerz';

        // Initialise the gateway for the freshly-created order and redirect the
        // browser to whatever URL the backend returns (real gateway in prod, the
        // /payment/simulate mock page in dev). Falls back to the success page if
        // the gateway can't be reached so the order is never lost.
        const goToGateway = async (orderId: string) => {
            try {
                const initRes = await initPayment({ orderId, method: selectedPayment }).unwrap();
                const redirectUrl = initRes?.data?.redirectUrl;
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                    return;
                }
                // No redirect URL came back — treat as placed and let the user verify later.
                router.push('/checkout/success');
            } catch {
                toast.error('Order placed, but we could not start the payment. You can retry from My Orders.', { duration: 7000 });
                router.push('/checkout/success');
            }
        };

        try {
            if (isAuthenticated) {
                const result = await createOrder(orderPayload).unwrap();
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
                items.forEach((i: any) => dispatch(removeFromCart(i.id)));
                try { localStorage.removeItem('shohozkitchen_selected_cart'); } catch {}
                localStorage.removeItem(COUPON_STORAGE_KEY);

                if (result.data?.accessToken && result.data?.user) {
                    const userData = result.data.user;
                    dispatch(loginSuccess({
                        user: {
                            id: userData._id,
                            name: `${userData.firstName} ${userData.lastName}`.trim(),
                            email: userData.email,
                            phone: userData.phone || '',
                            role: userData.role || 'user',
                        },
                        token: result.data.accessToken,
                    }));
                }

                if (isGatewayMethod) {
                    const orderId = result?.data?.order?._id;
                    if (orderId) {
                        await goToGateway(orderId);
                        return;
                    }
                }

                const ord = result?.data?.order || result?.data;
                toast.success('Your account has been created.', { duration: 5000 });
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
                        toast.error(`"${target.name}" is no longer available and was removed from your cart. Please try placing your order again.`, { duration: 7000 });
                        return;
                    }
                }
            }
            if (errorData?.errorMessages?.length > 0) {
                errorData.errorMessages.forEach((er: any) => toast.error(er.message, { duration: 6000 }));
            } else {
                toast.error(errorData?.message || 'Failed to place order. Please try again.', { duration: 6000 });
            }
        }
    };

    const isSubmitting = isPlacingOrder || isGuestPlacing || isInitiatingPayment;

    // Total = (coupon ? finalAmount : subtotal) + shippingCost
    const baseAmount = appliedCoupon ? appliedCoupon.finalAmount : totalPrice;
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
                    <h2 className="text-2xl font-bold text-gray-900">Order Placed!</h2>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                        Thank you for your purchase. Your order has been placed successfully
                        {orderRef && <> — <span className="font-semibold text-gray-700">{orderRef}</span></>}.
                        {selectedPayment === 'cod' && ' Pay in cash when it arrives.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-7">
                        <button
                            onClick={() => router.push('/dashboard/user/orders')}
                            className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:brightness-95 transition-all shadow-md shadow-[var(--color-primary)]/20"
                        >
                            Go to Dashboard
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all"
                        >
                            Continue Shopping
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
                    Back to Cart
                </Link>

                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-5">Checkout</h1>

                {/* Guest Banner */}
                {!isAuthenticated && (
                    <div className="mb-5 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-start gap-3">
                        <FiInfo size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-700 leading-relaxed">
                            No account needed. We&apos;ll create one automatically — your email will be your login ID and password.{' '}
                            <Link href="/login?redirect=/checkout" className="font-medium underline">Already have an account?</Link>
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
                                    <h2 className="text-sm font-semibold text-gray-900">Shipping Address</h2>
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
                                                            {a.isDefault && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)] bg-[var(--color-primary-lightest)] rounded px-1.5 py-0.5">Default</span>}
                                                            {a.label && <span className="ml-1.5 text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{a.label}</span>}
                                                        </span>
                                                        <span className="block text-xs text-gray-500 mt-0.5">{[a.address, a.area, a.city, a.postalCode].filter(Boolean).join(', ')}</span>
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
                                            + Deliver to a new address
                                        </button>
                                        <Link href="/dashboard/user/addresses" className="inline-block text-xs text-[var(--color-primary)] hover:underline">Manage saved addresses →</Link>
                                    </div>
                                )}

                                {/* Manual form — guests, no saved address, or "new address" */}
                                {(!isAuthenticated || savedAddresses.length === 0 || selectedAddressId === 'new') && (
                                <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                                        <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" className={cls('fullName')} />
                                        <FieldError field="fullName" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Email {!isAuthenticated && <span className="text-gray-400">(login ID)</span>}</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" className={cls('email')} />
                                        <FieldError field="email" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="01XXXXXXXXX" className={cls('phone')} />
                                        <FieldError field="phone" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Address <span className="text-red-500">*</span></label>
                                        <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="House no, road, area" className={cls('address')} />
                                        <FieldError field="address" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>City / District <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            placeholder="e.g. Dhaka, Gazipur, Chittagong..."
                                            className={cls('city')}
                                        />
                                        <FieldError field="city" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Area / Thana</label>
                                        <input
                                            type="text"
                                            name="area"
                                            value={formData.area}
                                            onChange={handleChange}
                                            placeholder="e.g. Mirpur, Dhanmondi, Gazipur Sadar..."
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Postal Code</label>
                                        <input
                                            type="text"
                                            name="postalCode"
                                            value={formData.postalCode}
                                            onChange={handleChange}
                                            placeholder="e.g. 1207 / 1703"
                                            className={inputClass}
                                        />
                                    </div>
                                    {isAuthenticated && (
                                        <label className="md:col-span-2 flex items-center gap-2.5 mt-1 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={saveAddress}
                                                onChange={(e) => setSaveAddress(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 accent-[var(--color-primary)] cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-600">Save this address to my account for faster checkout next time</span>
                                        </label>
                                    )}
                                </div>
                                )}
                            </div>


                            {/* ── Payment Method ── */}
                            <div className="bg-white rounded-lg border border-gray-200">
                                <div className="px-5 py-3.5 border-b border-gray-100">
                                    <h2 className="text-sm font-semibold text-gray-900">Payment Method</h2>
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
                                                        : method.kind === 'gateway'
                                                            ? <FiCreditCard size={16} />
                                                            : 'b'}
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
                                                <p className="text-sm font-semibold text-green-800">Pay when your order arrives!</p>
                                                <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                                                    No advance payment needed. Our delivery agent will collect the full amount in cash when your order is delivered to your door.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedPayment === 'sslcommerz' && (
                                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <FiCreditCard size={15} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-blue-800">Secure online payment</p>
                                                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                                                    You will be redirected to SSLCommerz to complete payment using your card, internet banking, or mobile wallet.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedPayment === 'bkash' && (
                                        <div className="pt-1">
                                            {/* Merchant number */}
                                            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        Send Money ({activeMethod.accountType}) to this {activeMethod.label} number
                                                    </p>
                                                    {activeMethod.number ? (
                                                        <p className="text-base font-semibold tracking-wide text-gray-900 mt-0.5">{activeMethod.number}</p>
                                                    ) : (
                                                        <p className="text-sm font-medium text-amber-600 mt-0.5">Number not set — please contact support</p>
                                                    )}
                                                </div>
                                                {activeMethod.number && (
                                                    <button
                                                        type="button"
                                                        onClick={copyNumber}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-600 hover:border-gray-400 transition-colors"
                                                    >
                                                        {copied ? <><FiCheck size={13} /> Copied</> : <><FiCopy size={13} /> Copy</>}
                                                    </button>
                                                )}
                                            </div>

                                            {paymentInstructions && (
                                                <p className="mt-3 text-xs text-gray-500 leading-relaxed">{paymentInstructions}</p>
                                            )}

                                            {/* Payment details form */}
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <label className={labelClass}>Your {activeMethod.label} Number <span className="text-red-500">*</span></label>
                                                    <input type="tel" name="senderNumber" value={paymentDetails.senderNumber} onChange={handlePaymentDetailChange} placeholder="Number you sent money from" className={cls('senderNumber')} />
                                                    <FieldError field="senderNumber" />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Transaction ID <span className="text-red-500">*</span></label>
                                                    <input type="text" name="transactionId" value={paymentDetails.transactionId} onChange={handlePaymentDetailChange} placeholder="e.g. 9A1B2C3D4E" className={cls('transactionId')} />
                                                    <FieldError field="transactionId" />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Payment Time <span className="text-red-500">*</span></label>
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
                                    <h2 className="text-sm font-semibold text-gray-900">Order Summary</h2>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
                                        {totalQuantity} item{totalQuantity > 1 ? 's' : ''}
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
                                                        title="Remove product"
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
                                                                Size: {item.size}
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
                                                            title={item.quantity === 1 ? 'Remove' : 'Decrease'}
                                                        >
                                                            <FiMinus size={11} />
                                                        </button>
                                                        <span className="w-7 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => dispatch(increaseQuantity(item.id))}
                                                            className="w-6 h-6 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                                                            title="Increase"
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
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="text-gray-900 font-medium">৳{totalPrice.toLocaleString()}</span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span className="flex items-center gap-1">
                                                <FiTag size={12} /> Coupon ({appliedCoupon.code})
                                            </span>
                                            <span className="font-medium">-৳{appliedCoupon.discount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">
                                            Delivery
                                            {estimatedDays && (
                                                <span className="block text-xs text-gray-400">Est. {estimatedDays}</span>
                                            )}
                                        </span>
                                        {freeShipping ? (
                                            <span className="text-right">
                                                <span className="font-medium text-green-600">FREE</span>
                                                {freeReasonLabel && <span className="block text-[10px] text-green-600/70">{freeReasonLabel}</span>}
                                            </span>
                                        ) : (
                                            <span className="text-gray-900">৳{shippingCost.toLocaleString()}</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-100">
                                        <span className="text-sm font-semibold text-gray-900">Total</span>
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
                                            ? <><span className="font-medium text-green-600">Cash on Delivery</span> — pay when delivered</>
                                            : <>Paying via <span className="font-medium" style={{ color: activeMethod.color }}>{activeMethod.label}</span></>
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
                                                Placing order...
                                            </>
                                        ) : (
                                            <><FiLock size={14} /> Place Order</>
                                        )}
                                    </button>
                                    <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
                                        By placing this order you agree to our{' '}
                                        <Link href="/terms" className="underline hover:text-gray-600">Terms &amp; Conditions</Link>
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
