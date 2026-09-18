/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    FiHeart, FiShoppingCart, FiMinus, FiPlus, FiCheckCircle,
    FiStar, FiX, FiZoomIn, FiCopy, FiShare2, FiDownload,
    FiChevronUp, FiChevronDown, FiMessageSquare,
    FiEye, FiChevronRight, FiChevronLeft, FiSend,
    FiMapPin, FiTruck, FiDollarSign, FiRefreshCw, FiShield, FiClock
} from 'react-icons/fi';
import { useGetProductBySlugQuery, useGetRelatedProductsQuery, useIncrementProductStatMutation } from '@/redux/api/productApi';
import { useGetProductReviewsQuery, useCreateReviewMutation, useCanReviewQuery } from '@/redux/api/reviewApi';
import { useAppDispatch, useAppSelector } from '@/redux';
import { addToCart, updateQuantity } from '@/redux/slices/cartSlice';
import { useCreateInquiryMutation } from '@/redux/api/inquiryApi';
import { useStartConversationMutation } from '@/redux/api/chatApi';
import { useWishlist } from '@/hooks/useWishlist';
import { toast } from 'react-hot-toast';
import NewProductCard, { CommentsPopup } from '@/components/shared/NewProductCard';
import { getDisplayPrice } from '@/utils/offerPrice';
import {
    FaFacebookF, FaFacebookMessenger, FaWhatsapp, FaTelegramPlane,
    FaLinkedinIn, FaPinterestP, FaEnvelope, FaInstagram
} from 'react-icons/fa';
import { FaXTwitter, FaTiktok } from 'react-icons/fa6';

