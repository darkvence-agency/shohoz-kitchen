/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useGetSiteContentQuery, useUpdateSiteContentMutation, useGetAllLegalPagesQuery, useUpdateLegalPageMutation } from '@/redux/api/siteContentApi';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import {
    FiPhone, FiMessageCircle, FiLayout, FiFileText, FiImage,
    FiSave, FiPlus, FiTrash2, FiCheckCircle, FiArrowUp, FiArrowDown,
} from 'react-icons/fi';
import { SingleImageUploader } from '@/components/ui/ImageUploader';
import { telHref, whatsappHref, messengerHref, messengerId } from '@/utils/contactLinks';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <div style={{ height: '350px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} /> });
import 'react-quill-new/dist/quill.snow.css';

/* ─── Styles ─── */
const card: React.CSSProperties = { background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '20px', marginBottom: '16px' };
const label: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#555', display: 'block', marginBottom: '5px' };
const input: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const };
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s' };
const btnPrimary: React.CSSProperties = { ...btn, background: 'var(--color-primary)', color: '#fff' };
const btnDanger: React.CSSProperties = { ...btn, background: '#fef2f2', color: '#dc2626', padding: '6px 10px' };
const btnSmall: React.CSSProperties = { ...btn, background: '#f3f4f6', color: '#333', padding: '6px 12px', fontSize: '12px' };

/* ─── Tabs Config ─── */
const TABS = [
    { key: 'hero', label: '🖼️ Hero Slides', icon: FiImage },
    { key: 'contact', label: 'Contact Page', icon: FiPhone },
    { key: 'floating', label: 'Floating Widget', icon: FiMessageCircle },
    { key: 'footer', label: 'Footer', icon: FiLayout },
    { key: 'legal', label: 'Legal Pages', icon: FiFileText },
];

export default function SiteContentPage() {
    const { data: res, isLoading } = useGetSiteContentQuery({});
    const [updateContent, { isLoading: isSaving }] = useUpdateSiteContentMutation();
    const [activeTab, setActiveTab] = useState('contact');
    const [formData, setFormData] = useState<any>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (res?.data) {
            const copy = JSON.parse(JSON.stringify(res.data));
            // Floating buttons that merely repeat Contact Info are switched to follow it.
            const relinked = linkFloatingToContact(copy);
            if (relinked.length) copy.__floatingRelinked = relinked;
            setFormData(copy);
        }
    }, [res]);

    const handleSave = async () => {
        if (activeTab === 'legal') return; // Legal pages have their own save
        try {
            const payload: any = {};
            if (activeTab === 'hero') {
                payload.heroSlides = formData.heroSlides;
            } else {
                payload[activeTab] = formData[activeTab];
            }
            if (activeTab === 'contact') {
                const tidy = (list: unknown) => (Array.isArray(list) ? list : []).map((v) => String(v ?? '').trim()).filter(Boolean);
                payload.contact = { ...formData.contact, phones: tidy(formData.contact?.phones), emails: tidy(formData.contact?.emails) };
            }
            // Saving Contact Info also stores the floating buttons' link to it, so a later
            // change of number reaches the buttons too.
            if (activeTab === 'contact' && (formData.__floatingRelinked || formData.__saveFloatingWithContact)) payload.floating = formData.floating;
            await updateContent(payload).unwrap();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
            toast.success('Saved successfully!');
        } catch {
            toast.error('Failed to save');
        }
    };

    if (isLoading || !formData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111', margin: 0 }}>Site Content</h1>
                    <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>Manage dynamic content across your website</p>
                </div>
                <button onClick={handleSave} disabled={isSaving} style={{ ...btnPrimary, opacity: isSaving ? 0.6 : 1 }}>
                    {saveSuccess ? <><FiCheckCircle size={14} /> Saved!</> : <><FiSave size={14} /> {isSaving ? 'Saving...' : 'Save Changes'}</>}
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap', borderBottom: '1px solid #eee', paddingBottom: '1px' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 14px', border: 'none', cursor: 'pointer',
                            fontSize: '12.5px', fontWeight: activeTab === tab.key ? 700 : 500,
                            color: activeTab === tab.key ? 'var(--color-primary)' : '#888',
                            background: activeTab === tab.key ? 'var(--color-primary-lightest)' : 'transparent',
                            borderRadius: '6px 6px 0 0',
                            borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'hero' && <HeroSlidesTab data={formData} setData={setFormData} onSave={handleSave} isSaving={isSaving} />}
            {activeTab === 'contact' && <ContactTab data={formData} setData={setFormData} />}
            {activeTab === 'floating' && <FloatingTab data={formData} setData={setFormData} />}
            {activeTab === 'footer' && <FooterTab data={formData} setData={setFormData} />}
            {activeTab === 'legal' && <LegalPagesTab />}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── CONTACT TAB ─── */
