"use client";

import React, { useState, useEffect } from 'react';
import {
    FiSettings, FiGlobe, FiSave, FiRefreshCw,
    FiCheckCircle, FiInfo, FiShield, FiDroplet, FiLock,
} from 'react-icons/fi';
import { useGetSiteContentQuery, useUpdateSiteContentMutation } from '@/redux/api/siteContentApi';
import { useUpdatePasswordMutation } from '@/redux/api/authApi';
import { SingleImageUploader } from '@/components/ui/ImageUploader';
import toast from 'react-hot-toast';

/* ─── Reusable Components ─── */
const SettingSection = ({ icon: Icon, title, description, children }: any) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                    <Icon size={18} className="text-[var(--color-primary)]" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
            </div>
        </div>
        <div className="p-6 space-y-5">
            {children}
        </div>
    </div>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, helper, ...props }: any) => (
    <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">{label}</label>
        {type === 'textarea' ? (
            <textarea
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none font-medium text-sm h-20 resize-none"
                value={value} onChange={onChange} placeholder={placeholder} {...props}
            />
        ) : (
            <input
                type={type}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none font-medium text-sm"
                value={value} onChange={onChange} placeholder={placeholder} {...props}
            />
        )}
        {helper && <p className="text-[10px] text-gray-400 mt-1 italic">{helper}</p>}
    </div>
);