export default function ProductDetailsPage() {
    const { slug } = useParams();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAppSelector((state: any) => state.auth);
    const [createInquiry] = useCreateInquiryMutation();
    const [startConversation, { isLoading: isStartingChat }] = useStartConversationMutation();
    const [incrementStat] = useIncrementProductStatMutation();
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const { isInWishlist, toggle: toggleWishlistItem } = useWishlist();
    const [addedToCart, setAddedToCart] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const [titleDescExpanded, setTitleDescExpanded] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [showSharePopup, setShowSharePopup] = useState(false);
    const [shareLinkCopied, setShareLinkCopied] = useState(false);
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [cmtText, setCmtText] = useState('');
    const [cmtRating, setCmtRating] = useState(5);
    const [cmtHoverRating, setCmtHoverRating] = useState(0);
    const [cmtSubmitting, setCmtSubmitting] = useState(false);
    const [cmtSuccess, setCmtSuccess] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const hasDraggedRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const panOffsetRef = useRef({ x: 0, y: 0 });
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [inquiryName, setInquiryName] = useState('');
    const [inquiryContact, setInquiryContact] = useState('');
    const [inquiryPhone, setInquiryPhone] = useState('');
    const [inquiryMessage, setInquiryMessage] = useState('');
    const [inquirySubmitting, setInquirySubmitting] = useState(false);
    const [inquirySuccess, setInquirySuccess] = useState(false);
    const colorSwatchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [slug]);

    const anyModalOpen = showSharePopup || showCommentsModal || showRatingModal || isFullscreen || showDownloadModal || showInquiryModal;
    useEffect(() => {
        if (anyModalOpen) { document.body.style.overflow = 'hidden'; }
        else { document.body.style.overflow = ''; }
        return () => { document.body.style.overflow = ''; };
    }, [anyModalOpen]);

    const scrollList = (ref: React.RefObject<HTMLDivElement | null>, dir: 'up' | 'down') => {
        if (ref.current) ref.current.scrollBy({ left: dir === 'down' ? 140 : -140, behavior: 'smooth' });
    };

    const { data: productData, isLoading, isError } = useGetProductBySlugQuery(slug as string, { skip: !slug });
    const product = productData?.data;
    const isWishlisted = product ? isInWishlist(product._id || product.id) : false;

    const { data: relatedData } = useGetRelatedProductsQuery(
        { id: product?._id, categoryId: product?.category?._id },
        { skip: !product?._id || !product?.category?._id }
    );
    const relatedProducts = relatedData?.data || [];

    const { data: reviewsData } = useGetProductReviewsQuery({ productId: product?._id }, { skip: !product?._id });
    const reviews = reviewsData?.data || [];
    // const [publicCreateReview] = usePublicCreateReviewMutation();
    const [createReviewMutation] = useCreateReviewMutation();
    const { data: canReviewData } = useCanReviewQuery(product?._id, { skip: !product?._id || !isAuthenticated });
    const canReviewInfo = canReviewData?.data;

    const cartItems = useAppSelector((state: any) => state.cart.items);

    const getCartId = () => {
        const parts = [product?._id];
        if (selectedColor) parts.push(selectedColor);
        if (selectedSize) parts.push(selectedSize);
        return parts.join('_');
    };
    const isInCart = product ? cartItems.some((item: any) => item.id === getCartId()) : false;

    const handleAddToCart = () => {
        if (!product) return;
        if (displayStock === 0) { toast.error('This product is out of stock'); return; }
        const cartId = getCartId();
        if (isInCart) { setAddedToCart(true); setTimeout(() => setAddedToCart(false), 2000); return; }
        const itemDiscount = activeVariant
            ? (typeof activeVariant.discount === 'number' ? activeVariant.discount : (activeVariant.originalPrice && activeVariant.originalPrice > discountedPrice ? Math.round(((activeVariant.originalPrice - discountedPrice) / activeVariant.originalPrice) * 100) : 0))
            : (offerDisplay.discount || (product.originalPrice && product.originalPrice > discountedPrice ? Math.round(((product.originalPrice - discountedPrice) / product.originalPrice) * 100) : 0));
        const variantImage = activeVariant?.images?.[0] || allImages[selectedImage] || product.thumbnail;
        dispatch(addToCart({
            id: cartId,
            productId: product._id,
            name: product.name,
            price: discountedPrice,
            mrp: activeVariant?.originalPrice || product.originalPrice || product.price,
            image: variantImage,
            category: product.category?.name || 'General',
            quantity,
            color: selectedColor || undefined,
            colorHex: activeVariant?.colorHex || undefined,
            size: selectedSize || undefined,
            variantId: activeVariant?._id || undefined,
            wholesalePrice: activeVariant?.costPrice ?? product.costPrice ?? product.wholesalePrice ?? 0,
            discount: itemDiscount,
        }));
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const handleBuyNow = () => {
        if (!product || displayStock === 0) return;
        const cartId = getCartId();
        const variantImage = activeVariant?.images?.[0] || allImages[selectedImage] || product.thumbnail;
        const itemDiscount = activeVariant
            ? (typeof activeVariant.discount === 'number' ? activeVariant.discount : (activeVariant.originalPrice && activeVariant.originalPrice > discountedPrice ? Math.round(((activeVariant.originalPrice - discountedPrice) / activeVariant.originalPrice) * 100) : 0))
            : (offerDisplay.discount || (product.originalPrice && product.originalPrice > discountedPrice ? Math.round(((product.originalPrice - discountedPrice) / product.originalPrice) * 100) : 0));

        if (isInCart) {
            dispatch(updateQuantity({ id: cartId, quantity }));
        } else {
            dispatch(addToCart({
                id: cartId,
                productId: product._id,
                name: product.name,
                price: discountedPrice,
                mrp: activeVariant?.originalPrice || product.originalPrice || product.price,
                image: variantImage,
                category: product.category?.name || 'General',
                quantity,
                color: selectedColor || undefined,
                colorHex: activeVariant?.colorHex || undefined,
                size: selectedSize || undefined,
                variantId: activeVariant?._id || undefined,
                wholesalePrice: activeVariant?.costPrice ?? product.costPrice ?? product.wholesalePrice ?? 0,
                discount: itemDiscount,
            }));
        }

        try {
            localStorage.setItem('shohozkitchen_selected_cart', JSON.stringify([cartId]));
        } catch {}

        router.push('/checkout');
    };

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'radial-gradient(55% 45% at 88% 0%, rgba(var(--color-primary-rgb), 0.06), transparent 70%), radial-gradient(45% 40% at 0% 22%, rgba(var(--color-primary-rgb), 0.04), transparent 70%), #F8FAFC' }}>
                <div className="container mx-auto px-4 py-6">
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {[50, 80, 120].map(w => <div key={w} style={{ height: '14px', width: `${w}px`, background: '#e5e7eb', borderRadius: '4px' }} className="animate-pulse" />)}
                    </div>
                    <div style={{ background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb', padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 55%', aspectRatio: '1', background: '#f3f4f6', borderRadius: '6px' }} className="animate-pulse" />
                        <div style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[60, 20, 80, 80, 40].map((h, i) => <div key={i} style={{ height: `${h}px`, background: '#f3f4f6', borderRadius: '6px' }} className="animate-pulse" />)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !product) {
        return (
            <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '6px', maxWidth: '380px', margin: '0 auto', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111', marginBottom: '0.5rem' }}>Product Not Found</h2>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '14px' }}>This product may have been removed or is no longer available.</p>
                    <Link href="/products" style={{ padding: '0.625rem 1.5rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '6px', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>Browse Products</Link>
                </div>
            </div>
        );
    }

    const baseImages = [product.thumbnail, ...(product.images || [])].filter(Boolean);
    const variants = product.variants || [];
    const hasVariants = variants.length > 0;

    const colorSwatches = (() => {
        if (hasVariants) {
            const map = new Map<string, string>();
            variants.forEach((v: any) => { if (v.color) map.set(v.color, v.colorHex || v.color); });
            return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
        }
        if (product.colors?.length > 0) return product.colors.map((c: string, i: number) => ({ name: c, hex: product.colorHex?.[i] || c }));
        return [];
    })();

    const sizeList: string[] = (() => {
        if (hasVariants) return [...new Set(variants.filter((v: any) => v.size).map((v: any) => v.size))];
        return product.sizes?.length > 0 ? product.sizes : [];
    })();

    const colorImageMap = (() => {
        const map: Record<string, string[]> = {};
        if (hasVariants) {
            variants.forEach((v: any) => {
                if (v.color && v.images?.length > 0) {
                    if (!map[v.color]) map[v.color] = [];
                    v.images.forEach((img: string) => { if (!map[v.color].includes(img)) map[v.color].push(img); });
                }
            });
        } else if (colorSwatches.length > 0 && baseImages.length > 0) {
            colorSwatches.forEach((c: any, i: number) => { if (i < baseImages.length) map[c.name] = [baseImages[i]]; });
        }
        return map;
    })();

    const imageToColorMap = (() => {
        const map: Record<string, string> = {};
        Object.entries(colorImageMap).forEach(([colorName, imgs]) => { imgs.forEach(img => { map[img] = colorName; }); });
        return map;
    })();

    const hasVariantSelection = Boolean(selectedColor || selectedSize);
    const activeVariant = hasVariants && hasVariantSelection ? variants.find((v: any) => (!selectedColor || v.color === selectedColor) && (!selectedSize || v.size === selectedSize)) : null;
    const availableSizesForColor = hasVariants && selectedColor ? variants.filter((v: any) => v.color === selectedColor).map((v: any) => v.size).filter(Boolean) : sizeList;
    const availableColorsForSize = hasVariants && selectedSize ? variants.filter((v: any) => v.size === selectedSize).map((v: any) => v.color).filter(Boolean) : colorSwatches.map((c: any) => c.name);

    const allImages = (() => {
        if (hasVariants) {
            const seen = new Set<string>(); const imgs: string[] = [];
            baseImages.forEach(img => { if (!seen.has(img)) { seen.add(img); imgs.push(img); } });
            const processedColors = new Set<string>();
            variants.forEach((v: any) => {
                const colorKey = v.color || `__no_color_${v.size}`;
                if (processedColors.has(colorKey)) return;
                processedColors.add(colorKey);
                (v.images || []).forEach((img: string) => { if (!seen.has(img)) { seen.add(img); imgs.push(img); } });
            });
            return imgs;
        }
        return baseImages;
    })();

    // Base-product offer respecting the validity window (offerStartDate/offerEndDate).
    // When the offer has expired or not yet started, the regular price is shown and no
    // discount applies. Variants carry their own pricing and are not gated by this window.
    const offerDisplay = getDisplayPrice(product);

    const discountedPrice = (() => {
        if (activeVariant) { return activeVariant.price; }
        // `price` IS the offer price the customer pays — don't re-apply discount on top of it.
        // Offer active → offer price (product.price); offer inactive → regular (original) price.
        return offerDisplay.currentPrice;
    })();

    const displayStock = activeVariant ? activeVariant.stock : product.stock;


    const productDetails: { key: string; value: string }[] = [];
    if (product.sku) productDetails.push({ key: 'Model', value: product.sku });
    if (product.brand) productDetails.push({ key: 'Brand', value: product.brand.toUpperCase() });
    if (product.specifications?.length > 0) product.specifications.forEach((spec: any) => productDetails.push({ key: spec.key, value: spec.value }));
    if (product.material?.length > 0) productDetails.push({ key: 'Material', value: product.material.join(', ') });
    if (product.weight && String(product.weight).trim()) productDetails.push({ key: 'Weight', value: String(product.weight) });
    if (product.colors?.length > 0) productDetails.push({ key: 'Color', value: product.colors.join(', ') });
    if (product.sizes?.length > 0) productDetails.push({ key: 'Size', value: product.sizes.join(', ') });
    if (productDetails.length === 0) {
        productDetails.push({ key: 'Category', value: product.category?.name || 'General' });
        productDetails.push({ key: 'Stock', value: product.stock > 0 ? `${product.stock} available` : 'Out of Stock' });
    }

    // Daraz-style key specifications (only rows with a value)
    const keySpecs: { label: string; value: string }[] = [];
    if (product.brand) keySpecs.push({ label: 'Brand', value: String(product.brand) });
    if (product.model) keySpecs.push({ label: 'Model', value: String(product.model) });
    if (product.weight) keySpecs.push({ label: 'Weight', value: `${product.weight}` });
    // Box Size as "Length × Width × Height cm" from dimensions; fall back to the
    // legacy free-text boxSize string when no real dimensions are set.
    const dims = product.dimensions || {};
    const dimL = Number(dims.length) || 0;
    const dimW = Number(dims.width) || 0;
    const dimH = Number(dims.height) || 0;
    const hasDimensions = dimL > 0 || dimW > 0 || dimH > 0;
    if (hasDimensions) {
        keySpecs.push({ label: 'Box Size', value: `${dimL} × ${dimW} × ${dimH} cm` });
    } else if (product.boxSize && String(product.boxSize).trim()) {
        keySpecs.push({ label: 'Box Size', value: String(product.boxSize) });
    }
    // "Inside the Box" may be a string or an array of items
    const insideTheBoxItems: string[] = Array.isArray(product.insideTheBox)
        ? product.insideTheBox.filter((x: any) => x && String(x).trim())
        : (product.insideTheBox && String(product.insideTheBox).trim() ? [String(product.insideTheBox)] : []);
    const hasSpecsSection = keySpecs.length > 0 || insideTheBoxItems.length > 0;

    const getColorHex = (colorName: string) => {
        const map: Record<string, string> = { red: '#FF0000', orange: '#FF8C00', yellow: '#FFD700', green: '#00C853', blue: '#2196F3', black: '#000000', white: '#FFFFFF', pink: '#FF69B4', purple: '#9C27B0', brown: '#795548', gray: '#9E9E9E', grey: '#9E9E9E', navy: '#001F3F', teal: '#009688', maroon: '#800000', olive: '#808000', cyan: '#00BCD4', lime: '#76FF03', coral: '#FF7F50', gold: '#FFD700', silver: '#C0C0C0', beige: '#F5F5DC', cream: '#FFFDD0', khaki: '#F0E68C' };
        return map[colorName.toLowerCase()] || colorName;
    };

    const handleColorSelect = (colorName: string) => {
        if (selectedColor === colorName) {
            setSelectedColor('');
            setSelectedImage(0);
            return;
        }
        setSelectedColor(colorName);
        if (selectedSize && hasVariants) {
            const sizesForNewColor = variants.filter((v: any) => v.color === colorName).map((v: any) => v.size).filter(Boolean);
            if (!sizesForNewColor.includes(selectedSize)) setSelectedSize('');
        }
        const colorImgs = colorImageMap[colorName];
        if (colorImgs?.length > 0) { const idx = allImages.indexOf(colorImgs[0]); if (idx >= 0) setSelectedImage(idx); }
    };

    const handleImageSelect = (imgIdx: number) => {
        setSelectedImage(imgIdx);
        const imgUrl = allImages[imgIdx];
        if (imgUrl && imageToColorMap[imgUrl]) setSelectedColor(imageToColorMap[imgUrl]);
    };

    const handleSizeSelect = (size: string) => {
        if (selectedSize === size) {
            setSelectedSize('');
            setSelectedImage(0);
            return;
        }
        setSelectedSize(size);
        if (hasVariants) {
            const matched = variants.find((v: any) => (!selectedColor || v.color === selectedColor) && v.size === size);
            if (matched?.images?.length > 0) {
                const idx = allImages.indexOf(matched.images[0]);
                if (idx >= 0) setSelectedImage(idx);
            }
        }
    };

    const handleChatNow = async () => {
        // Chatting requires an account — bounce to login and return to this product.
        if (!isAuthenticated) {
            const back = `/product/${Array.isArray(slug) ? slug[0] : slug}`;
            router.push(`/login?redirect=${encodeURIComponent(back)}`);
            return;
        }
        try {
            await startConversation({ type: 'customer-support' }).unwrap();
            router.push('/dashboard/user/messages?support=1');
        } catch (err) {
            console.error(err);
            // Last resort: still land in messages (support lane) instead of failing.
            router.push('/dashboard/user/messages?support=1');
        }
    };

    return (
        <>
            <div style={{ minHeight: '100vh', background: 'radial-gradient(55% 45% at 88% 0%, rgba(var(--color-primary-rgb), 0.06), transparent 70%), radial-gradient(45% 40% at 0% 22%, rgba(var(--color-primary-rgb), 0.04), transparent 70%), #F8FAFC' }}>
                <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-5">

                    {/* ── Fullscreen Modal ── */}
                    {isFullscreen && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                            onClick={() => { setIsFullscreen(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}>
                            <button onClick={() => { setIsFullscreen(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
                                style={{ position: 'absolute', top: '1rem', right: '1rem', width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                                <FiX size={22} />
                            </button>
                            {allImages.length > 1 && (
                                <div className="pd-zoom-thumbs" style={{ position: 'absolute', left: '11rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 10 }}>
                                    {allImages.map((img, idx) => (
                                        <button key={idx} onClick={(e) => { e.stopPropagation(); handleImageSelect(idx); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
                                            style={{ width: '56px', height: '56px', borderRadius: '6px', overflow: 'hidden', border: selectedImage === idx ? '2px solid #fff' : '2px solid rgba(255,255,255,0.2)', opacity: selectedImage === idx ? 1 : 0.6, cursor: 'pointer', background: 'transparent', padding: 0, transform: selectedImage === idx ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s ease' }}>
                                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => { if (selectedImage > 0) { setSelectedImage(p => p - 1); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); } }} disabled={selectedImage === 0}
                                    style={{ background: selectedImage === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', cursor: selectedImage === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: selectedImage === 0 ? 0.3 : 1 }}>
                                    <FiChevronLeft size={24} color="#fff" />
                                </button>
                                <div style={{ position: 'relative', width: 'min(92vh, 90vw)', height: 'min(92vh, 90vw)', flexShrink: 0, overflow: 'hidden', borderRadius: '6px' }}
                                    onMouseDown={(e) => { if (zoomLevel > 1) { e.preventDefault(); isDraggingRef.current = true; hasDraggedRef.current = false; dragStartRef.current = { x: e.clientX - panOffsetRef.current.x, y: e.clientY - panOffsetRef.current.y }; } }}
                                    onMouseMove={(e) => { if (isDraggingRef.current && zoomLevel > 1) { hasDraggedRef.current = true; const o = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }; panOffsetRef.current = o; setPanOffset({ ...o }); } }}
                                    onMouseUp={() => { isDraggingRef.current = false; }}
                                    onMouseLeave={() => { isDraggingRef.current = false; }}>
                                    <img src={allImages[selectedImage] || allImages[0]} alt={product.name} draggable={false}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px', transition: 'transform 0.1s ease', transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`, cursor: zoomLevel > 1 ? 'grab' : 'zoom-in', background: '#111', userSelect: 'none', transformOrigin: 'center center' }}
                                        onClick={(e) => { if (hasDraggedRef.current) { hasDraggedRef.current = false; return; } e.stopPropagation(); if (zoomLevel > 1) { setZoomLevel(1); const r = { x: 0, y: 0 }; panOffsetRef.current = r; setPanOffset(r); } else { setZoomLevel(1.8); } }}
                                        onWheel={(e) => { e.stopPropagation(); setZoomLevel(prev => { const n = Math.max(1, Math.min(2.5, prev + (e.deltaY < 0 ? 0.15 : -0.15))); if (n <= 1) { const r = { x: 0, y: 0 }; panOffsetRef.current = r; setPanOffset(r); } return n; }); }}
                                    />
                                    <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '13px', fontWeight: 600, background: 'rgba(0,0,0,0.55)', padding: '4px 14px', borderRadius: '20px', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                        {selectedImage + 1} / {allImages.length}
                                    </div>
                                </div>
                                <button onClick={() => { if (selectedImage < allImages.length - 1) { setSelectedImage(p => p + 1); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); } }} disabled={selectedImage === allImages.length - 1}
                                    style={{ background: selectedImage === allImages.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', cursor: selectedImage === allImages.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: selectedImage === allImages.length - 1 ? 0.3 : 1 }}>
                                    <FiChevronRight size={24} color="#fff" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Breadcrumb ── */}
                    <nav className="pd-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#9ca3af', padding: '4px 2px 10px', flexWrap: 'nowrap', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                        <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none', flexShrink: 0 }}>Home</Link>
                        {product.category?.name && (<>
                            <FiChevronRight size={12} style={{ flexShrink: 0, color: '#cbd5e1' }} />
                            <Link href={`/products?category=${product.category._id}`} style={{ color: '#9ca3af', textDecoration: 'none', flexShrink: 0 }}>{product.category.name}</Link>
                        </>)}
                        <FiChevronRight size={12} style={{ flexShrink: 0, color: '#cbd5e1' }} />
                        <span style={{ color: '#555', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{product.name?.slice(0, 45)}{product.name?.length > 45 ? '...' : ''}</span>
                    </nav>

                    {/* ── TOP: 3-column ── */}
                    <div className="pd-top-grid" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>

                        {/* ════ COLUMN 1 — Gallery (~40%) ════ */}
                        <div className="pd-col-gallery" style={{ flex: '0 0 40%', maxWidth: '40%', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            {/* Main Image */}
                            <div className="pd-image-wrapper" style={{ position: 'relative' }}>
                                <button onClick={(e) => { e.stopPropagation(); if (selectedImage > 0) setSelectedImage(p => p - 1); }}
                                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '50%', width: '30px', height: '30px', zIndex: 5, cursor: selectedImage === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', opacity: selectedImage === 0 ? 0.3 : 1 }}>
                                    <FiChevronLeft size={15} color="#333" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); if (selectedImage < allImages.length - 1) setSelectedImage(p => p + 1); }}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '50%', width: '30px', height: '30px', zIndex: 5, cursor: selectedImage >= allImages.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', opacity: selectedImage >= allImages.length - 1 ? 0.3 : 1 }}>
                                    <FiChevronRight size={15} color="#333" />
                                </button>
                                <div className="pd-main-image-box" style={{ width: '100%', aspectRatio: '1/1', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden', borderRadius: '6px', border: '1px solid #f0f0f0' }} onClick={() => setIsFullscreen(true)}>
                                    <img src={allImages[selectedImage] || allImages[0]} alt={product.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x600/f3f4f6/9ca3af?text=No+Image'; }}
                                    />
                                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'var(--color-primary)', borderRadius: '50%', padding: '7px', color: '#fff', opacity: 0, transition: 'opacity 0.3s' }} className="zoom-indicator">
                                        <FiZoomIn size={16} />
                                    </div>
                                    {(() => {
                                        const currentDiscount = activeVariant
                                            ? (activeVariant.discount || (activeVariant.originalPrice && activeVariant.originalPrice > discountedPrice ? Math.round(((activeVariant.originalPrice - discountedPrice) / activeVariant.originalPrice) * 100) : 0))
                                            : (offerDisplay.discount || (product.originalPrice && product.originalPrice > product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0));
                                        if (!currentDiscount || currentDiscount <= 0) return null;
                                        return (
                                            <div className="discount-badge" style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--color-primary)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px', zIndex: 2, opacity: 1, transition: 'opacity 0.3s' }}>
                                                -{currentDiscount}% Off
                                            </div>
                                        );
                                    })()}
                                    {product.stock <= 5 && product.stock > 0 && (
                                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#f59e0b', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px', zIndex: 2 }} className="animate-pulse">
                                            Only {product.stock} left!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Thumbnail strip BELOW with ‹ › scroll */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
                                <button onClick={() => scrollList(colorSwatchRef, 'up')} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '50%', cursor: 'pointer', padding: '4px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '26px', height: '26px' }}><FiChevronLeft size={15} /></button>
                                <div ref={colorSwatchRef} className="no-scrollbar pd-thumb-strip" style={{ display: 'flex', flexDirection: 'row', gap: '8px', overflowX: 'auto', overflowY: 'hidden', flex: 1, scrollBehavior: 'smooth' }}>
                                    {allImages.map((img: string, idx: number) => (
                                        <button key={idx} onClick={() => handleImageSelect(idx)} onMouseEnter={() => handleImageSelect(idx)}
                                            style={{ width: '60px', height: '60px', flexShrink: 0, border: selectedImage === idx ? '2px solid var(--color-primary)' : '2px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s ease', overflow: 'hidden', padding: 0, background: '#f5f5f5', boxShadow: selectedImage === idx ? '0 0 0 2px rgba(var(--color-primary-rgb), 0.15)' : 'none' }}>
                                            <img src={img} alt={`Product ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => scrollList(colorSwatchRef, 'down')} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '50%', cursor: 'pointer', padding: '4px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '26px', height: '26px' }}><FiChevronRight size={15} /></button>
                            </div>

                            {/* Share + Wishlist near gallery */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Share:</span>
                                <button onClick={() => { setShowSharePopup(true); if (product?._id) incrementStat({ id: product._id, field: 'shareCount' }); }} title="Share"
                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '12px', padding: 0 }}>
                                    <FiShare2 size={16} />
                                </button>
                                <button onClick={() => { if (typeof window !== 'undefined') { navigator.clipboard.writeText(window.location.href); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); } }} title="Copy link"
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: linkCopied ? 'var(--color-primary)' : '#6b7280', fontSize: '12px', padding: 0 }}>
                                    <FiCopy size={15} /> {linkCopied ? 'Copied!' : ''}
                                </button>
                                <button onClick={() => setShowDownloadModal(true)} title="Download images"
                                    style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
                                    <FiDownload size={15} />
                                </button>
                                <button onClick={() => product && toggleWishlistItem(product)} title="Add to wishlist"
                                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: isWishlisted ? '#ef4444' : '#6b7280', fontSize: '12px', padding: 0 }}>
                                    <FiHeart size={16} style={{ fill: isWishlisted ? '#ef4444' : 'none' }} /> Wishlist
                                </button>
                            </div>
                        </div>

                        {/* ════ COLUMN 2 — Buy box (~37%) ════ */}
                        <div className="pd-col-info" style={{ flex: '0 0 37%', maxWidth: '37%', minWidth: 0, overflow: 'hidden', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            {/* Title */}
                            <h1 className="pd-title" style={{ fontSize: '18px', fontWeight: 700, color: '#111', margin: '0 0 8px', lineHeight: 1.4, wordBreak: 'break-word' }}>{product.name}</h1>
                            {product.tagline && <p style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 500, margin: '0 0 8px', wordBreak: 'break-word' }}>{product.tagline}</p>}

                            {/* Product Description directly after title — formatted with rich text styles & collapsible */}
                            {(activeVariant?.description || product.description) && (
                                <div style={{ margin: '0 0 12px' }}>
                                    <div
                                        className="pd-title-description"
                                        style={{
                                            fontSize: '13px',
                                            color: '#374151',
                                            lineHeight: 1.6,
                                            width: '100%',
                                            maxWidth: '100%',
                                            minWidth: 0,
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word',
                                            maxHeight: titleDescExpanded ? 'none' : '90px',
                                            overflow: 'hidden',
                                            position: 'relative',
                                        }}
                                        dangerouslySetInnerHTML={{ __html: activeVariant?.description || product.description }}
                                    />
                                    {!titleDescExpanded && ((activeVariant?.description || product.description).length > 140 || ((activeVariant?.description || product.description).match(/<\/p>/g) || []).length > 2) && (
                                        <div style={{ height: '24px', marginTop: '-24px', background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.95))', position: 'relative', pointerEvents: 'none' }} />
                                    )}
                                    {((activeVariant?.description || product.description).length > 140 || ((activeVariant?.description || product.description).match(/<\/p>/g) || []).length > 2) && (
                                        <button
                                            type="button"
                                            onClick={() => setTitleDescExpanded(prev => !prev)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: '4px 0 0',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                color: 'var(--color-primary)',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                        >
                                            {titleDescExpanded ? (
                                                <>Show less <FiChevronUp size={13} /></>
                                            ) : (
                                                <>See more <FiChevronDown size={13} /></>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Rating row */}
                            <div className="pd-stats-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '13px', color: '#888', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6', marginBottom: '12px' }}>
                                <button onClick={() => setShowRatingModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '13px', padding: 0 }}>
                                    <div style={{ display: 'flex', gap: '1px' }}>{[1,2,3,4,5].map(s => <FiStar key={s} size={14} style={{ color: '#f59e0b', fill: s <= Math.round(product.rating || 0) ? '#f59e0b' : 'none' }} />)}</div>
                                    <span style={{ fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'underline' }}>({product.reviewCount || 0} Ratings)</span>
                                </button>
                                <span style={{ color: '#e5e7eb' }}>|</span>
                                <span>{product.soldCount || product.totalSold || 0} Sold</span>
                                <span style={{ color: '#e5e7eb' }}>|</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiEye size={13} /> {product.viewCount || 0}</span>
                                <button onClick={() => { if (!isLiked && product?._id) { incrementStat({ id: product._id, field: 'likeCount' }); setIsLiked(true); } }} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: isLiked ? '#ef4444' : '#888', fontSize: '13px', padding: 0, marginLeft: 'auto' }}>
                                    <FiShareSvg isLiked={isLiked} likeCount={product.likeCount || 0} />
                                </button>
                            </div>

                            {/* Brand line */}
                            <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                                Brand: <Link href={product.brand ? `/products?search=${encodeURIComponent(product.brand)}` : '/products'} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>{product.brand || 'No Brand'}</Link>
                            </div>

                            {/* PRICE block */}
                            {(() => {
                                const strikePrice = activeVariant
                                    ? (activeVariant.originalPrice && activeVariant.originalPrice > 0 && activeVariant.originalPrice !== discountedPrice ? activeVariant.originalPrice : undefined)
                                    : (offerDisplay.originalPrice || (product.originalPrice && product.originalPrice > discountedPrice ? product.originalPrice : undefined));
                                const offerDiscount = activeVariant
                                    ? (typeof activeVariant.discount === 'number'
                                        ? activeVariant.discount
                                        : (strikePrice && strikePrice > discountedPrice ? Math.round(((strikePrice - discountedPrice) / strikePrice) * 100) : 0))
                                    : (offerDisplay.discount || (strikePrice && strikePrice > discountedPrice ? Math.round(((strikePrice - discountedPrice) / strikePrice) * 100) : 0));
                                const showDiscountBadge = activeVariant
                                    ? (Boolean(strikePrice && strikePrice > 0) || (typeof activeVariant.discount === 'number' && activeVariant.discount >= 0))
                                    : offerDiscount > 0;
                                return (
                            <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #f3f4f6' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                                    <span className="pd-price" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
                                        ৳{discountedPrice.toLocaleString()}
                                    </span>
                                    {strikePrice && strikePrice > 0 && strikePrice !== discountedPrice && (
                                        <span style={{ fontSize: '15px', color: '#bbb', textDecoration: 'line-through' }}>৳{strikePrice.toLocaleString()}</span>
                                    )}
                                    {showDiscountBadge && (
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(var(--color-primary-rgb), 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            {offerDiscount > 0 ? `-${offerDiscount}%` : `${offerDiscount}%`}
                                        </span>
                                    )}
                                </div>
                                {/* Offer validity — only while a base-product offer is active and an end date is set */}
                                {!activeVariant && offerDisplay.offerActive && offerDisplay.offerEndDate && (
                                    <p style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <FiClock size={12} /> Offer valid till {offerDisplay.offerEndDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                )}
                                {/* Stock & SKU */}
                                <div style={{ display: 'flex', gap: '7px', marginTop: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: displayStock > 5 ? 'rgba(34,197,94,0.08)' : displayStock > 0 ? '#fffbeb' : '#fef2f2', color: displayStock > 5 ? '#16a34a' : displayStock > 0 ? '#d97706' : '#dc2626', border: `1px solid ${displayStock > 5 ? 'rgba(34,197,94,0.2)' : displayStock > 0 ? '#fde68a' : '#fecaca'}` }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                                        {displayStock > 5 ? 'In Stock' : displayStock > 0 ? `Only ${displayStock} left` : 'Out of Stock'}
                                    </span>
                                    {product.sku && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: '#f3f4f6', color: '#666' }}>SKU: {product.sku}</span>}
                                </div>
                            </div>
                                );
                            })()}

                            {/* Color Family */}
                            {colorSwatches.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>Color Family</span>
                                        {selectedColor && <span style={{ fontSize: '12px', color: '#111', fontWeight: 600 }}>{selectedColor}</span>}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {colorSwatches.map((color: any, idx: number) => {
                                            const isAvailable = availableColorsForSize.includes(color.name);
                                            const isSelected = selectedColor === color.name;
                                            return (
                                                <button key={idx} onClick={() => handleColorSelect(color.name)} title={color.name}
                                                    style={{ width: '30px', height: '30px', background: getColorHex(color.hex || color.name), border: isSelected ? '2.5px solid var(--color-primary)' : '2px solid #e0e0e0', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isSelected ? '0 0 0 2px rgba(var(--color-primary-rgb), 0.2)' : 'none', opacity: !isAvailable ? 0.45 : 1, position: 'relative', overflow: 'hidden', padding: 0, flexShrink: 0 }}>
                                                    {!isAvailable && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top right, transparent calc(50% - 1px), rgba(180,180,180,0.7) calc(50% - 1px), rgba(180,180,180,0.7) calc(50% + 1px), transparent calc(50% + 1px))', pointerEvents: 'none' }} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Size */}
                            {sizeList.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>Size</span>
                                        {selectedSize && <span style={{ fontSize: '12px', color: '#111', fontWeight: 600 }}>{selectedSize}</span>}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {sizeList.map((size: string, idx: number) => {
                                            const isAvailable = availableSizesForColor.includes(size);
                                            const isSelected = selectedSize === size;
                                            return (
                                                <button key={idx} onClick={() => isAvailable && handleSizeSelect(size)}
                                                    style={{ minWidth: '44px', height: '36px', padding: '0 12px', background: isSelected ? 'rgba(var(--color-primary-rgb), 0.08)' : !isAvailable ? '#f9fafb' : '#fff', color: isSelected ? 'var(--color-primary)' : !isAvailable ? '#ccc' : '#333', border: isSelected ? '2px solid var(--color-primary)' : !isAvailable ? '1px solid #eee' : '1px solid #d1d5db', borderRadius: '4px', cursor: !isAvailable ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !isAvailable ? 0.5 : 1 }}>
                                                    {size}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Quantity */}
                            <div style={{ marginBottom: '16px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#888', display: 'block', marginBottom: '8px' }}>Quantity</span>
                                <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
                                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: '36px', height: '38px', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}><FiMinus size={14} /></button>
                                    <span style={{ width: '46px', textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#111', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{quantity}</span>
                                    <button onClick={() => setQuantity(quantity + 1)} style={{ width: '36px', height: '38px', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}><FiPlus size={14} /></button>
                                </div>
                            </div>

                            {/* Buttons row: Buy Now (solid) + Add to Cart (outline) */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleBuyNow} disabled={displayStock === 0}
                                    style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: displayStock === 0 ? '#9ca3af' : 'var(--color-primary)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: displayStock === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px', transition: 'all 0.2s' }}>
                                    Buy Now
                                </button>
                                <button onClick={handleAddToCart} disabled={displayStock === 0}
                                    style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: addedToCart ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.08)', border: '1.5px solid var(--color-primary)', color: addedToCart ? '#fff' : 'var(--color-primary)', fontWeight: 700, fontSize: '14px', cursor: displayStock === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px', transition: 'all 0.2s', opacity: displayStock === 0 ? 0.5 : 1 }}>
                                    {addedToCart ? <FiCheckCircle size={15} /> : <FiShoppingCart size={15} />}
                                    {addedToCart ? 'Added!' : isInCart ? '✓ In Cart' : 'Add to Cart'}
                                </button>
                            </div>
                        </div>

                        {/* ════ COLUMN 3 — Delivery / Support (~23%) ════ */}
                        <div className="pd-col-delivery" style={{ flex: '0 0 23%', maxWidth: '23%', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            {/* Delivery Options */}
                            <div style={{ padding: '14px', borderBottom: '1px solid #f0f0f0' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#111', margin: '0 0 10px' }}>Delivery Options</p>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                    <FiMapPin size={15} style={{ color: '#6b7280', flexShrink: 0, marginTop: '1px' }} />
                                    <span style={{ fontSize: '12px', color: '#444', lineHeight: 1.4 }}>Dhaka, Bangladesh</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <FiTruck size={15} style={{ color: '#6b7280', flexShrink: 0, marginTop: '1px' }} />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#111', margin: 0 }}>Standard Delivery</p>
                                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>৳60 · Guaranteed in 3-5 days</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <FiDollarSign size={15} style={{ color: '#16a34a', flexShrink: 0, marginTop: '1px' }} />
                                    <span style={{ fontSize: '12px', color: '#444', lineHeight: 1.4 }}>Cash on Delivery Available</span>
                                </div>
                            </div>

                            {/* Return & Warranty */}
                            <div style={{ padding: '14px', borderBottom: '1px solid #f0f0f0' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#111', margin: '0 0 10px' }}>Return &amp; Warranty</p>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                                    <FiRefreshCw size={15} style={{ color: '#6b7280', flexShrink: 0, marginTop: '1px' }} />
                                    <span style={{ fontSize: '12px', color: '#444', lineHeight: 1.4 }}>14 Days Easy Return</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <FiShield size={15} style={{ color: '#6b7280', flexShrink: 0, marginTop: '1px' }} />
                                    <span style={{ fontSize: '12px', color: '#444', lineHeight: 1.4 }}>{product.termsInfo && String(product.termsInfo).trim() ? String(product.termsInfo) : 'Warranty not available'}</span>
                                </div>
                            </div>

                            {/* Support */}
                            <div style={{ padding: '14px' }}>
                                <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Need help?</p>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#111', margin: '0 0 12px' }}>Shohoz Kitchen</p>
                                <button onClick={handleChatNow} disabled={isStartingChat}
                                    style={{ width: '100%', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: '#fff', border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)', fontWeight: 600, fontSize: '12px', cursor: isStartingChat ? 'wait' : 'pointer', borderRadius: '4px', opacity: isStartingChat ? 0.7 : 1 }}>
                                    <FiMessageSquare size={13} /> {isStartingChat ? 'Opening...' : 'Chat Now'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ════ BELOW: Product details (full-width) ════ */}
                    <div style={{ marginTop: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111', margin: 0 }}>Product details of {product.name}</h2>
                        </div>
                        <div style={{ padding: '18px 22px', position: 'relative' }}>
                            <div style={{ maxHeight: detailsExpanded ? 'none' : '420px', overflow: 'hidden', position: 'relative' }}>
                                {/* ── Specifications (Daraz-style) ── */}
                                {hasSpecsSection && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <span style={{ width: '3px', height: '16px', background: 'var(--color-primary)', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
                                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', margin: 0 }}>Specifications</h3>
                                        </div>

                                        {keySpecs.length > 0 && (
                                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', marginBottom: insideTheBoxItems.length > 0 ? '16px' : 0 }}>
                                                {keySpecs.map((spec, i) => (
                                                    <div key={spec.label} style={{ display: 'flex', fontSize: '13px', borderBottom: i < keySpecs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                                        <span style={{ flex: '0 0 32%', padding: '10px 14px', background: '#f8f9fa', fontWeight: 600, color: '#555', borderRight: '1px solid #f0f0f0' }}>{spec.label}</span>
                                                        <span style={{ flex: 1, padding: '10px 14px', color: '#374151' }}>{spec.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Inside the Box */}
                                        {insideTheBoxItems.length > 0 && (
                                            <div>
                                                <p style={{ fontSize: '12px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>What's in the Box</p>
                                                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {insideTheBoxItems.map((item, i) => (
                                                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#444', lineHeight: 1.5 }}>
                                                            <FiCheckCircle size={14} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Description ── */}
                                {product.description ? (
                                    <div style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: product.description }} />
                                ) : (
                                    !hasSpecsSection && <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '20px 0' }}>No description available.</p>
                                )}

                                {/* fade overlay when collapsed */}
                                {!detailsExpanded && (
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '90px', background: 'linear-gradient(to bottom, rgba(255,255,255,0), #fff)', pointerEvents: 'none' }} />
                                )}
                            </div>
                            {(hasSpecsSection || product.description) && (
                                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                    <button onClick={() => setDetailsExpanded(v => !v)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fff', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', borderRadius: '4px', padding: '8px 28px' }}>
                                        {detailsExpanded ? 'VIEW LESS' : 'VIEW MORE'} {detailsExpanded ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ════ BELOW: Ratings & Reviews (full-width) ════ */}
                    <div id="pd-reviews" style={{ marginTop: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111', margin: 0 }}>Ratings &amp; Reviews of {product.name}</h2>
                        </div>
                        <div style={{ padding: '18px 22px' }}>
                            {/* Average + breakdown */}
                            {(() => {
                                const avg = reviews.length > 0 ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length : (product.rating || 0);
                                const totalCount = reviews.length || product.reviewCount || 0;
                                return (
                                    <div className="pd-rating-summary" style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '20px', paddingBottom: '18px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', justifyContent: 'center' }}>
                                                <span style={{ fontSize: '44px', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>{avg.toFixed(1)}</span>
                                                <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: 600 }}>/5</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '2px', marginTop: '7px', justifyContent: 'center' }}>
                                                {[1,2,3,4,5].map(s => <FiStar key={s} size={16} style={{ color: '#f59e0b', fill: s <= Math.round(avg) ? '#f59e0b' : 'none' }} />)}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{totalCount} Rating{totalCount !== 1 ? 's' : ''}</div>
                                        </div>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            {[5,4,3,2,1].map(star => {
                                                const count = reviews.length > 0
                                                    ? reviews.filter((r: any) => r.rating === star).length
                                                    : (product.ratingBreakdown?.[star] || 0);
                                                const denom = reviews.length || product.reviewCount || 1;
                                                const pct = (count / denom) * 100;
                                                return (
                                                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                                        <span style={{ fontSize: '12px', color: '#9ca3af', width: '10px' }}>{star}</span>
                                                        <FiStar size={12} style={{ color: '#f59e0b', fill: '#f59e0b', flexShrink: 0 }} />
                                                        <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '4px' }} />
                                                        </div>
                                                        <span style={{ fontSize: '12px', color: '#9ca3af', width: '24px', textAlign: 'right' }}>{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Write Review */}
                            {/* Write Review */}
                            <div style={{ marginBottom: '18px', padding: '16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '10px' }}>Write a Review</p>
                                {!isAuthenticated ? (
                                    <div style={{ textAlign: 'center', padding: '14px 0' }}>
                                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Please login to write a review</p>
                                        <button onClick={() => router.push('/login')} style={{ padding: '7px 20px', borderRadius: '6px', border: '2px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Login to Review</button>
                                    </div>
                                ) : canReviewInfo?.alreadyReviewed ? (
                                    <div style={{ textAlign: 'center', padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                                        <FiCheckCircle size={22} style={{ color: '#16a34a', margin: '0 auto 6px', display: 'block' }} />
                                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', margin: 0 }}>You have already reviewed this product</p>
                                        <p style={{ fontSize: '12px', color: '#166534', margin: '4px 0 0' }}>Thank you for sharing your feedback with other shoppers!</p>
                                    </div>
                                ) : canReviewInfo && !canReviewInfo.hasPurchased ? (
                                    <div style={{ textAlign: 'center', padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>
                                        <FiShield size={22} style={{ color: '#dc2626', margin: '0 auto 6px', display: 'block' }} />
                                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', margin: 0 }}>Verified Purchase Required</p>
                                        <p style={{ fontSize: '12px', color: '#b91c1c', margin: '4px 0 0' }}>Only customers who have bought and received this product can write a review.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '10px' }}>
                                            {[1,2,3,4,5].map(star => (
                                                <button key={star} type="button" onClick={() => setCmtRating(star)} onMouseEnter={() => setCmtHoverRating(star)} onMouseLeave={() => setCmtHoverRating(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                                    <FiStar size={22} style={{ color: '#f59e0b', fill: star <= (cmtHoverRating || cmtRating) ? '#f59e0b' : 'none', transition: 'fill 0.15s' }} />
                                                </button>
                                            ))}
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginLeft: '6px' }}>{cmtRating}/5</span>
                                        </div>
                                        <textarea value={cmtText} onChange={(e) => setCmtText(e.target.value)} placeholder="Share your experience with this product..." rows={3}
                                            style={{ width: '100%', padding: '9px 11px', border: '1.5px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', resize: 'vertical', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                                            {cmtSuccess && <span style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}><FiCheckCircle size={12} /> Review submitted successfully!</span>}
                                            <button onClick={async () => {
                                                if (!cmtText.trim()) return;
                                                setCmtSubmitting(true);
                                                try {
                                                    await createReviewMutation({ product: product._id, rating: cmtRating, comment: cmtText.trim() }).unwrap();
                                                    setCmtText('');
                                                    setCmtRating(5);
                                                    setCmtSuccess(true);
                                                    toast.success('Review submitted successfully! ✅');
                                                    setTimeout(() => setCmtSuccess(false), 3000);
                                                } catch (err: any) {
                                                    toast.error(err?.data?.message || 'Failed to submit review');
                                                } finally {
                                                    setCmtSubmitting(false);
                                                }
                                            }} disabled={cmtSubmitting || !cmtText.trim()}
                                                style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: '6px', border: 'none', background: cmtSubmitting || !cmtText.trim() ? '#e5e7eb' : 'var(--color-primary)', color: cmtSubmitting || !cmtText.trim() ? '#9ca3af' : '#fff', fontSize: '13px', fontWeight: 700, cursor: cmtSubmitting || !cmtText.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <FiSend size={12} /> {cmtSubmitting ? 'Submitting...' : 'Submit Review'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Review list */}
                            {reviews.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                    {reviews.map((r: any, i: number) => (
                                        <div key={i} style={{ padding: '16px 0', borderBottom: i < reviews.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                                                        {(r.userName || r.user?.firstName || 'A').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>{r.userName || `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || 'Anonymous'}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                                {[1,2,3,4,5].map(s => <FiStar key={s} size={11} style={{ color: s <= r.rating ? '#f59e0b' : '#d1d5db', fill: s <= r.rating ? '#f59e0b' : 'none' }} />)}
                                                            </div>
                                                            <span style={{ fontSize: '11px', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                                                <FiCheckCircle size={11} /> Verified Purchase
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                                            </div>
                                            {r.comment && <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.6, margin: '6px 0 0', paddingLeft: '44px' }}>{r.comment}</p>}
                                            {/* review images */}
                                            {r.images?.length > 0 && (
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingLeft: '44px', flexWrap: 'wrap' }}>
                                                    {r.images.map((img: string, ii: number) => (
                                                        <img key={ii} src={img} alt="review" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                                                    ))}
                                                </div>
                                            )}
                                            {/* store response */}
                                            {r.adminReply && (
                                                <div style={{ marginTop: '10px', marginLeft: '44px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '6px', borderLeft: '3px solid var(--color-primary)' }}>
                                                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 3px' }}>Store Response</p>
                                                    <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5, margin: 0 }}>{r.adminReply}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                    <FiStar size={28} style={{ color: '#e5e7eb', display: 'block', margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>No reviews yet</p>
                                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Be the first to review this product</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ════ BELOW: You may also like ════ */}
                    {relatedProducts.length > 0 && (
                        <div style={{ marginTop: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '3px', height: '16px', background: 'var(--color-primary)', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
                                        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111', margin: 0 }}>You may also like</h2>
                                    </div>
                                    {product?.category?.name && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', paddingLeft: '11px' }}>More from <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{product.category.name}</span></p>}
                                </div>
                                {product?.category?._id && (
                                    <Link href={`/products?category=${product.category._id}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(var(--color-primary-rgb), 0.08)', padding: '5px 12px', borderRadius: '9999px', textDecoration: 'none' }}>
                                        View All <FiChevronRight size={14} />
                                    </Link>
                                )}
                            </div>
                            <div className="pd-related-grid grid grid-cols-4 gap-2 overflow-hidden">
                                {relatedProducts.slice(0, 4).map((item: any) => (
                                    <NewProductCard key={item._id} product={{ id: item._id, slug: item.slug, name: item.name, image: item.thumbnail, price: item.price, originalPrice: item.originalPrice, mrp: item.originalPrice || item.price, discount: item.discount, offerStartDate: item.offerStartDate, offerEndDate: item.offerEndDate, rating: item.rating, reviews: item.reviewCount, categoryName: item.category?.name || product?.category?.name, priceType: item.priceType, likeCount: item.likeCount || 0, commentCount: item.commentCount || 0, shareCount: item.shareCount || 0, viewCount: item.viewCount || 0, reviewCount: item.reviewCount || 0 }} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Rating Modal ── */}
                    {showRatingModal && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowRatingModal(false)}>
                            <div style={{ background: '#fff', borderRadius: '6px', maxWidth: '480px', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '22px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setShowRatingModal(false)} style={{ position: 'absolute', top: '12px', right: '12px', width: '30px', height: '30px', borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FiX size={15} />
                                </button>
                                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 14px', color: '#111' }}>Ratings & Reviews</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', padding: '14px', background: '#f9fafb', borderRadius: '6px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '34px', fontWeight: 800, color: '#111' }}>{product.rating?.toFixed(1) || '0.0'}</div>
                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '4px' }}>
                                            {[1,2,3,4,5].map(star => <FiStar key={star} size={13} style={{ color: '#f59e0b', fill: star <= Math.round(product.rating || 0) ? '#f59e0b' : 'none' }} />)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>{product.reviewCount || 0} ratings</div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {[5,4,3,2,1].map(star => {
                                            const count = product.ratingBreakdown?.[star] || 0;
                                            const pct = Math.round((count / (product.reviewCount || 1)) * 100);
                                            return (
                                                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px' }}>
                                                    <span style={{ width: '12px', fontWeight: 600, color: '#555' }}>{star}</span>
                                                    <FiStar size={10} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                                    <div style={{ flex: 1, height: '7px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ width: '28px', textAlign: 'right', color: '#9ca3af', fontSize: '11px' }}>{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(product.reviews && product.reviews.length > 0) ? product.reviews.map((review: any, idx: number) => (
                                        <div key={idx} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                                            <div style={{ display: 'flex', gap: '2px', marginBottom: '5px' }}>
                                                {[1,2,3,4,5].map(star => <FiStar key={star} size={10} style={{ color: '#f59e0b', fill: star <= (review.rating || 0) ? '#f59e0b' : 'none' }} />)}
                                            </div>
                                            {review.comment && <p style={{ fontSize: '12px', color: '#555', margin: 0, lineHeight: 1.6 }}>{review.comment}</p>}
                                        </div>
                                    )) : (
                                        <div style={{ textAlign: 'center', padding: '18px', color: '#9ca3af', fontSize: '13px' }}>No reviews yet. Be the first to review!</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <style>{`
                div:hover > .zoom-indicator { opacity: 1 !important; }
                div:hover > .discount-badge { opacity: 1 !important; }
                .pd-thumb-strip::-webkit-scrollbar { display: none; }
                .pd-thumb-strip { -ms-overflow-style: none; scrollbar-width: none; }
                .pd-breadcrumb::-webkit-scrollbar { display: none; }

                /* Rich Description Styling — matches Quill input field */
                .pd-title-description {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    overflow-wrap: break-word;
                    word-break: break-word;
                }
                .pd-title-description * {
                    max-width: 100%;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    box-sizing: border-box;
                }
                .pd-title-description p {
                    margin: 0 0 6px 0;
                    line-height: 1.6;
                    display: block;
                }
                .pd-title-description p:last-child {
                    margin-bottom: 0;
                }
                .pd-title-description strong, .pd-title-description b {
                    font-weight: 700;
                    color: #111827;
                }
                .pd-title-description em, .pd-title-description i {
                    font-style: italic;
                }
                .pd-title-description u {
                    text-decoration: underline;
                }
                .pd-title-description s, .pd-title-description strike {
                    text-decoration: line-through;
                }
                .pd-title-description ul {
                    list-style-type: disc;
                    padding-left: 20px;
                    margin: 6px 0;
                }
                .pd-title-description ol {
                    list-style-type: decimal;
                    padding-left: 20px;
                    margin: 6px 0;
                }
                .pd-title-description li {
                    margin-bottom: 3px;
                }
                .pd-title-description a {
                    color: var(--color-primary);
                    text-decoration: underline;
                }
                .pd-title-description blockquote {
                    border-left: 3px solid #e5e7eb;
                    padding-left: 12px;
                    margin: 8px 0;
                    color: #6b7280;
                    font-style: italic;
                }
                .pd-title-description img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 4px;
                }
                .pd-title-description table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 8px 0;
                }
                .pd-title-description td, .pd-title-description th {
                    border: 1px solid #e5e7eb;
                    padding: 6px 8px;
                    font-size: 12px;
                }
                .pd-title-description .ql-align-center { text-align: center; }
                .pd-title-description .ql-align-right { text-align: right; }
                .pd-title-description .ql-align-justify { text-align: justify; }
                .pd-title-description .ql-size-small { font-size: 11px; }
                .pd-title-description .ql-size-large { font-size: 16px; }
                .pd-title-description .ql-size-huge { font-size: 20px; }

                /* Tablet: gallery on top, info + delivery side-by-side */
                @media (max-width: 1023px) {
                    .pd-top-grid { flex-wrap: wrap !important; }
                    .pd-col-gallery { flex: 0 0 100% !important; max-width: 100% !important; }
                    .pd-col-info { flex: 1 1 55% !important; max-width: none !important; }
                    .pd-col-delivery { flex: 1 1 40% !important; max-width: none !important; }
                }
                /* Mobile: full stack */
                @media (max-width: 767px) {
                    .pd-top-grid { flex-direction: column !important; gap: 10px !important; }
                    .pd-col-gallery, .pd-col-info, .pd-col-delivery { flex: 0 0 100% !important; max-width: 100% !important; width: 100% !important; }
                    .pd-breadcrumb { font-size: 11px !important; gap: 4px !important; -ms-overflow-style: none !important; scrollbar-width: none !important; }
                    .pd-stats-row { gap: 8px !important; flex-wrap: wrap !important; font-size: 12px !important; }
                    .pd-related-grid { grid-template-columns: repeat(2, 1fr) !important; }
                    .pd-title { font-size: 16px !important; }
                    .pd-price { font-size: 22px !important; }
                    .pd-rating-summary { gap: 18px !important; }
                    .pd-zoom-thumbs { display: none !important; }
                }
                @media (max-width: 480px) {
                    .pd-rating-summary { flex-direction: column !important; align-items: stretch !important; }
                }
            `}</style>

                    {/* ── Share Popup ── */}
                    {showSharePopup && (() => {
                        const productUrl = typeof window !== 'undefined' ? window.location.href : '';
                        const shareText = `${product.name} - Tk.${product.price}`;
                        const shareLinks = [
                            { name: 'Facebook', icon: FaFacebookF, color: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(shareText)}` },
                            { name: 'WhatsApp', icon: FaWhatsapp, color: '#25D366', url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + productUrl)}` },
                            { name: 'Messenger', icon: FaFacebookMessenger, color: '#0078FF', url: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(productUrl)}&app_id=966242223397117&redirect_uri=${encodeURIComponent(productUrl)}` },
                            { name: 'X', icon: FaXTwitter, color: '#000000', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}` },
                            { name: 'Telegram', icon: FaTelegramPlane, color: '#0088cc', url: `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}` },
                            { name: 'LinkedIn', icon: FaLinkedinIn, color: '#0A66C2', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}` },
                            { name: 'Pinterest', icon: FaPinterestP, color: '#E60023', url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(productUrl)}&media=${encodeURIComponent(allImages[0])}&description=${encodeURIComponent(shareText)}` },
                            { name: 'Instagram', icon: FaInstagram, color: '#E1306C', url: `https://www.instagram.com/` },
                            { name: 'TikTok', icon: FaTiktok, color: '#000000', url: `https://www.tiktok.com/` },
                            { name: 'Email', icon: FaEnvelope, color: '#555555', url: `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(shareText + '\n\n' + productUrl)}` },
                        ];
                        return (
                            <div className='fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4' onClick={() => setShowSharePopup(false)}>
                                <div className='bg-white rounded-md w-full max-w-[600px] max-h-[88vh] flex flex-col overflow-hidden shadow-2xl' onClick={(e) => e.stopPropagation()}>
                                    <div className='flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0'>
                                        <h3 className='text-[15px] font-bold text-gray-900 truncate pr-4'>{product.name}</h3>
                                        <button onClick={() => setShowSharePopup(false)} className='w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 shrink-0'><FiX size={18} /></button>
                                    </div>
                                    <div className='shrink-0 border-b border-gray-200'>
                                        <div className='w-full bg-gray-50 flex items-center justify-center' style={{ maxHeight: '240px' }}>
                                            <img src={allImages[0]} alt={product.name} className='w-full object-contain' style={{ maxHeight: '240px' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x200/f3f4f6/9ca3af?text=No+Image'; }} />
                                        </div>
                                    </div>
                                    <div className='px-4 pt-3 pb-1'><p className='text-[13px] font-bold text-gray-900'>Share With</p></div>
                                    <div className='px-4 py-2 overflow-y-auto flex-1'>
                                        <div className='grid grid-cols-5 gap-3'>
                                            {shareLinks.map((link) => (
                                                <a key={link.name} href={link.url} target='_blank' rel='noopener noreferrer' className='flex flex-col items-center gap-1.5 py-2 rounded-md hover:bg-gray-50 transition-colors'>
                                                    <div className='w-10 h-10 rounded-full flex items-center justify-center text-white' style={{ background: link.color }}>
                                                        <link.icon size={16} />
                                                    </div>
                                                    <span className='text-[10px] text-gray-500 font-medium'>{link.name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                    <div className='px-4 py-3 border-t border-gray-100 shrink-0'>
                                        <div className='flex items-center bg-gray-100 rounded-md overflow-hidden'>
                                            <input type='text' value={productUrl} readOnly className='flex-1 bg-transparent text-xs text-gray-600 outline-none px-3 py-2.5 truncate' />
                                            <button onClick={() => { navigator.clipboard.writeText(productUrl); setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2000); }} className='px-4 py-2.5 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap' style={{ background: 'var(--color-primary)' }}>
                                                {shareLinkCopied ? <><FiCheckCircle size={12} /> Copied!</> : <><FiCopy size={12} /> Copy</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Comments Modal ── */}
                    {showCommentsModal && product && (
                        <CommentsPopup productId={product._id} productName={product.name} productImage={allImages[0]} onClose={() => setShowCommentsModal(false)} />
                    )}

                    {/* ── Download Modal ── */}
                    {showDownloadModal && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setShowDownloadModal(false)}>
                            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '6px', padding: '20px', maxWidth: '560px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <FiDownload size={15} /> Download Images
                                    </h3>
                                    <button onClick={() => setShowDownloadModal(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX size={15} /></button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {allImages.map((img: string, idx: number) => (
                                        <div key={idx} onClick={async () => { try { const res = await fetch(img); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${product.name || 'product'}-image-${idx + 1}.jpg`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } catch { window.open(img, '_blank'); } }}
                                            style={{ aspectRatio: '1/1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: '2px solid #e5e7eb', position: 'relative', transition: 'all 0.2s' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; (e.currentTarget.querySelector('.dl-overlay') as HTMLElement).style.opacity = '1'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; (e.currentTarget.querySelector('.dl-overlay') as HTMLElement).style.opacity = '0'; }}>
                                            <img src={img} alt={`Image ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div className="dl-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(var(--color-primary-rgb), 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                                                <FiDownload size={22} color="#fff" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Inquiry Modal ── */}
                    {showInquiryModal && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => { setShowInquiryModal(false); setInquirySuccess(false); }}>
                            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '6px', padding: '20px', maxWidth: '460px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: '7px' }}><FiMessageSquare size={15} /> Send Inquiry</h3>
                                    <button onClick={() => { setShowInquiryModal(false); setInquirySuccess(false); }} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX size={15} /></button>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', padding: '10px', background: '#f9fafb', borderRadius: '6px', marginBottom: '14px' }}>
                                    <img src={product.thumbnail} alt={product.name} style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#111', margin: '0 0 3px', lineHeight: 1.3 }}>{product.name}</p>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>৳{discountedPrice.toLocaleString()}</p>
                                    </div>
                                </div>
                                {inquirySuccess ? (
                                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                        <FiCheckCircle size={44} color="var(--color-primary)" style={{ display: 'block', margin: '0 auto 10px' }} />
                                        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>Inquiry Sent!</p>
                                        <p style={{ fontSize: '13px', color: '#6b7280' }}>{"We'll get back to you soon."}</p>
                                    </div>
                                ) : (
                                    <form onSubmit={async (e) => { e.preventDefault(); if (!inquiryName.trim() || !inquiryContact.trim() || !inquiryPhone.trim() || !inquiryMessage.trim()) return; setInquirySubmitting(true); try { await createInquiry({ product: product._id, name: inquiryName.trim(), phone: inquiryPhone.trim(), email: inquiryContact.trim(), message: inquiryMessage.trim() }).unwrap(); setInquirySuccess(true); setInquiryName(''); setInquiryContact(''); setInquiryPhone(''); setInquiryMessage(''); } catch (err) { console.error(err); } finally { setInquirySubmitting(false); } }}>
                                        {[
                                            { label: 'Your Name *', value: inquiryName, setter: setInquiryName, type: 'text', placeholder: 'Enter your name' },
                                            { label: 'Email Address *', value: inquiryContact, setter: setInquiryContact, type: 'email', placeholder: 'name@example.com' },
                                            { label: 'Phone Number *', value: inquiryPhone, setter: setInquiryPhone, type: 'tel', placeholder: '01XXXXXXXXX' },
                                        ].map(({ label, value, setter, type, placeholder }) => (
                                            <div key={label} style={{ marginBottom: '10px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', display: 'block', marginBottom: '4px' }}>{label}</label>
                                                <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} required type={type}
                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #e5e7eb', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                                />
                                            </div>
                                        ))}
                                        <div style={{ marginBottom: '14px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', display: 'block', marginBottom: '4px' }}>Your Query *</label>
                                            <textarea value={inquiryMessage} onChange={(e) => setInquiryMessage(e.target.value)} placeholder="Write your question..." required rows={4}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #e5e7eb', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                            />
                                        </div>
                                        <button type="submit" disabled={inquirySubmitting}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: inquirySubmitting ? 0.7 : 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {inquirySubmitting ? 'Submitting...' : 'Submit Inquiry'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function FiShareSvg({ isLiked, likeCount }: { isLiked: boolean; likeCount: number }) {
    return (
        <>
            <FiHeart size={14} style={{ fill: isLiked ? '#ef4444' : 'none' }} />
            <span>{likeCount}</span>
        </>
    );
}