function ContactTab({ data, setData }: { data: any; setData: any }) {
    const c = data.contact || {};

    const updateField = (field: string, value: any) => {
        setData((p: any) => ({ ...p, contact: { ...p.contact, [field]: value } }));
    };

    // Phones / emails are lists (the storefront shows them all); the first one is also the
    // main `phone` / `email` used for tel: / mailto: links.
    const listOf = (listKey: string, singleKey: string): string[] =>
        Array.isArray(c[listKey]) && c[listKey].length > 0 ? c[listKey] : c[singleKey] ? [c[singleKey]] : [];
    const setList = (listKey: string, singleKey: string, list: string[]) =>
        setData((p: any) => ({
            ...p,
            contact: { ...p.contact, [listKey]: list, [singleKey]: list.map((v) => v.trim()).find(Boolean) || '' },
        }));
    const phones = listOf('phones', 'phone');
    const emails = listOf('emails', 'email');

    // Empties every contact detail (and the floating buttons' own copies) — the storefront
    // then shows no number, email or address until new ones are added. Saved on "Save Changes".
    const clearAll = () => {
        if (!window.confirm('Clear all phone numbers, WhatsApp, Messenger, emails, addresses and the website? Nothing will be clickable on the website until you add new ones.')) return;
        setData((p: any) => ({
            ...p,
            contact: {
                ...p.contact,
                phone: '', phones: [], whatsapp: '', messenger: '', email: '', emails: [],
                address: '', corporateOffice: '', warehouse: '', website: '',
            },
            floating: { ...p.floating, phone: '', whatsapp: '', messenger: '' },
            __saveFloatingWithContact: true,
        }));
        toast.success('Cleared — click Save Changes to apply');
    };

    const addHour = () => {
        setData((p: any) => ({ ...p, contact: { ...p.contact, hours: [...(p.contact.hours || []), { day: '', time: '' }] } }));
    };
    const removeHour = (idx: number) => {
        setData((p: any) => ({ ...p, contact: { ...p.contact, hours: p.contact.hours.filter((_: any, i: number) => i !== idx) } }));
    };
    const updateHour = (idx: number, field: string, value: string) => {
        setData((p: any) => {
            const h = [...p.contact.hours]; h[idx] = { ...h[idx], [field]: value };
            return { ...p, contact: { ...p.contact, hours: h } };
        });
    };

    const addTip = () => updateField('tips', [...(c.tips || []), '']);
    const removeTip = (idx: number) => updateField('tips', c.tips.filter((_: any, i: number) => i !== idx));
    const updateTip = (idx: number, value: string) => {
        const tips = [...c.tips]; tips[idx] = value;
        updateField('tips', tips);
    };

    const addSubject = () => updateField('subjects', [...(c.subjects || []), '']);
    const removeSubject = (idx: number) => updateField('subjects', c.subjects.filter((_: any, i: number) => i !== idx));
    const updateSubject = (idx: number, value: string) => {
        const subs = [...c.subjects]; subs[idx] = value;
        updateField('subjects', subs);
    };

    const addSocial = () => updateField('socials', [...(c.socials || []), { label: '', url: '', color: '#000000' }]);
    const removeSocial = (idx: number) => updateField('socials', c.socials.filter((_: any, i: number) => i !== idx));
    const updateSocial = (idx: number, field: string, value: string) => {
        const s = [...c.socials]; s[idx] = { ...s[idx], [field]: value };
        updateField('socials', s);
    };

    return (
        <div>
            {/* Status Badge */}
            <div style={{ ...card, background: 'var(--color-primary-lightest)', borderColor: '#bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiCheckCircle size={16} color="#16a34a" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>Active — This data is used on the <strong>Contact Us</strong> page</span>
                </div>
            </div>

            {/* Basic Info */}
            <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', margin: '0 0 14px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Contact Information</h3>
                    <button type="button" onClick={clearAll} style={btnDanger}><FiTrash2 size={13} /> Clear all contact details</button>
                </div>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 12px' }}>
                    Empty fields are hidden on the website and nothing is clickable for them.
                </p>

                {/* Phone numbers (first = main) */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <label style={{ ...label, marginBottom: 0 }}>Phone Numbers <span style={{ fontWeight: 400, color: '#999' }}>(the first one is the main number)</span></label>
                        <button type="button" onClick={() => setList('phones', 'phone', [...phones, ''])} style={btnSmall}><FiPlus size={13} /> Add phone</button>
                    </div>
                    {phones.map((ph, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                            <input value={ph} onChange={e => setList('phones', 'phone', phones.map((v, i) => (i === idx ? e.target.value : v)))} placeholder="01XXXXXXXXX" style={{ ...input, flex: 1 }} />
                            <button type="button" onClick={() => setList('phones', 'phone', phones.filter((_, i) => i !== idx))} style={btnDanger}><FiTrash2 size={13} /></button>
                        </div>
                    ))}
                    {phones.length === 0 && <p style={{ fontSize: '12px', color: '#bbb', margin: '4px 0 0' }}>No phone number added.</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ gridColumn: 'span 2' }}><label style={label}>WhatsApp Number</label><input value={c.whatsapp || ''} onChange={e => updateField('whatsapp', e.target.value)} placeholder="01XXXXXXXXX" style={input} /></div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={label}>Messenger (Facebook page link or username)</label>
                        <input value={c.messenger || ''} onChange={e => updateField('messenger', e.target.value)} placeholder="facebook.com/shohozkitchen  or  shohozkitchen" style={input} />
                        <p style={{ fontSize: '11px', color: messengerId(c.messenger) || !c.messenger ? '#888' : '#dc2626', margin: '4px 0 0' }}>
                            {!c.messenger
                                ? 'Leave empty if you do not use Messenger.'
                                : messengerId(c.messenger)
                                    ? <>Opens <a href={messengerHref(c.messenger)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>{messengerHref(c.messenger)}</a></>
                                    : 'This does not look like a Facebook page link or username.'}
                        </p>
                    </div>
                    <p style={{ gridColumn: 'span 2', fontSize: '11px', color: '#888', margin: 0 }}>
                        The Phone, WhatsApp and Messenger above also power the floating Call / WhatsApp / Messenger buttons on every page (see the Floating Widget tab).
                    </p>
                    <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <label style={{ ...label, marginBottom: 0 }}>Emails <span style={{ fontWeight: 400, color: '#999' }}>(the first one is the main email)</span></label>
                            <button type="button" onClick={() => setList('emails', 'email', [...emails, ''])} style={btnSmall}><FiPlus size={13} /> Add email</button>
                        </div>
                        {emails.map((em, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                                <input value={em} onChange={e => setList('emails', 'email', emails.map((v, i) => (i === idx ? e.target.value : v)))} placeholder="name@example.com" style={{ ...input, flex: 1 }} />
                                <button type="button" onClick={() => setList('emails', 'email', emails.filter((_, i) => i !== idx))} style={btnDanger}><FiTrash2 size={13} /></button>
                            </div>
                        ))}
                        {emails.length === 0 && <p style={{ fontSize: '12px', color: '#bbb', margin: '4px 0 0' }}>No email added.</p>}
                    </div>
                    <div><label style={label}>Primary Address</label><input value={c.address || ''} onChange={e => updateField('address', e.target.value)} style={input} /></div>
                    <div><label style={label}>Corporate Office</label><input value={c.corporateOffice || ''} onChange={e => updateField('corporateOffice', e.target.value)} placeholder="Head office address" style={input} /></div>
                    <div><label style={label}>Warehouse Address</label><input value={c.warehouse || ''} onChange={e => updateField('warehouse', e.target.value)} placeholder="Warehouse address" style={input} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label style={label}>Website URL</label><input value={c.website || ''} onChange={e => updateField('website', e.target.value)} placeholder="shohozkitchen.com" style={input} /></div>
                </div>
            </div>

            {/* Business Hours */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Business Hours</h3>
                    <button onClick={addHour} style={btnSmall}><FiPlus size={13} /> Add</button>
                </div>
                {(c.hours || []).map((h: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                        <input value={h.day} onChange={e => updateHour(idx, 'day', e.target.value)} placeholder="Day (e.g. Sunday – Thursday)" style={{ ...input, flex: 1 }} />
                        <input value={h.time} onChange={e => updateHour(idx, 'time', e.target.value)} placeholder="Time (e.g. 9 AM – 6 PM)" style={{ ...input, flex: 1 }} />
                        <button onClick={() => removeHour(idx)} style={btnDanger}><FiTrash2 size={13} /></button>
                    </div>
                ))}
                {(c.hours || []).length === 0 && <p style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', padding: '12px' }}>No hours added yet.</p>}
            </div>

            {/* Subjects */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Form Subjects</h3>
                    <button onClick={addSubject} style={btnSmall}><FiPlus size={13} /> Add</button>
                </div>
                {(c.subjects || []).map((s: string, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                        <input value={s} onChange={e => updateSubject(idx, e.target.value)} placeholder="Subject option..." style={{ ...input, flex: 1 }} />
                        <button onClick={() => removeSubject(idx)} style={btnDanger}><FiTrash2 size={13} /></button>
                    </div>
                ))}
                {(c.subjects || []).length === 0 && <p style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', padding: '12px' }}>No subjects added yet.</p>}
            </div>

            {/* Tips */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Quick Tips</h3>
                    <button onClick={addTip} style={btnSmall}><FiPlus size={13} /> Add</button>
                </div>
                {(c.tips || []).map((t: string, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                        <input value={t} onChange={e => updateTip(idx, e.target.value)} placeholder="Tip text..." style={{ ...input, flex: 1 }} />
                        <button onClick={() => removeTip(idx)} style={btnDanger}><FiTrash2 size={13} /></button>
                    </div>
                ))}
                {(c.tips || []).length === 0 && <p style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', padding: '12px' }}>No tips added yet.</p>}
            </div>

            {/* Social Links */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Social Links</h3>
                    <button onClick={addSocial} style={btnSmall}><FiPlus size={13} /> Add</button>
                </div>
                {(c.socials || []).map((s: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                        <input value={s.label} onChange={e => updateSocial(idx, 'label', e.target.value)} placeholder="Label" style={{ ...input, width: '120px' }} />
                        <input value={s.url} onChange={e => updateSocial(idx, 'url', e.target.value)} placeholder="URL" style={{ ...input, flex: 1 }} />
                        <input type="color" value={s.color} onChange={e => updateSocial(idx, 'color', e.target.value)} style={{ width: '36px', height: '32px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', padding: '2px' }} />
                        <button onClick={() => removeSocial(idx)} style={btnDanger}><FiTrash2 size={13} /></button>
                    </div>
                ))}
                {(c.socials || []).length === 0 && <p style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', padding: '12px' }}>No socials added yet.</p>}
            </div>
        </div>
    );
}

/* ─── FLOATING TAB ─── */
// The floating Call / WhatsApp / Messenger buttons. Each one follows Contact Info
// (empty value here) unless the admin gives it its own number or page.
const FLOATING_CHANNELS = [
    { key: 'phone', showKey: 'showPhone', title: 'Call button', contactLabel: 'Phone Number', href: telHref, placeholder: '01XXXXXXXXX', color: '#2563eb', invalid: 'Enter a phone number.' },
    { key: 'whatsapp', showKey: 'showWhatsapp', title: 'WhatsApp button', contactLabel: 'WhatsApp Number', href: whatsappHref, placeholder: '01XXXXXXXXX', color: '#25D366', invalid: 'Enter a WhatsApp number.' },
    { key: 'messenger', showKey: 'showMessenger', title: 'Messenger button', contactLabel: 'Messenger', href: messengerHref, placeholder: 'facebook.com/shohozkitchen  or  shohozkitchen', color: '#0084FF', invalid: 'Enter a Facebook page link or username.' },
] as const;

/**
 * Floating values that only repeat Contact Info (or the seed's "YOUR_PAGE_USERNAME")
 * become '' so those buttons follow Contact Info. Returns the keys that changed.
 */
function linkFloatingToContact(site: any): string[] {
    const f = site?.floating;
    if (!f) return [];
    const c = site.contact || {};
    const changed: string[] = [];
    for (const ch of FLOATING_CHANNELS) {
        const own = String(f[ch.key] || '').trim();
        if (!own) continue;
        const sameAsContact = !!c[ch.key] && ch.href(own) !== '' && ch.href(own) === ch.href(c[ch.key]);
        const placeholder = ch.key === 'messenger' && !messengerId(own);
        if (sameAsContact || placeholder) { f[ch.key] = ''; changed.push(ch.title); }
    }
    return changed;
}

function FloatingTab({ data, setData }: { data: any; setData: any }) {
    const f = data.floating || {};
    const c = data.contact || {};
    const update = (field: string, value: any) => setData((p: any) => ({ ...p, floating: { ...p.floating, [field]: value } }));
    // Remembered per channel while the admin is typing an own number (it starts empty).
    const [custom, setCustom] = useState<Record<string, boolean>>({});
    const relinked: string[] = data.__floatingRelinked || [];

    return (
        <div>
            <div style={card}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>Floating Contact Buttons</h3>
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                    The round Call / WhatsApp / Messenger buttons at the bottom-right of every page. By default each one uses the number or page from the <strong>Contact Page</strong> tab, so you only change it in one place.
                </p>
                {relinked.length > 0 && (
                    <p style={{ fontSize: '12px', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '7px', padding: '8px 10px', margin: '12px 0 0' }}>
                        {relinked.join(', ')} had its own copy of the contact details (or the sample “YOUR_PAGE_USERNAME”). It is now set to follow Contact Info — click <strong>Save Changes</strong> to keep this.
                    </p>
                )}
            </div>

            {FLOATING_CHANNELS.map((ch) => {
                const own = String(f[ch.key] || '');
                const linked = !own && !custom[ch.key];
                const value = linked ? String(c[ch.key] || '') : own;
                const href = ch.href(value);
                const shown = f[ch.showKey] !== false;
                return (
                    <div key={ch.key} style={{ ...card, borderLeft: `4px solid ${ch.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{ch.title}</h3>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#555', cursor: 'pointer' }}>
                                <input type="checkbox" checked={shown} onChange={(e) => update(ch.showKey, e.target.checked)} />
                                Show on the website
                            </label>
                        </div>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#333', cursor: 'pointer', marginBottom: '8px' }}>
                            <input
                                type="checkbox"
                                checked={linked}
                                onChange={(e) => {
                                    if (e.target.checked) { update(ch.key, ''); setCustom((m) => ({ ...m, [ch.key]: false })); }
                                    else setCustom((m) => ({ ...m, [ch.key]: true }));
                                }}
                            />
                            Same as Contact Info ({ch.contactLabel})
                        </label>

                        {linked ? (
                            <div style={{ ...input, background: '#f9fafb', color: c[ch.key] ? '#333' : '#aaa' }}>
                                {c[ch.key] || `Not set in the Contact Page tab yet`}
                            </div>
                        ) : (
                            <input value={own} onChange={(e) => update(ch.key, e.target.value)} placeholder={ch.placeholder} style={input} autoFocus={!!custom[ch.key] && !own} />
                        )}

                        <p style={{ fontSize: '11px', margin: '6px 0 0', color: href ? '#888' : '#dc2626' }}>
                            {href ? (
                                <>
                                    {shown ? 'Opens ' : 'Hidden. Would open '}
                                    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>{href}</a>
                                </>
                            ) : (
                                <>{ch.invalid} Until then this button stays hidden.</>
                            )}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── FOOTER TAB ─── */
function FooterTab({ data, setData }: { data: any; setData: any }) {
    const f = data.footer || {};
    const update = (field: string, value: any) => setData((p: any) => ({ ...p, footer: { ...p.footer, [field]: value } }));

    return (
        <div style={card}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>Footer Settings</h3>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 16px' }}>Manage footer text displayed at the bottom of every page.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={label}>Company Name</label><input value={f.companyName || ''} onChange={e => update('companyName', e.target.value)} style={input} /></div>
                <div><label style={label}>Copyright Text (optional)</label><input value={f.copyright || ''} onChange={e => update('copyright', e.target.value)} placeholder="Leave empty for auto year" style={input} /></div>
            </div>
        </div>
    );
}

/* ─── LEGAL PAGES TAB ─── */
function LegalPagesTab() {
    const { data: legalRes, isLoading } = useGetAllLegalPagesQuery({});
    const [updateLegalPage, { isLoading: isSavingLegal }] = useUpdateLegalPageMutation();
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    const pages = legalRes?.data || [];

    const LEGAL_PAGES = [
        { slug: 'terms', label: 'Terms & Conditions', icon: '📜', color: 'var(--color-primary)' },
        { slug: 'privacy', label: 'Privacy Policy', icon: '🛡️', color: '#2563eb' },
        { slug: 'refund', label: 'Refund Policy', icon: '🔄', color: '#d97706' },
    ];

    const startEdit = (slug: string) => {
        const page = pages.find((p: any) => p.slug === slug);
        setEditingSlug(slug);
        setEditTitle(page?.title || LEGAL_PAGES.find(l => l.slug === slug)?.label || '');
        setEditContent(page?.content || '');
    };

    const handleSaveLegal = async () => {
        if (!editingSlug) return;
        try {
            await updateLegalPage({ slug: editingSlug, data: { title: editTitle, content: editContent } }).unwrap();
            toast.success(`${editTitle} saved!`);
            setEditingSlug(null);
        } catch {
            toast.error('Failed to save');
        }
    };

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid #e5e7eb', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            </div>
        );
    }

    // Editing Mode
    if (editingSlug) {
        const meta = LEGAL_PAGES.find(l => l.slug === editingSlug);
        return (
            <div>
                <div style={{ ...card, borderColor: meta?.color + '40' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>{meta?.icon}</span>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Editing: {meta?.label}</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setEditingSlug(null)} style={{ ...btn, background: '#f3f4f6', color: '#555' }}>Cancel</button>
                            <button onClick={handleSaveLegal} disabled={isSavingLegal} style={{ ...btnPrimary, opacity: isSavingLegal ? 0.6 : 1 }}>
                                <FiSave size={13} /> {isSavingLegal ? 'Saving...' : 'Save Page'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={label}>Page Title</label>
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={input} placeholder="Page title..." />
                    </div>

                    <div>
                        <label style={label}>Page Content</label>
                        <div className="legal-editor-wrapper" style={{ background: '#fff', borderRadius: '8px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
                            <ReactQuill
                                theme="snow"
                                value={editContent}
                                onChange={(value: string) => setEditContent(value)}
                                placeholder="Write your page content here..."
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
                                style={{ minHeight: '400px' }}
                            />
                        </div>
                        <style>{`
                            .legal-editor-wrapper .ql-toolbar { border: none !important; border-bottom: 1px solid #e5e7eb !important; background: #f9fafb; padding: 10px 12px !important; }
                            .legal-editor-wrapper .ql-container { border: none !important; font-size: 14px; font-family: inherit; }
                            .legal-editor-wrapper .ql-editor { min-height: 400px; padding: 20px 24px; line-height: 1.8; }
                            .legal-editor-wrapper .ql-editor h1 { font-size: 22px; font-weight: 800; margin: 20px 0 10px; }
                            .legal-editor-wrapper .ql-editor h2 { font-size: 18px; font-weight: 700; margin: 18px 0 8px; }
                            .legal-editor-wrapper .ql-editor h3 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; }
                            .legal-editor-wrapper .ql-editor p { margin-bottom: 10px; }
                            .legal-editor-wrapper .ql-editor img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
                        `}</style>
                    </div>
                </div>
            </div>
        );
    }

    // List Mode
    return (
        <div>
            <div style={{ ...card, background: 'var(--color-primary-surface)', borderColor: '#bbf7d0' }}>
                <p style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, margin: 0 }}>
                    ✅ These pages are live at: <strong>/terms</strong>, <strong>/privacy</strong>, <strong>/refund</strong>
                </p>
            </div>
            {LEGAL_PAGES.map(lp => {
                const page = pages.find((p: any) => p.slug === lp.slug);
                const hasContent = page?.content && page.content.length > 10;
                return (
                    <div key={lp.slug} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>{lp.icon}</span>
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px', color: '#111' }}>{lp.label}</h4>
                                <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
                                    {hasContent ? `${page.content.replace(/<[^>]+>/g, '').substring(0, 80)}...` : 'No content yet'}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                                background: hasContent ? 'var(--color-primary-lightest)' : '#fef2f2',
                                color: hasContent ? '#16a34a' : '#dc2626',
                                textTransform: 'uppercase',
                            }}>
                                {hasContent ? 'Published' : 'Empty'}
                            </span>
                            <button onClick={() => startEdit(lp.slug)} style={{ ...btnSmall, fontWeight: 700 }}>
                                ✏️ Edit
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ─── HERO SLIDES TAB ─── */
function HeroSlidesTab({ data, setData, onSave, isSaving }: { data: any; setData: any; onSave: () => void; isSaving: boolean }) {
    const slides = data.heroSlides || [];

    const addSlide = (imageUrl: string) => {
        if (!imageUrl) return;
        const newSlides = [...slides, { imageUrl, active: true, order: slides.length }];
        setData((p: any) => ({ ...p, heroSlides: newSlides }));
    };

    const removeSlide = (idx: number) => {
        const newSlides = slides.filter((_: any, i: number) => i !== idx);
        setData((p: any) => ({ ...p, heroSlides: newSlides }));
    };

    const moveSlide = (idx: number, direction: 'up' | 'down') => {
        const newSlides = [...slides];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= newSlides.length) return;
        [newSlides[idx], newSlides[swapIdx]] = [newSlides[swapIdx], newSlides[idx]];
        setData((p: any) => ({ ...p, heroSlides: newSlides }));
    };

    const handleSaveHero = async () => {
        // Update heroSlides in formData then trigger parent save
        onSave();
    };

    return (
        <div>
            {/* Info */}
            <div style={{ ...card, background: '#fffbeb', borderColor: '#fde68a' }}>
                <p style={{ fontSize: '12px', color: '#b45309', fontWeight: 600, margin: 0 }}>
                    🖼️ Hero slides appear at the top of your homepage as a banner carousel. Add multiple images and they will auto-rotate.
                </p>
            </div>

            {/* Current Slides */}
            {slides.length > 0 && (
                <div style={{ ...card }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Current Slides ({slides.length})</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {slides.map((slide: any, idx: number) => (
                            <div key={idx} style={{
                                position: 'relative', borderRadius: '10px', overflow: 'hidden',
                                border: '1px solid #e5e7eb', background: '#f9fafb',
                            }}>
                                <img
                                    src={slide.imageUrl}
                                    alt={`Slide ${idx + 1}`}
                                    style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                                />
                                <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>Slide {idx + 1}</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => moveSlide(idx, 'up')}
                                            disabled={idx === 0}
                                            style={{ ...btnSmall, padding: '4px 6px', opacity: idx === 0 ? 0.3 : 1 }}
                                            title="Move Up"
                                        >
                                            <FiArrowUp size={12} />
                                        </button>
                                        <button
                                            onClick={() => moveSlide(idx, 'down')}
                                            disabled={idx === slides.length - 1}
                                            style={{ ...btnSmall, padding: '4px 6px', opacity: idx === slides.length - 1 ? 0.3 : 1 }}
                                            title="Move Down"
                                        >
                                            <FiArrowDown size={12} />
                                        </button>
                                        <button
                                            onClick={() => removeSlide(idx)}
                                            style={{ ...btnSmall, padding: '4px 6px', background: '#fef2f2', color: '#dc2626' }}
                                            title="Delete"
                                        >
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add New Slide */}
            <div style={card}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>Add New Slide</h3>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 12px' }}>
                    Upload a high-quality banner image (recommended: 1920×540px or 16:4.5 ratio)
                </p>
                <SingleImageUploader
                    label="Slide Image"
                    value=""
                    onChange={(url) => { if (url) addSlide(url); }}
                />
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={handleSaveHero} disabled={isSaving} style={{ ...btnPrimary, opacity: isSaving ? 0.6 : 1 }}>
                    <FiSave size={13} /> {isSaving ? 'Saving...' : 'Save Hero Slides'}
                </button>
            </div>
        </div>
    );
}