const ColorPicker = ({ label, value, onChange, description }: { label: string; value: string; onChange: (v: string) => void; description: string }) => (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-14 h-14 rounded-lg cursor-pointer border-2 border-gray-200 p-0.5"
        />
        <div className="flex-1">
            <p className="text-sm font-bold text-gray-700">{label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="mt-1.5 w-28 px-3 py-1.5 border border-gray-200 rounded-md text-xs font-mono bg-white"
            />
        </div>
        {/* Live preview dot */}
        <div className="w-10 h-10 rounded-full shadow-inner" style={{ background: value }} />
    </div>
);

export default function SettingsPage() {
    const { data: res, isLoading } = useGetSiteContentQuery({});
    const [updateContent, { isLoading: isSaving }] = useUpdateSiteContentMutation();

    const [formData, setFormData] = useState<any>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // ── Account security: change the admin/super-admin's own password ──
    const [updatePassword, { isLoading: isChangingPw }] = useUpdatePasswordMutation();
    const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const handleChangePassword = async () => {
        if (!pw.currentPassword || !pw.newPassword) { toast.error('Please fill in all password fields'); return; }
        if (pw.newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
        if (pw.newPassword !== pw.confirmPassword) { toast.error('New passwords do not match'); return; }
        try {
            await updatePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }).unwrap();
            toast.success('Password changed successfully!');
            setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to change password');
        }
    };

    useEffect(() => {
        if (res?.data) {
            setFormData({
                general: res.data.general || {
                    storeName: 'Shohoz Kitchen',
                    tagline: 'Your trusted online marketplace',
                    currency: 'BDT',
                },
                seo: res.data.seo || {
                    title: '',
                    description: '',
                    googleAnalyticsId: '',
                    facebookPixel: '',
                },
                theme: res.data.theme || {
                    primaryColor: 'var(--color-primary)',
                    secondaryColor: 'var(--color-secondary)',
                    logoUrl: '',
                    faviconUrl: '',
                },
            });
        }
    }, [res]);

    const updateGeneral = (field: string, value: any) => {
        setFormData((p: any) => ({ ...p, general: { ...p.general, [field]: value } }));
    };
    const updateSeo = (field: string, value: any) => {
        setFormData((p: any) => ({ ...p, seo: { ...p.seo, [field]: value } }));
    };
    const updateTheme = (field: string, value: any) => {
        setFormData((p: any) => ({ ...p, theme: { ...p.theme, [field]: value } }));
    };

    const handleSave = async () => {
        try {
            await updateContent(formData).unwrap();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
            toast.success('Settings saved! Refresh the site to see changes.');
        } catch (error) {
            toast.error('Failed to save settings');
        }
    };

    if (isLoading || !formData) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <div className="w-8 h-8 border-3 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin" />
            </div>
        );
    }

    const g = formData.general || {};
    const seo = formData.seo || {};
    const theme = formData.theme || {};

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Settings</h1>
                    <p className="text-gray-500 mt-1">Manage your store preferences and configuration</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--color-primary-dark)] transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <FiRefreshCw size={16} className="animate-spin" /> : saveSuccess ? <FiCheckCircle size={16} /> : <FiSave size={16} />}
                    {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <FiInfo size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-blue-800">Configuration Center</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                        Changes are saved to the database and apply globally. Contact details are managed in <a href="/dashboard/admin/site-content" className="font-bold underline">Site Content</a>.
                    </p>
                </div>
            </div>

            {/* All Settings */}
            <div className="space-y-6">

                {/* ═══════ APPEARANCE ═══════ */}
                <SettingSection icon={FiDroplet} title="🎨 Appearance — Colors & Logo" description="Change your website's brand colors and logo from here">

                    {/* Colors */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Brand Colors</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ColorPicker
                                label="Primary Color"
                                value={theme.primaryColor || 'var(--color-primary)'}
                                onChange={v => updateTheme('primaryColor', v)}
                                description="Main brand color — buttons, links, headers"
                            />
                            <ColorPicker
                                label="Secondary Color"
                                value={theme.secondaryColor || 'var(--color-secondary)'}
                                onChange={v => updateTheme('secondaryColor', v)}
                                description="Sale badges, accent buttons, highlights"
                            />
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Live Preview</h4>
                        <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                {theme.logoUrl ? (
                                    <img src={theme.logoUrl} alt="Logo" className="h-8 object-contain" />
                                ) : (
                                    <div className="h-8 px-4 rounded-md flex items-center text-white font-bold text-sm" style={{ background: theme.primaryColor || 'var(--color-primary)' }}>
                                        {g.storeName || 'Shohoz Kitchen'}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button className="px-5 py-2 rounded-lg text-white text-xs font-bold" style={{ background: theme.primaryColor || 'var(--color-primary)' }}>
                                    Buy Now
                                </button>
                                <button className="px-5 py-2 rounded-lg text-white text-xs font-bold" style={{ background: theme.secondaryColor || 'var(--color-secondary)' }}>
                                    Sale 50% Off
                                </button>
                                <span className="px-3 py-1.5 rounded-full text-white text-[10px] font-bold" style={{ background: theme.primaryColor || 'var(--color-primary)' }}>
                                    New Arrival
                                </span>
                                <span className="px-3 py-1.5 rounded-full text-white text-[10px] font-bold" style={{ background: theme.secondaryColor || 'var(--color-secondary)' }}>
                                    Hot Deal
                                </span>
                            </div>
                            <div className="mt-3 flex gap-3">
                                <a href="#" className="text-sm font-bold underline" style={{ color: theme.primaryColor || 'var(--color-primary)' }}>Sample Link</a>
                                <span className="text-sm font-bold" style={{ color: theme.secondaryColor || 'var(--color-secondary)' }}>৳2,499</span>
                            </div>
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Logo & Favicon</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SingleImageUploader
                                label="Website Logo"
                                hint="Recommended: 400×120px (PNG/SVG, transparent)"
                                value={theme.logoUrl || ''}
                                onChange={url => updateTheme('logoUrl', url)}
                            />
                            <SingleImageUploader
                                label="Favicon (Site Icon)"
                                hint="Recommended: 512×512px (PNG/SVG, square)"
                                value={theme.faviconUrl || ''}
                                onChange={url => updateTheme('faviconUrl', url)}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 italic">Logo appears in the header & footer. Favicon appears in the browser tab.</p>
                    </div>

                    {/* Reset */}
                    <button
                        onClick={() => {
                            updateTheme('primaryColor', 'var(--color-primary)');
                            updateTheme('secondaryColor', 'var(--color-secondary)');
                            toast.success('Colors reset to default');
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all"
                    >
                        🔄 Reset to Default Colors
                    </button>
                </SettingSection>

                {/* ═══════ GENERAL ═══════ */}
                <SettingSection icon={FiSettings} title="Store Information" description="Basic store identity">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputField label="Store Name" value={g.storeName || ''} onChange={(e: any) => updateGeneral('storeName', e.target.value)} placeholder="Your Store Name" />
                        <InputField label="Tagline" value={g.tagline || ''} onChange={(e: any) => updateGeneral('tagline', e.target.value)} placeholder="Your Store Tagline" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Currency</label>
                            <select value={g.currency || 'BDT'} onChange={(e) => updateGeneral('currency', e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium text-sm"
                            >
                                <option value="BDT">৳ BDT - Bangladeshi Taka</option>
                                <option value="USD">$ USD - US Dollar</option>
                                <option value="EUR">€ EUR - Euro</option>
                                <option value="CNY">¥ CNY - Chinese Yuan</option>
                            </select>
                        </div>
                    </div>
                </SettingSection>

                {/* ═══════ SEO ═══════ */}
                <SettingSection icon={FiGlobe} title="SEO & Marketing" description="Search engine and tracking settings">
                    <InputField label="Meta Title" value={seo.title || ''} onChange={(e: any) => updateSeo('title', e.target.value)} placeholder="Shohoz Kitchen - Your trusted online marketplace" helper="Recommended: 50-60 characters" />
                    <InputField label="Meta Description" type="textarea" value={seo.description || ''} onChange={(e: any) => updateSeo('description', e.target.value)} placeholder="Brief description of your store" helper="Recommended: 150-160 characters" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputField label="Google Analytics ID" value={seo.googleAnalyticsId || ''} onChange={(e: any) => updateSeo('googleAnalyticsId', e.target.value)} placeholder="G-XXXXXXXXXX" helper="Your GA4 measurement ID" />
                        <InputField label="Facebook Pixel ID" value={seo.facebookPixel || ''} onChange={(e: any) => updateSeo('facebookPixel', e.target.value)} placeholder="123456789" helper="For Facebook Ads tracking" />
                    </div>
                </SettingSection>

                {/* ═══════ ACCOUNT SECURITY ═══════ */}
                <SettingSection icon={FiLock} title="Account Security" description="Change the password for your own admin account">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <InputField label="Current Password" type="password" value={pw.currentPassword} onChange={(e: any) => setPw({ ...pw, currentPassword: e.target.value })} placeholder="••••••••" />
                        <InputField label="New Password" type="password" value={pw.newPassword} onChange={(e: any) => setPw({ ...pw, newPassword: e.target.value })} placeholder="At least 6 characters" helper="Minimum 6 characters" />
                        <InputField label="Confirm New Password" type="password" value={pw.confirmPassword} onChange={(e: any) => setPw({ ...pw, confirmPassword: e.target.value })} placeholder="••••••••" />
                    </div>
                    <button
                        onClick={handleChangePassword}
                        disabled={isChangingPw}
                        className="px-6 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-900 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                        <FiLock size={15} /> {isChangingPw ? 'Changing…' : 'Change Password'}
                    </button>
                </SettingSection>

                {/* ═══════ SYSTEM INFO ═══════ */}
                <SettingSection icon={FiShield} title="System Information" description="Current system status">
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'App Version', value: 'v1.0.0' },
                            { label: 'Framework', value: 'Next.js 16' },
                            { label: 'API Status', value: 'Connected', ok: true },
                            { label: 'Database', value: 'MongoDB Atlas', ok: true },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                                <span className={`text-xs font-bold flex items-center gap-1 ${(item as any).ok ? 'text-green-600' : 'text-gray-700'}`}>
                                    {(item as any).ok && <FiCheckCircle size={11} />}
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </SettingSection>

            </div>
        </div>
    );
}
