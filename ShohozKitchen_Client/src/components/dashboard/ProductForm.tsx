/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <div className="h-[300px] bg-gray-50 border border-gray-200 rounded-md animate-pulse" /> });
import 'react-quill-new/dist/quill.snow.css';
import Link from 'next/link';
import { SingleImageUploader, MultipleImageUploader } from '@/components/ui/ImageUploader';
import {
    FiArrowLeft, FiSave, FiImage, FiX, FiPlus, FiInfo,
    FiSettings, FiDollarSign, FiTag, FiShield, FiTruck,
    FiList, FiGlobe, FiTrash2, FiBox, FiCheckCircle,
    FiDroplet, FiFileText, FiPercent
} from 'react-icons/fi';
import {
    useCreateProductMutation,
    useUpdateProductMutation,
    useGetProductByIdQuery
} from '@/redux/api/productApi';
import { useGetCategoriesQuery } from '@/redux/api/categoryApi';
import { toast } from 'react-hot-toast';

// ── Toggle Switch Component ──────────────────────────────────
const Toggle = ({ label, name, checked, onChange, color = 'bg-emerald-500' }: any) => (
    <label className="flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-md transition-all border border-gray-100 cursor-pointer group">
        <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-900">{label}</span>
        <div className="relative">
            <input type="checkbox" name={name} className="sr-only" checked={checked} onChange={onChange} />
            <div className={`w-11 h-6 rounded-full transition-colors ${checked ? color : 'bg-gray-200'}`}></div>
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all ${checked ? 'translate-x-5' : ''}`}></div>
        </div>
    </label>
);

// ── Input Component ──────────────────────────────────────────
const Input = ({ label, required, error, ...props }: any) => (
    <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">{label} {required && <span className="text-red-400">*</span>}</label>
        <input className={`w-full px-4 py-2.5 bg-white border rounded-md outline-none focus:ring-1 transition-all text-sm ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50/30' : 'border-gray-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/10'}`} {...props} />
        {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1">⚠ {error}</p>}
    </div>
);

// ── Section Header Component ──────────────────────────────────
const SectionHeader = ({ icon, title, color = 'bg-blue-50 text-blue-600' }: any) => (
    <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${color}`}>{icon}</div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
);

const ProductFormInner = ({ productId: propProductId }: { productId?: string }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productId = propProductId || searchParams.get('id');
    const isEditing = !!productId;
    const listHref = '/dashboard/admin/products';

    const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
    const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
    const { data: productToEdit, isLoading, isFetching } = useGetProductByIdQuery(productId, {
        skip: !isEditing,
        refetchOnMountOrArgChange: true,
    });
    const { data: categoriesData } = useGetCategoriesQuery({});

    const [isDataLoaded, setIsDataLoaded] = useState(!isEditing);

    useEffect(() => {
        if (isEditing) {
            setIsDataLoaded(false);
        }
    }, [productId, isEditing]);

    const [formData, setFormData] = useState<any>({
        // Basic
        name: '', slug: '', sku: '', brand: '', model: '',
        description: '', tagline: '',
        productType: 'simple',
        // Pricing — numeric fields start EMPTY ('') so inputs aren't stuck at 0
        price: '', originalPrice: '', discount: 0,
        // Offer window
        offerStartDate: '', offerEndDate: '',
        // Media
        thumbnail: '', images: [],
        // Organization
        category: '', subCategory: '', childCategory: '',
        // Specs (new)
        insideTheBox: '',
        // Stock
        stock: '', lowStockThreshold: '', unit: 'piece',
        // Status
        status: 'active', visibility: 'visible',
        isFeatured: false, isNewProduct: true, isOnSale: false,
        // Visual variants
        colors: [], colorHex: [], sizes: [], material: [],
        variants: [],
        pattern: '', gender: '',
        // Tags & AI
        tags: [], aiLabels: [],
        // Specs & Highlights
        specifications: [], highlights: [],
        // Physical
        weight: '',
        dimensions: { length: '', width: '', height: '' },
        // Shipping & Warranty
        shippingConfig: { freeShipping: false, shippingCost: 0, estimatedDays: 3 },
        warranty: { hasWarranty: false, duration: 0, durationUnit: 'months', type: 'manufacturer' },
        // SEO
        metaTitle: '', metaDescription: '', metaKeywords: [],
    });

    // ── Validation Errors State ──
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Clear specific field error when user types
    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
        }
    };

    // Populate form if editing
    useEffect(() => {
        if (isEditing && productToEdit?.data) {
            const prod = productToEdit.data;
            // Format an ISO/Date value to yyyy-mm-dd for <input type="date">
            const toDateInput = (d: any) => {
                if (!d) return '';
                const dt = new Date(d);
                return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
            };
            setFormData((prev: any) => ({
                ...prev,
                ...prod,
                description: prod.description || '',
                category: prod.category?._id || prod.category || '',
                subCategory: prod.subCategory?._id || prod.subCategory || '',
                childCategory: prod.childCategory?._id || prod.childCategory || '',
                brand: prod.brand || '',
                model: prod.model || '',
                weight: prod.weight ?? '',
                price: prod.price ?? '',
                originalPrice: prod.originalPrice ?? '',
                stock: prod.stock ?? '',
                lowStockThreshold: prod.lowStockThreshold ?? '',
                offerStartDate: toDateInput(prod.offerStartDate),
                offerEndDate: toDateInput(prod.offerEndDate),
                insideTheBox: prod.insideTheBox || '',
                warranty: prod.warranty || prev.warranty,
                shippingConfig: prod.shippingConfig || prev.shippingConfig,
                dimensions: prod.dimensions
                    ? {
                        length: prod.dimensions.length ?? '',
                        width: prod.dimensions.width ?? '',
                        height: prod.dimensions.height ?? '',
                    }
                    : prev.dimensions,
                specifications: prod.specifications || [],
                highlights: prod.highlights || [],
                tags: prod.tags || [],
                colors: prod.colors || [],
                colorHex: prod.colorHex || [],
                sizes: prod.sizes || [],
                material: prod.material || [],
                variants: prod.variants || [],
                aiLabels: prod.aiLabels || [],
                productType: prod.productType || 'simple',
                metaKeywords: prod.metaKeywords || [],
                images: prod.images || [],
            }));
            setIsDataLoaded(true);
        }
    }, [isEditing, productToEdit]);

    // Auto-calculate discount (price fields are kept as raw strings → parse them)
    useEffect(() => {
        const price = parseFloat(formData.price);
        const original = parseFloat(formData.originalPrice);
        if (!isNaN(price) && !isNaN(original) && original > 0 && price > 0 && original > price) {
            const disc = Math.round(((original - price) / original) * 100);
            setFormData((prev: any) => ({ ...prev, discount: disc }));
        } else {
            setFormData((prev: any) => (prev.discount === 0 ? prev : { ...prev, discount: 0 }));
        }
    }, [formData.price, formData.originalPrice]);

    // Auto-generate slug
    useEffect(() => {
        if (!isEditing && formData.name) {
            const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            setFormData((prev: any) => ({ ...prev, slug }));
        }
    }, [formData.name, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        clearError(name);

        // NOTE: numeric inputs keep their RAW string value in state (do NOT coerce to
        // Number on every keystroke) so that clearing an input yields '' instead of a
        // stuck 0. Conversion to Number happens once in handleSubmit when building the payload.
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData((prev: any) => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: type === 'checkbox' ? checked : value }
            }));
        } else {
            setFormData((prev: any) => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    // Array field handlers (comma-separated)
    const handleArrayChange = (name: string, value: string) => {
        const arr = value.split(',').map(s => s.trim()).filter(s => s !== '');
        setFormData((prev: any) => ({ ...prev, [name]: arr }));
    };

    // Images (newline-separated)
    const handleImagesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const urls = e.target.value.split('\n').map(u => u.trim()).filter(u => u !== '');
        setFormData((prev: any) => ({ ...prev, images: urls }));
    };

    // Specifications
    const handleSpecChange = (idx: number, field: string, value: string) => {
        const specs = [...formData.specifications];
        specs[idx] = { ...specs[idx], [field]: value };
        setFormData((prev: any) => ({ ...prev, specifications: specs }));
    };
    const addSpec = () => setFormData((prev: any) => ({ ...prev, specifications: [...prev.specifications, { key: '', value: '' }] }));
    const removeSpec = (idx: number) => {
        const specs = [...formData.specifications]; specs.splice(idx, 1);
        setFormData((prev: any) => ({ ...prev, specifications: specs }));
    };

    // Highlights
    const handleHighlightChange = (idx: number, value: string) => {
        const hl = [...formData.highlights]; hl[idx] = value;
        setFormData((prev: any) => ({ ...prev, highlights: hl }));
    };
    const addHighlight = () => setFormData((prev: any) => ({ ...prev, highlights: [...prev.highlights, ''] }));
    const removeHighlight = (idx: number) => {
        const hl = [...formData.highlights]; hl.splice(idx, 1);
        setFormData((prev: any) => ({ ...prev, highlights: hl }));
    };

    // ── Validation ──
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Required fields
        if (!formData.name || formData.name.trim().length === 0) {
            newErrors.name = 'Product name is required';
        } else if (formData.name.trim().length < 3) {
            newErrors.name = 'Product name must be at least 3 characters';
        } else if (formData.name.length > 200) {
            newErrors.name = 'Product name cannot exceed 200 characters';
        }

        if (!formData.description || formData.description.replace(/<[^>]*>/g, '').trim().length === 0) {
            newErrors.description = 'Product description is required';
        }

        if (!formData.category) {
            newErrors.category = 'Please select a category';
        }

        const priceNum = parseFloat(formData.price);
        const originalPriceNum = parseFloat(formData.originalPrice);

        if (isNaN(priceNum) || priceNum <= 0) {
            newErrors.price = 'Offer price must be greater than 0';
        }

        if (!isNaN(originalPriceNum) && originalPriceNum > 0 && !isNaN(priceNum) && originalPriceNum < priceNum) {
            newErrors.originalPrice = 'Original price should be higher than offer price';
        }

        if (!formData.thumbnail || formData.thumbnail.trim().length === 0) {
            newErrors.thumbnail = 'Product thumbnail image is required';
        }

        // Min 3 images: thumbnail counts as 1, gallery must supply at least 2 more
        const allImages = [formData.thumbnail, ...(formData.images || [])]
            .map((u: string) => (u || '').trim())
            .filter((u: string) => u !== '');
        if (allImages.length < 3) {
            newErrors.images = 'At least 3 images are required (thumbnail + 2 more)';
        }

        if (formData.tagline && formData.tagline.length > 200) {
            newErrors.tagline = 'Tagline cannot exceed 200 characters';
        }

        const stockNum = parseFloat(formData.stock);
        if (!isNaN(stockNum) && stockNum < 0) {
            newErrors.stock = 'Stock cannot be negative';
        }

        // Variant validation
        if (formData.productType !== 'simple' && formData.variants?.length > 0) {
            formData.variants.forEach((v: any, i: number) => {
                if (!v.price || v.price <= 0) {
                    newErrors[`variant_${i}_price`] = `Variant #${i + 1} (${v.color || ''} ${v.size || ''}) price is required`;
                }
                if (v.stock < 0) {
                    newErrors[`variant_${i}_stock`] = `Variant #${i + 1} stock cannot be negative`;
                }
            });
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            // Scroll to first error
            const firstErrorField = Object.keys(newErrors)[0];
            const el = document.querySelector(`[name="${firstErrorField}"], [data-field="${firstErrorField}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the errors below', {
                icon: '⚠️',
                style: { borderRadius: '8px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' },
            });
            return;
        }

        try {
            const payload = { ...formData };
            if (!payload.subCategory) delete payload.subCategory;
            if (!payload.childCategory) delete payload.childCategory;

            // ── Convert raw string numeric fields → Number (no NaN leaks into payload) ──
            // Required number (price): empty → 0 (validation already guards > 0).
            const toRequiredNum = (v: any) => {
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };
            // Optional number: empty → undefined so the field is omitted/cleared.
            const toOptionalNum = (v: any) => {
                if (v === '' || v === undefined || v === null) return undefined;
                const n = parseFloat(v);
                return isNaN(n) ? undefined : n;
            };

            payload.price = toRequiredNum(formData.price);
            payload.originalPrice = toOptionalNum(formData.originalPrice);
            payload.stock = toOptionalNum(formData.stock) ?? 0;
            payload.lowStockThreshold = toOptionalNum(formData.lowStockThreshold) ?? 5;
            payload.dimensions = {
                length: toOptionalNum(formData.dimensions?.length) ?? 0,
                width: toOptionalNum(formData.dimensions?.width) ?? 0,
                height: toOptionalNum(formData.dimensions?.height) ?? 0,
            };

            payload.shippingConfig = {
                freeShipping: Boolean(formData.shippingConfig?.freeShipping),
                shippingCost: toOptionalNum(formData.shippingConfig?.shippingCost) ?? 0,
                estimatedDays: toOptionalNum(formData.shippingConfig?.estimatedDays) ?? 3,
            };

            if (formData.warranty) {
                payload.warranty = {
                    ...formData.warranty,
                    hasWarranty: Boolean(formData.warranty.hasWarranty),
                    duration: toOptionalNum(formData.warranty.duration) ?? 0,
                };
            }

            // The form no longer captures cost price — never send it.
            delete payload.costPrice;

            // Offer window dates — send as-is (yyyy-mm-dd) or undefined when empty.
            payload.offerStartDate = formData.offerStartDate || undefined;
            payload.offerEndDate = formData.offerEndDate || undefined;

            // Backend stores weight as a string (units allowed e.g. "500 g")
            payload.weight = formData.weight === '' || formData.weight === undefined || formData.weight === null
                ? ''
                : String(formData.weight);

            // Explicit boolean casting for visibility & promotion flags
            payload.isNewProduct = Boolean(formData.isNewProduct);
            payload.isFeatured = Boolean(formData.isFeatured);
            payload.isOnSale = Boolean(formData.isOnSale);


            if (isEditing) {
                await updateProduct({ id: productId, data: payload }).unwrap();
                toast.success('Product updated successfully! ✅');
            } else {
                await createProduct(payload).unwrap();
                toast.success('Product created successfully! ✅');
            }
            router.push(listHref);
        } catch (error: any) {
            // Map backend 400 { errorMessages:[{ path, message }] } onto inline field errors
            const errorMessages = error?.data?.errorMessages;
            if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                const mapped: Record<string, string> = {};
                errorMessages.forEach((em: { path?: string; message?: string }) => {
                    if (em?.path && em?.message) mapped[em.path] = em.message;
                });
                if (Object.keys(mapped).length > 0) {
                    setErrors((prev) => ({ ...prev, ...mapped }));
                    const first = errorMessages[0];
                    const el = document.querySelector(`[name="${first.path}"], [data-field="${first.path}"]`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                toast.error(errorMessages[0]?.message || error?.data?.message || 'Please fix the errors below');
            } else {
                toast.error(error?.data?.message || 'Something went wrong');
            }
        }
    };

    if (isEditing && isFetching) return <div className="p-20 text-center text-[var(--color-primary)] font-bold animate-pulse">Loading product data...</div>;

    const allCategories = categoriesData?.data || [];
    // Parent (root) categories only — those without a parent
    const categories = allCategories.filter((c: any) => {
        const pid = c.parent?._id || c.parent;
        return !pid;
    });
    // Sub-categories of the currently selected category (Level 1)
    const subCategories = formData.category
        ? allCategories.filter((c: any) => {
            const pid = c.parent?._id || c.parent;
            return pid && String(pid) === String(formData.category);
        })
        : [];
    // Child categories of the currently selected subCategory (Level 2)
    const childCategories = formData.subCategory
        ? allCategories.filter((c: any) => {
            const pid = c.parent?._id || c.parent;
            return pid && String(pid) === String(formData.subCategory);
        })
        : [];

    const selectedCategoryObj = categories.find((c: any) => String(c._id) === String(formData.category));
    const selectedSubCategoryObj = subCategories.find((c: any) => String(c._id) === String(formData.subCategory));
    const selectedChildCategoryObj = childCategories.find((c: any) => String(c._id) === String(formData.childCategory));

    const selectedCategoryName = selectedCategoryObj?.name;
    const selectedSubCategoryName = selectedSubCategoryObj?.name;
    const selectedChildCategoryName = selectedChildCategoryObj?.name;

    // Target the specific category selected (Child -> Sub -> Category)
    const selectedTargetCategory =
        formData.childCategory ? { obj: selectedChildCategoryObj, source: 'Child Category' }
        : formData.subCategory ? { obj: selectedSubCategoryObj, source: 'Sub-Category' }
        : formData.category ? { obj: selectedCategoryObj, source: 'Category' }
        : null;


    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-32">
            {/* ══ ACTION BAR ═══════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-md border border-gray-200 shadow-sm sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <Link href={listHref} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-400 transition-all hover:text-gray-600">
                        <FiArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Product' : 'Create New Product'}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${formData.status === 'active' ? 'bg-green-500' : formData.status === 'draft' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                            <p className="text-xs text-gray-500 capitalize">{formData.status}</p>
                            {formData.discount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{formData.discount}% OFF</span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button onClick={() => router.push(listHref)} className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-200 rounded-md font-semibold text-gray-600 hover:bg-gray-50 transition-all text-sm">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isCreating || isUpdating} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-[var(--color-primary)] text-white rounded-md font-semibold hover:bg-[var(--color-primary-dark)] transition-all shadow-md disabled:opacity-50 text-sm">
                        <FiSave size={18} />
                        {isCreating || isUpdating ? 'Saving...' : (isEditing ? 'Update Product' : 'Publish Product')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ══ LEFT COLUMN (8 cols) ════════════════════════════ */}
                <div className="lg:col-span-8 space-y-6">

                    {/* ── Error Summary Banner ── */}
                    {Object.keys(errors).length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-2">
                            <p className="text-sm font-bold text-red-700 flex items-center gap-2">⚠ Please fix the following {Object.keys(errors).length} error(s):</p>
                            <ul className="list-disc list-inside space-y-1">
                                {Object.entries(errors).map(([key, msg]) => (
                                    <li key={key} className="text-xs text-red-600">{msg}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* ── 1. Basic Information ──────────────────────── */}
                    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm space-y-5">
                        <SectionHeader icon={<FiInfo size={20} />} title="Basic Information" color="bg-blue-50 text-blue-600" />

                        <Input label="Product Name" name="name" required type="text" placeholder="e.g. 250L Piston Type Industrial Air Compressor" value={formData.name} onChange={handleChange} error={errors.name} />

                        {/* ── 3-Tier Category Cascade (Category -> Sub-Category -> Child Category) ── */}
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5" data-field="category">
                                    <label className="text-sm font-semibold text-gray-700">Category <span className="text-red-400">*</span></label>
                                    <select name="category" required className={`w-full px-3.5 py-2.5 bg-white border rounded-md text-sm font-semibold outline-none cursor-pointer ${errors.category ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-[var(--color-primary)]'}`}
                                        value={formData.category}
                                        onChange={(e) => { clearError('category'); setFormData((prev: any) => ({ ...prev, category: e.target.value, subCategory: '', childCategory: '' })); }}>
                                        <option value="">Select Category</option>
                                        {categories.map((cat: any) => (<option key={cat._id} value={cat._id}>{cat.name}</option>))}
                                    </select>
                                    {errors.category && <p className="text-xs text-red-500 font-medium">⚠ {errors.category}</p>}
                                </div>

                                <div className="space-y-1.5" data-field="subCategory">
                                    <label className="text-sm font-semibold text-gray-700">Sub-Category <span className="text-xs text-gray-400">(optional)</span></label>
                                    <select name="subCategory" disabled={!formData.category || subCategories.length === 0} className={`w-full px-3.5 py-2.5 bg-white border rounded-md text-sm font-semibold outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${errors.subCategory ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-[var(--color-primary)]'}`}
                                        value={formData.subCategory}
                                        onChange={(e) => { clearError('subCategory'); setFormData((prev: any) => ({ ...prev, subCategory: e.target.value, childCategory: '' })); }}>
                                        <option value="">
                                            {!formData.category
                                                ? 'Select category first'
                                                : subCategories.length === 0
                                                    ? 'No sub-categories'
                                                    : 'Select Sub-Category'}
                                        </option>
                                        {subCategories.map((sub: any) => (<option key={sub._id} value={sub._id}>{sub.name}</option>))}
                                    </select>
                                    {errors.subCategory && <p className="text-xs text-red-500 font-medium">⚠ {errors.subCategory}</p>}
                                </div>

                                <div className="space-y-1.5" data-field="childCategory">
                                    <label className="text-sm font-semibold text-gray-700">Child Category <span className="text-xs text-gray-400">(optional)</span></label>
                                    <select name="childCategory" disabled={!formData.subCategory || childCategories.length === 0} className={`w-full px-3.5 py-2.5 bg-white border rounded-md text-sm font-semibold outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${errors.childCategory ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-[var(--color-primary)]'}`}
                                        value={formData.childCategory}
                                        onChange={(e) => { clearError('childCategory'); setFormData((prev: any) => ({ ...prev, childCategory: e.target.value })); }}>
                                        <option value="">
                                            {!formData.subCategory
                                                ? 'Select sub-category first'
                                                : childCategories.length === 0
                                                    ? 'No child categories'
                                                    : 'Select Child Category'}
                                        </option>
                                        {childCategories.map((child: any) => (<option key={child._id} value={child._id}>{child.name}</option>))}
                                    </select>
                                    {errors.childCategory && <p className="text-xs text-red-500 font-medium">⚠ {errors.childCategory}</p>}
                                </div>
                            </div>

                            {/* Active Category Path Badge */}
                            {formData.category && selectedCategoryName && (
                                <div className="mt-3 px-3.5 py-2.5 bg-green-50/70 border border-green-200/70 rounded-md text-xs text-gray-700 flex items-center justify-between flex-wrap gap-2 shadow-sm">
                                    <div className="flex items-center flex-wrap gap-1.5">
                                        <span className="font-semibold text-gray-500">Selected Path:</span>
                                        <span className="font-bold text-[var(--color-primary)]">{selectedCategoryName}</span>
                                        {selectedSubCategoryName && (
                                            <>
                                                <span className="text-gray-400">›</span>
                                                <span className="font-bold text-[var(--color-primary)]">{selectedSubCategoryName}</span>
                                            </>
                                        )}
                                        {selectedChildCategoryName && (
                                            <>
                                                <span className="text-gray-400">›</span>
                                                <span className="font-bold text-[var(--color-primary)]">{selectedChildCategoryName}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Slug" name="slug" type="text" placeholder="auto-generated" value={formData.slug} onChange={handleChange} />
                            <Input label="SKU" name="sku" type="text" placeholder="e.g. IND-1001" value={formData.sku} onChange={handleChange} />
                            <Input label="Brand" name="brand" type="text" placeholder="e.g. Lishan Group" value={formData.brand} onChange={handleChange} error={errors.brand} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Model" name="model" type="text" placeholder="e.g. LS-250X" value={formData.model} onChange={handleChange} error={errors.model} />
                            <Input label="Weight" name="weight" type="text" placeholder="e.g. 500 g / 2.5 kg" value={formData.weight} onChange={handleChange} error={errors.weight} />
                        </div>

                        {/* ── Box Size (L × W × H) ── */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Box Size (L × W × H, cm)</label>
                            <div className="grid grid-cols-3 gap-3">
                                <Input label="Length" name="dimensions.length" type="number" placeholder="0" value={formData.dimensions.length} onChange={handleChange} />
                                <Input label="Width" name="dimensions.width" type="number" placeholder="0" value={formData.dimensions.width} onChange={handleChange} />
                                <Input label="Height" name="dimensions.height" type="number" placeholder="0" value={formData.dimensions.height} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-1.5" data-field="insideTheBox">
                            <label className="text-sm font-semibold text-gray-700">Inside The Box</label>
                            <textarea name="insideTheBox" rows={3} placeholder="e.g. 1x Air Compressor, 1x Hose, 1x User Manual" className={`w-full px-4 py-3 bg-white border rounded-md outline-none transition-all text-sm ${errors.insideTheBox ? 'border-red-400 bg-red-50/30 focus:border-red-500' : 'border-gray-200 focus:border-[var(--color-primary)]'}`} value={formData.insideTheBox} onChange={handleChange}></textarea>
                            {errors.insideTheBox && <p className="text-xs text-red-500 font-medium">⚠ {errors.insideTheBox}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Tagline <span className="text-xs text-gray-400">(scrolling text on card)</span></label>
                            <input type="text" name="tagline" placeholder="Lower price than others but quality higher" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-md outline-none focus:border-[var(--color-primary)] transition-all text-sm" value={formData.tagline} onChange={handleChange} />
                        </div>

                        <div className="space-y-1.5" data-field="description">
                            <label className="text-sm font-semibold text-gray-700">Product Description <span className="text-red-400">*</span></label>
                            <div className={`product-editor-wrapper ${errors.description ? 'ring-1 ring-red-400 rounded-md' : ''}`}>
                                {isEditing && !isDataLoaded ? (
                                    <div className="h-[300px] bg-gray-50 border border-gray-200 rounded-md animate-pulse flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                                        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                                        <span>Loading description...</span>
                                    </div>
                                ) : (
                                    <ReactQuill
                                        key={`editor-${productToEdit?.data?._id || 'new'}`}
                                        theme="snow"
                                        value={formData.description || ''}
                                        onChange={(value: string) => { setFormData((prev: any) => ({ ...prev, description: value })); clearError('description'); }}
                                        placeholder="Write detailed product description..."
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                                                [{ 'font': [] }],
                                                [{ 'size': ['small', false, 'large', 'huge'] }],
                                                ['bold', 'italic', 'underline', 'strike'],
                                                [{ 'color': [] }, { 'background': [] }],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                [{ 'indent': '-1' }, { 'indent': '+1' }],
                                                [{ 'align': [] }],
                                                ['link', 'image', 'video'],
                                                ['blockquote', 'code-block'],
                                                ['clean'],
                                            ],
                                        }}
                                        style={{ minHeight: '300px' }}
                                    />
                                )}
                            </div>
                            {errors.description && <p className="text-xs text-red-500 font-medium">⚠ {errors.description}</p>}
                        </div>
                    </div>

                    {/* ── 2. Pricing & Inventory ────────────────────── */}
                    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm space-y-5">
                        <SectionHeader icon={<FiDollarSign size={20} />} title="Pricing & Inventory" color="bg-green-50 text-green-600" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5" data-field="price">
                                <label className="text-sm font-semibold text-gray-700">Offer Price <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">৳</span>
                                    <input type="number" name="price" placeholder="0" className={`w-full pl-8 pr-3 py-2.5 bg-white border rounded-md outline-none text-base font-bold ${errors.price ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-[var(--color-primary)]'}`} value={formData.price} onChange={handleChange} />
                                </div>
                                {errors.price && <p className="text-xs text-red-500 font-medium">⚠ {errors.price}</p>}
                            </div>
                            <div className="space-y-2" data-field="originalPrice">
                                <label className="text-sm font-semibold text-gray-700">Original Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">৳</span>
                                    <input type="number" name="originalPrice" placeholder="0" className={`w-full pl-8 pr-3 py-2.5 bg-white border rounded-md outline-none text-base font-bold text-red-600 ${errors.originalPrice ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-[var(--color-primary)]'}`} value={formData.originalPrice} onChange={handleChange} />
                                </div>
                                {errors.originalPrice && <p className="text-xs text-red-500 font-medium">⚠ {errors.originalPrice}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1"><FiPercent size={14} /> Discount</label>
                                <input type="number" name="discount" placeholder="Auto" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md outline-none text-base font-bold text-green-700" value={formData.discount} readOnly />
                            </div>
                        </div>

                        {/* ── Offer Window Dates ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Offer Start Date" name="offerStartDate" type="date" value={formData.offerStartDate} onChange={handleChange} />
                            <Input label="Offer End Date" name="offerEndDate" type="date" value={formData.offerEndDate} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Current Stock" name="stock" type="number" placeholder="0" value={formData.stock} onChange={handleChange} error={errors.stock} />
                            <Input label="Low Stock Alert" name="lowStockThreshold" type="number" placeholder="5" value={formData.lowStockThreshold} onChange={handleChange} />
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Unit</label>
                                <select name="unit" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)] cursor-pointer" value={formData.unit} onChange={handleChange}>
                                    <option value="piece">Piece</option>
                                    <option value="kg">Kg</option>
                                    <option value="liter">Liter</option>
                                    <option value="meter">Meter</option>
                                    <option value="set">Set</option>
                                    <option value="pair">Pair</option>
                                    <option value="box">Box</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── 3. Product Type & Variations ─ */}
                    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm space-y-5">
                        <SectionHeader icon={<FiDroplet size={20} />} title="Product Type & Variations" color="bg-pink-50 text-pink-600" />

                        {/* ── Product Type Selector ── */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'simple', label: '🔲 Simple', desc: 'No color/size variant' },
                                { value: 'variable', label: '🔄 Variable', desc: 'Color + Size combos' },
                                { value: 'multi-color', label: '🎨 Multi Color', desc: 'Color only, no size' },
                            ].map((t) => (
                                <button key={t.value} type="button"
                                    onClick={() => setFormData((prev: any) => ({ ...prev, productType: t.value }))}
                                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                                        formData.productType === t.value
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-lightest)] shadow-md'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                                >
                                    <p className="text-sm font-bold text-gray-800">{t.label}</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">{t.desc}</p>
                                </button>
                            ))}
                        </div>

                        {formData.productType === 'simple' && (
                            <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-md">✅ Simple product — নিচে কোন variant দেওয়ার দরকার নেই। Base price ও stock ব্যবহার হবে।</p>
                        )}

                        {formData.productType === 'multi-color' && (
                            <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-md font-medium">🎨 Multi-Color — শুধু কালার গুলো add করুন, প্রতিটা কালারের নাম ও hex দিন। সাইজ লাগবে না।</p>
                        )}

                        {formData.productType === 'variable' && (
                            <p className="text-xs text-gray-400 -mt-2">Color ও Size add করে <strong>Generate Variants</strong> ক্লিক করুন। প্রতিটার আলাদা price, stock, images দিতে পারবেন।</p>
                        )}

                        {/* ── Step 1: Colors (variable + multi-color) ── */}
                        {(formData.productType === 'variable' || formData.productType === 'multi-color') && (
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">🎨 Colors</label>
                            <div className="flex flex-wrap gap-2">
                                {formData.colors.map((c: string, i: number) => (
                                    <span key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold">
                                        <span className="w-5 h-5 rounded" style={{ background: formData.colorHex?.[i] || '#ccc', border: '1px solid #ddd' }} />
                                        {c}
                                        <button type="button" onClick={() => {
                                            setFormData((prev: any) => ({
                                                ...prev,
                                                colors: prev.colors.filter((_: any, j: number) => j !== i),
                                                colorHex: prev.colorHex.filter((_: any, j: number) => j !== i),
                                            }));
                                        }} className="text-red-400 hover:text-red-600 text-lg leading-none ml-1">×</button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2 items-center">
                                <input type="color" id="varColorHex" defaultValue="#000000" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                                <input type="text" id="varColorName" placeholder="Color নাম (e.g. Sky Blue)" className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)]"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const nameEl = document.getElementById('varColorName') as HTMLInputElement;
                                            const hexEl = document.getElementById('varColorHex') as HTMLInputElement;
                                            const name = nameEl.value.trim();
                                            if (!name) return;
                                            setFormData((prev: any) => ({
                                                ...prev,
                                                colors: [...prev.colors, name],
                                                colorHex: [...prev.colorHex, hexEl.value],
                                            }));
                                            nameEl.value = '';
                                        }
                                    }}
                                />
                                <button type="button" onClick={() => {
                                    const nameEl = document.getElementById('varColorName') as HTMLInputElement;
                                    const hexEl = document.getElementById('varColorHex') as HTMLInputElement;
                                    const name = nameEl.value.trim();
                                    if (!name) return;
                                    setFormData((prev: any) => ({
                                        ...prev,
                                        colors: [...prev.colors, name],
                                        colorHex: [...prev.colorHex, hexEl.value],
                                    }));
                                    nameEl.value = '';
                                }} className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold hover:bg-[var(--color-primary-dark)] shrink-0">+ Add</button>
                            </div>
                        </div>
                        )}

                        {/* ── Step 2: Sizes (variable only) ── */}
                        {formData.productType === 'variable' && (
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">📐 Sizes</label>
                            <div className="flex flex-wrap gap-2">
                                {formData.sizes.map((s: string, i: number) => (
                                    <span key={i} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold">
                                        {s}
                                        <button type="button" onClick={() => {
                                            setFormData((prev: any) => ({ ...prev, sizes: prev.sizes.filter((_: any, j: number) => j !== i) }));
                                        }} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" id="varSizeName" placeholder="S, M, L, XL, XXL, Free Size..." className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)]"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const el = document.getElementById('varSizeName') as HTMLInputElement;
                                            const val = el.value.trim();
                                            if (val && !formData.sizes.includes(val)) {
                                                setFormData((prev: any) => ({ ...prev, sizes: [...prev.sizes, val] }));
                                            }
                                            el.value = '';
                                        }
                                    }}
                                />
                                <button type="button" onClick={() => {
                                    const el = document.getElementById('varSizeName') as HTMLInputElement;
                                    const val = el.value.trim();
                                    if (val && !formData.sizes.includes(val)) {
                                        setFormData((prev: any) => ({ ...prev, sizes: [...prev.sizes, val] }));
                                    }
                                    el.value = '';
                                }} className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold hover:bg-[var(--color-primary-dark)] shrink-0">+ Add</button>
                            </div>
                        </div>
                        )}

                        {/* ── Step 3: Generate / Actions (variable only) ── */}
                        {formData.productType === 'variable' && (
                        <div className="flex gap-3 flex-wrap">
                            <button type="button" disabled={formData.colors.length === 0 && formData.sizes.length === 0} onClick={() => {
                                const existing = formData.variants || [];
                                const newVars: any[] = [];
                                const defPrice = formData.price || 0;
                                const defOrig = formData.originalPrice || 0;
                                if (formData.colors.length > 0 && formData.sizes.length > 0) {
                                    formData.colors.forEach((c: string, ci: number) => {
                                        formData.sizes.forEach((s: string) => {
                                            if (existing.some((v: any) => v.color === c && v.size === s)) return;
                                            newVars.push({ color: c, colorHex: formData.colorHex[ci] || '', size: s, description: formData.description || '', price: defPrice, originalPrice: defOrig, stock: 0, sku: '', images: [], note: '' });
                                        });
                                    });
                                } else if (formData.colors.length > 0) {
                                    formData.colors.forEach((c: string, ci: number) => {
                                        if (existing.some((v: any) => v.color === c && !v.size)) return;
                                        newVars.push({ color: c, colorHex: formData.colorHex[ci] || '', size: '', description: formData.description || '', price: defPrice, originalPrice: defOrig, stock: 0, sku: '', images: [], note: '' });
                                    });
                                } else if (formData.sizes.length > 0) {
                                    formData.sizes.forEach((s: string) => {
                                        if (existing.some((v: any) => v.size === s && !v.color)) return;
                                        newVars.push({ color: '', colorHex: '', size: s, description: formData.description || '', price: defPrice, originalPrice: defOrig, stock: 0, sku: '', images: [], note: '' });
                                    });
                                }
                                if (newVars.length > 0) setFormData((prev: any) => ({ ...prev, variants: [...(prev.variants || []), ...newVars] }));
                            }} className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-bold transition-all ${
                                (formData.colors.length === 0 && formData.sizes.length === 0) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] shadow-md'
                            }`}>
                                🔄 Generate Variants {formData.colors.length > 0 && formData.sizes.length > 0 && `(${formData.colors.length} × ${formData.sizes.length} = ${formData.colors.length * formData.sizes.length})`}
                            </button>
                            {(formData.variants?.length || 0) > 0 && (
                                <button type="button" onClick={() => { if (confirm('সব variant মুছে ফেলবেন?')) setFormData((prev: any) => ({ ...prev, variants: [] })); }} className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm font-bold hover:bg-red-100">🗑 Clear All</button>
                            )}
                        </div>
                        )}

                        {/* ── Bulk Set ── */}
                        {(formData.variants?.length || 0) > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                                <p className="text-xs font-bold text-emerald-700">⚡ Bulk Set — সব variant এ একসাথে apply হবে</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Price (৳)</label>
                                        <input type="number" placeholder="All price" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-emerald-400" min="0"
                                            onChange={e => { const v = Number(e.target.value); if (v > 0) setFormData((prev: any) => ({ ...prev, variants: prev.variants.map((vr: any) => ({ ...vr, price: v })) })); }} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">MRP (৳)</label>
                                        <input type="number" placeholder="All MRP" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-emerald-400" min="0"
                                            onChange={e => { const v = Number(e.target.value); if (v > 0) setFormData((prev: any) => ({ ...prev, variants: prev.variants.map((vr: any) => ({ ...vr, originalPrice: v })) })); }} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Stock</label>
                                        <input type="number" placeholder="All stock" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-emerald-400" min="0"
                                            onChange={e => { const v = Number(e.target.value); if (v >= 0) setFormData((prev: any) => ({ ...prev, variants: prev.variants.map((vr: any) => ({ ...vr, stock: v })) })); }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Per-Color Images — upload once, auto-apply to all sizes ── */}
                        {(formData.variants?.length || 0) > 0 && formData.colors.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                                <p className="text-xs font-bold text-blue-700">📸 Per-Color Images — একবার upload করলে ওই কালারের সব size এ apply হবে</p>
                                {formData.colors.map((colorName: string, ci: number) => {
                                    // Get images from first variant of this color
                                    const firstVariantOfColor = (formData.variants || []).find((v: any) => v.color === colorName);
                                    const currentImages = firstVariantOfColor?.images || [];
                                    return (
                                        <div key={ci} className="bg-white rounded-lg p-3 border border-blue-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-5 h-5 rounded" style={{ background: formData.colorHex?.[ci] || '#ccc', border: '1px solid #ddd' }} />
                                                <span className="text-sm font-bold text-gray-700">{colorName}</span>
                                                <span className="text-[10px] text-gray-400">({(formData.variants || []).filter((v: any) => v.color === colorName).length} variants)</span>
                                            </div>
                                            <MultipleImageUploader
                                                label={`${colorName} Images`}
                                                hint="Recommended: 1000×1000px (1:1)"
                                                values={currentImages}
                                                onChange={(urls: string[]) => {
                                                    // Apply images to ALL variants of this color
                                                    setFormData((prev: any) => ({
                                                        ...prev,
                                                        variants: prev.variants.map((vr: any) =>
                                                            vr.color === colorName ? { ...vr, images: urls } : vr
                                                        )
                                                    }));
                                                }}
                                                max={6}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Variant Cards (price/stock only, no images) ── */}
                        {(formData.variants?.length || 0) > 0 && (
                            <p className="text-xs text-gray-400">{formData.variants.length} variant{formData.variants.length > 1 ? 's' : ''} — click করে price/stock edit করুন</p>
                        )}
                        {(formData.variants || []).map((v: any, i: number) => (
                            <details key={i} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-100 transition-all" style={{ listStyle: 'none' }}>
                                    {v.colorHex && <span className="w-5 h-5 rounded shrink-0 border border-gray-300" style={{ background: v.colorHex }} />}
                                    <span className="flex-1 text-sm font-semibold text-gray-800">{[v.color, v.size].filter(Boolean).join(' / ') || `Variant #${i + 1}`}</span>
                                    <span className="text-xs text-gray-400">৳{v.price || 0} • Stock: {v.stock || 0}{(v.images?.length || 0) > 0 ? ` • 📷${v.images.length}` : ''}</span>
                                    <button type="button" onClick={(e) => { e.preventDefault(); setFormData((prev: any) => ({ ...prev, variants: prev.variants.filter((_: any, j: number) => j !== i) })); }} className="px-2 py-1 bg-red-50 border border-red-200 text-red-500 rounded text-[10px] font-bold hover:bg-red-100">
                                        <FiTrash2 size={12} />
                                    </button>
                                </summary>
                                <div className="p-4 border-t border-gray-200 space-y-3">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Color</label>
                                            <input type="text" value={v.color || ''} readOnly className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm outline-none text-gray-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Size</label>
                                            <input type="text" value={v.size || ''} readOnly className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm outline-none text-gray-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Price (৳) *</label>
                                            <input type="number" value={v.price || 0} min="0" onChange={e => { const vars = [...formData.variants]; vars[i] = { ...vars[i], price: Number(e.target.value) }; setFormData((prev: any) => ({ ...prev, variants: vars })); }} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)] font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">MRP (৳)</label>
                                            <input type="number" value={v.originalPrice || 0} min="0" onChange={e => { const vars = [...formData.variants]; vars[i] = { ...vars[i], originalPrice: Number(e.target.value) }; setFormData((prev: any) => ({ ...prev, variants: vars })); }} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)]" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Stock</label>
                                            <input type="number" value={v.stock || 0} min="0" onChange={e => { const vars = [...formData.variants]; vars[i] = { ...vars[i], stock: Number(e.target.value) }; setFormData((prev: any) => ({ ...prev, variants: vars })); }} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)]" />
                                        </div>
                                    </div>
                                    {v.originalPrice > 0 && v.price > 0 && v.originalPrice > v.price && (
                                        <p className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded inline-block">✅ Discount: {Math.round(((v.originalPrice - v.price) / v.originalPrice) * 100)}%</p>
                                    )}
                                    {/* ── Variant Description ── */}
                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                                            <button type="button" onClick={() => { const vars = [...formData.variants]; vars[i] = { ...vars[i], description: formData.description || '' }; setFormData((prev: any) => ({ ...prev, variants: vars })); }} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                                                ↩ Use Main Description
                                            </button>
                                        </div>
                                        <div className="product-editor-wrapper">
                                            {isEditing && !isDataLoaded ? (
                                                <div className="h-[150px] bg-gray-50 border border-gray-200 rounded-md animate-pulse" />
                                            ) : (
                                                <ReactQuill
                                                    key={`variant-quill-${productToEdit?.data?._id || 'new'}-${i}`}
                                                    theme="snow"
                                                    value={v.description || ''}
                                                    onChange={(val: string) => { const vars = [...formData.variants]; vars[i] = { ...vars[i], description: val }; setFormData((prev: any) => ({ ...prev, variants: vars })); }}
                                                    placeholder="Variant-specific description..."
                                                    modules={{
                                                        toolbar: [
                                                            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                                                            [{ 'font': [] }],
                                                            [{ 'size': ['small', false, 'large', 'huge'] }],
                                                            ['bold', 'italic', 'underline', 'strike'],
                                                            [{ 'color': [] }, { 'background': [] }],
                                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                            [{ 'indent': '-1' }, { 'indent': '+1' }],
                                                            [{ 'align': [] }],
                                                            ['link', 'image', 'video'],
                                                            ['blockquote', 'code-block'],
                                                            ['clean'],
                                                        ],
                                                    }}
                                                    style={{ minHeight: '200px' }}
                                                />
                                            )}
                                        </div>
                                        {v.description && v.description !== formData.description && (
                                            <p className="text-[10px] text-amber-600 font-medium">⚠ Custom description (different from main)</p>
                                        )}
                                    </div>
                                </div>
                            </details>
                        ))}

                        {/* Material, Pattern, Gender — kept below */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Material <span className="text-xs text-gray-400">(comma-separated)</span></label>
                                <input type="text" placeholder="e.g. cotton, polyester" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)]" value={formData.material.join(', ')} onChange={(e) => handleArrayChange('material', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Pattern</label>
                                    <select name="pattern" className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)] cursor-pointer" value={formData.pattern} onChange={handleChange}>
                                        <option value="">None</option>
                                        <option value="solid">Solid</option>
                                        <option value="striped">Striped</option>
                                        <option value="floral">Floral</option>
                                        <option value="graphic print">Graphic</option>
                                        <option value="embroidered">Embroidered</option>
                                        <option value="camo">Camo</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Gender</label>
                                    <select name="gender" className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)] cursor-pointer" value={formData.gender} onChange={handleChange}>
                                        <option value="">Any</option>
                                        <option value="Men">Men</option>
                                        <option value="Women">Women</option>
                                        <option value="Unisex">Unisex</option>
                                        <option value="Kids">Kids</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* ── 7. SEO ─────────────────────────────────────── */}
                    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm space-y-5">
                        <SectionHeader icon={<FiGlobe size={20} />} title="SEO Optimization" color="bg-green-50 text-green-700" />
                        <Input label="Meta Title" name="metaTitle" type="text" placeholder="SEO title for search engines" value={formData.metaTitle} onChange={handleChange} />
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Meta Description</label>
                            <textarea name="metaDescription" rows={3} placeholder="SEO description for better search ranking..." className="w-full px-4 py-3 bg-white border border-gray-200 rounded-md outline-none focus:border-green-400 transition-all text-sm" value={formData.metaDescription} onChange={handleChange}></textarea>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Meta Keywords <span className="text-xs text-gray-400">(comma-separated)</span></label>
                            <input type="text" placeholder="e.g. air compressor, industrial" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-green-400" value={formData.metaKeywords.join(', ')} onChange={(e) => handleArrayChange('metaKeywords', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT COLUMN (4 cols) ════════════════════════ */}
                <div className="lg:col-span-4 space-y-6">

                    {/* ── Media Assets ──────────────────────────────── */}
                    <div className={`bg-white p-6 rounded-md border shadow-sm space-y-4 ${(errors.thumbnail || errors.images) ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`} data-field="thumbnail">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiImage className="text-blue-500" /> Media Assets</h3>
                        <p className="text-[11px] text-gray-400 -mt-2">At least 3 images required (1 thumbnail + 2 gallery)</p>
                        <SingleImageUploader
                            label="Product Thumbnail"
                            hint="Recommended: 1000×1000px (1:1 square)"
                            value={formData.thumbnail}
                            onChange={(url: string) => { setFormData((prev: any) => ({ ...prev, thumbnail: url })); clearError('thumbnail'); clearError('images'); }}
                            required
                        />
                        {errors.thumbnail && <p className="text-xs text-red-500 font-medium">⚠ {errors.thumbnail}</p>}
                        <div data-field="images">
                            <MultipleImageUploader
                                label="Gallery Images"
                                hint="Recommended: 1000×1000px (1:1 square)"
                                values={formData.images}
                                onChange={(urls: string[]) => { setFormData((prev: any) => ({ ...prev, images: urls })); clearError('images'); }}
                                max={10}
                            />
                            {errors.images && <p className="text-xs text-red-500 font-medium mt-1">⚠ {errors.images}</p>}
                        </div>
                    </div>

                    {/* ── Category & Tags ───────────────────────────── */}
                    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiTag className="text-indigo-500" /> Organization</h3>
                        {/* Category & Sub-Category moved to the Basic Information card (under Product Name). */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Tags <span className="text-gray-300">(comma-separated)</span></label>
                            <input type="text" placeholder="e.g. air compressor, industrial, factory" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-indigo-400" value={formData.tags.join(', ')} onChange={(e) => handleArrayChange('tags', e.target.value)} />
                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {formData.tags.slice(0, 8).map((t: string, i: number) => (
                                        <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">{t}</span>
                                    ))}
                                    {formData.tags.length > 8 && <span className="text-[10px] text-gray-400">+{formData.tags.length - 8} more</span>}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">AI Labels <span className="text-gray-300">(for image search)</span></label>
                            <input type="text" placeholder="e.g. machinery, compressor" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-indigo-400" value={formData.aiLabels.join(', ')} onChange={(e) => handleArrayChange('aiLabels', e.target.value)} />
                        </div>
                    </div>

                    {/* ── Visibility & Promotion ────────────────────── */}
                    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiSettings className="text-green-600" /> Visibility & Status</h3>
                        <div className="space-y-2">
                            <Toggle label="Featured Product" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} color="bg-yellow-500" />
                            <Toggle label="On Sale" name="isOnSale" checked={formData.isOnSale} onChange={handleChange} color="bg-rose-500" />
                            <Toggle label="New Arrival" name="isNewProduct" checked={formData.isNewProduct} onChange={handleChange} color="bg-emerald-500" />
                        </div>
                        <div className="pt-2">
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Status</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {['active', 'draft', 'out-of-stock'].map(s => (
                                    <button key={s} type="button" onClick={() => setFormData((prev: any) => ({ ...prev, status: s }))}
                                        className={`py-2 rounded-md text-xs font-bold uppercase transition-all ${formData.status === s ? 'bg-[var(--color-primary)] text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                        {s === 'out-of-stock' ? 'Out' : s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Shipping & Warranty ───────────────────────── */}
                    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiShield className="text-emerald-500" /> Shipping & Warranty</h3>

                        <div className="space-y-3 p-4 bg-gray-50 rounded-md border border-gray-100">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="shippingConfig.freeShipping" className="w-4 h-4 accent-emerald-500" checked={formData.shippingConfig.freeShipping} onChange={handleChange} />
                                <span className="text-sm font-bold text-gray-700">Free Shipping</span>
                            </label>
                            {!formData.shippingConfig.freeShipping && (
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400">Shipping Cost (৳)</label>
                                        <input type="number" name="shippingConfig.shippingCost" placeholder="0" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-emerald-300" value={formData.shippingConfig.shippingCost} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400">Est. Days</label>
                                        <input type="number" name="shippingConfig.estimatedDays" placeholder="3" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-emerald-300" value={formData.shippingConfig.estimatedDays} onChange={handleChange} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 p-4 bg-gray-50 rounded-md border border-gray-100">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="warranty.hasWarranty" className="w-4 h-4 accent-[var(--color-primary)]" checked={formData.warranty.hasWarranty} onChange={handleChange} />
                                <span className="text-sm font-bold text-gray-700">Has Warranty</span>
                            </label>
                            {formData.warranty.hasWarranty && (
                                <div className="grid grid-cols-3 gap-2 pt-1">
                                    <input type="number" name="warranty.duration" placeholder="12" className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-blue-300" value={formData.warranty.duration} onChange={handleChange} />
                                    <select name="warranty.durationUnit" className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-blue-300" value={formData.warranty.durationUnit} onChange={handleChange}>
                                        <option value="days">Days</option>
                                        <option value="months">Months</option>
                                        <option value="years">Years</option>
                                    </select>
                                    <select name="warranty.type" className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-blue-300" value={formData.warranty.type} onChange={handleChange}>
                                        <option value="manufacturer">Manufacturer</option>
                                        <option value="seller">Seller</option>
                                        <option value="none">None / Other</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Box Size (L × W × H) moved to the Basic Information card. */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ProductForm = (props: { productId?: string }) => (
    <Suspense fallback={<div className="p-20 text-center text-[var(--color-primary)] font-bold animate-pulse">Loading Product Form...</div>}>
        <ProductFormInner {...props} />
    </Suspense>
);

export default ProductForm;
