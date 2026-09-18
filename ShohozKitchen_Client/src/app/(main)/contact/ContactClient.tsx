/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import {
    FiPhone, FiMail, FiMapPin, FiSend, FiCheckCircle,
    FiClock, FiMessageCircle, FiChevronRight,
} from 'react-icons/fi';
import { BsWhatsapp } from 'react-icons/bs';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import { useCreateInquiryMutation } from '@/redux/api/inquiryApi';
import { toast } from 'react-hot-toast';

/* ─── Types ─── */
type FormState = { name: string; email: string; phone: string; subject: string; message: string };

/* ─── Client Component ─── */
export default function ContactClient() {
    const { data: res } = useGetSiteContentQuery({});
    const c = res?.data?.contact || {};
    const [createInquiry] = useCreateInquiryMutation();

    const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', subject: '', message: '' });
    const [focusField, setFocusField] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Partial<FormState>>({});

    const validate = () => {
        const e: Partial<FormState> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
        if (!form.message.trim()) e.message = 'Message is required';
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
        if (errors[name as keyof FormState]) setErrors(p => ({ ...p, [name]: undefined }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        try {
            await createInquiry({
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || form.email.trim(),
                subject: form.subject || 'General Inquiry',
                message: form.message.trim(),
            }).unwrap();
            setSubmitted(true);
            toast.success('Your message has been sent successfully!');
            setForm({ name: '', email: '', phone: '', subject: '', message: '' });
            setTimeout(() => setSubmitted(false), 5000);
        } catch {
            toast.error('Failed to send message. Please try again or reach out on WhatsApp.');
        } finally {
            setLoading(false);
        }
    };

    /* ─── Helpers ─── */
    const field = (name: keyof FormState): React.CSSProperties => ({
        width: '100%',
        padding: '10px 14px',
        border: `1.5px solid ${errors[name] ? 'var(--color-secondary)' : focusField === name ? 'var(--color-primary)' : '#e5e7eb'}`,
        borderRadius: '8px',
        fontSize: '13.5px',
        color: '#1a1a1a',
        background: focusField === name ? '#f7fbf9' : '#fafafa',
        outline: 'none',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box' as const,
        boxShadow: focusField === name ? '0 0 0 3px rgba(79,70,229,0.08)' : 'none',
    });

    /* ─── Normalize WhatsApp number to wa.me format (88 + local, digits only) ─── */
    const waDigits = (c.whatsapp || '').replace(/\D/g, '');
    const waNumber = waDigits.startsWith('880')
        ? waDigits
        : waDigits.startsWith('0')
            ? '88' + waDigits
            : waDigits
                ? '880' + waDigits
                : '';

    /* ─── Contact defaults (Shohoz Kitchen) ─── */
    const PHONE_LIST: string[] = (Array.isArray(c.phones) && c.phones.length > 0)
        ? c.phones
        : (c.phone ? [c.phone] : ['01611829111', '01955668133', '01624033566']);
    const EMAIL_LIST: string[] = (Array.isArray(c.emails) && c.emails.length > 0)
        ? c.emails
        : (c.email ? [c.email] : ['info@shohozkitchen.com']);
    // const WEBSITE: string = c.website || 'shohozkitchen.com';
    const PRIMARY_PHONE = PHONE_LIST[0];
    const PRIMARY_EMAIL = EMAIL_LIST[0];

    /* ─── Dynamic Data ─── */
    const CONTACT_CARDS = [
        {
            icon: <FiPhone size={22} />,
            label: 'Call Us',
            primary: PHONE_LIST.join(' / '),
            secondary: 'Sun – Thu, 9 AM – 6 PM',
            href: `tel:${PRIMARY_PHONE}`,
            accent: 'var(--color-primary)',
        },
        {
            icon: <BsWhatsapp size={22} />,
            label: 'WhatsApp',
            primary: c.whatsapp || PRIMARY_PHONE,
            secondary: 'Quick reply within minutes',
            href: `https://wa.me/${waNumber}`,
            accent: '#25D366',
        },
        {
            icon: <FiMail size={22} />,
            label: 'Email Us',
            primary: EMAIL_LIST.join(' / '),
            secondary: 'We reply within 24 hours',
            href: `mailto:${PRIMARY_EMAIL}`,
            accent: '#4F46E5',
        },
        {
            icon: <FiMapPin size={22} />,
            label: 'Corporate Office',
            primary: c.corporateOffice || c.address || '13/7, Gulistan Shopping Complex, Shaheed Abrar Fahad Avenue, Dhaka-1000',
            secondary: 'Warehouse: ' + (c.warehouse || 'Badsha Electronics Ltd, Vimbazar, Bhawa Mirzapur, Gazipur Sadar, Gazipur-1703'),
            href: `https://maps.google.com/?q=${encodeURIComponent(c.corporateOffice || '13/7, Gulistan Shopping Complex, Dhaka-1000')}`,
            accent: 'var(--color-secondary)',
        },
    ];

    const HOURS = (c.hours || []).map((h: any) => ({ day: h.day, time: h.time }));
    const SUBJECTS = c.subjects || [];
    const TIPS = c.tips || [];
    const SOCIALS = c.socials || [];

    return (
        <div style={{ background: '#fff', minHeight: '100vh' }}>

            {/* ══════════ HERO BANNER ══════════ */}
            <div style={{
                background: 'linear-gradient(180deg, #f8f9fb 0%, #f1f3f6 100%)',
                borderBottom: '1px solid #e5e7eb',
                padding: '44px 0 40px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* soft decorative circles */}
                <div style={{
                    position: 'absolute', top: '-80px', right: '-80px',
                    width: '300px', height: '300px',
                    borderRadius: '50%', background: 'rgba(79,70,229,0.04)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-60px', left: '5%',
                    width: '200px', height: '200px',
                    borderRadius: '50%', background: 'rgba(79,70,229,0.03)',
                    pointerEvents: 'none',
                }} />

                <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Home</span>
                        <FiChevronRight size={12} color="#9ca3af" />
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Contact Us</span>
                    </div>

                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px', lineHeight: 1.2 }}>
                        Get In Touch
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 auto', maxWidth: '460px', lineHeight: 1.75 }}>
                        Have a question, feedback, or need assistance with your order? Our team is ready to help you every step of the way.
                    </p>
                </div>
            </div>

            {/* ══════════ CONTACT CARDS ══════════ */}
            <div className="container" style={{ marginTop: '-1px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1px',
                    background: '#e5e7eb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0 0 12px 12px',
                    overflow: 'hidden',
                    marginBottom: '36px',
                }}>
                    {CONTACT_CARDS.map((card, i) => (
                        <a
                            key={i}
                            href={card.href}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '24px 16px',
                                background: '#fff',
                                textDecoration: 'none',
                                transition: 'background 0.2s ease',
                                textAlign: 'center',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f7fbf9')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                        >
                            <div style={{
                                width: '48px', height: '48px',
                                borderRadius: '12px',
                                background: `${card.accent}14`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: card.accent,
                                flexShrink: 0,
                            }}>
                                {card.icon}
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {card.label}
                                </p>
                                <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 2px' }}>
                                    {card.primary}
                                </p>
                                <p style={{ fontSize: '11.5px', color: '#9ca3af', margin: 0 }}>
                                    {card.secondary}
                                </p>
                            </div>
                        </a>
                    ))}
                </div>

                {/* ══════════ MAIN CONTENT ══════════ */}
                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '40px' }}>

                    {/* ─── LEFT: Form ─── */}
                    <div style={{ flex: '1 1 380px' }}>
                        {/* Section heading */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: 'var(--color-primary)14', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)',
                            }}>
                                <FiMessageCircle size={16} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Send Us a Message</h2>
                                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>We&apos;ll get back to you within 24 hours</p>
                            </div>
                        </div>

                        {/* Success Banner */}
                        {submitted && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                background: 'linear-gradient(135deg, var(--color-primary-lightest), var(--color-primary-border))',
                                border: '1.5px solid #16a34a',
                                borderRadius: '10px', padding: '14px 16px',
                                marginBottom: '20px', color: '#15803d',
                                animation: 'fadeIn 0.3s ease-out',
                            }}>
                                <FiCheckCircle size={18} />
                                <div>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Message sent successfully!</p>
                                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Our team will reply within 24 hours.</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Name + Phone */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 160px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                                        Full Name <span style={{ color: 'var(--color-secondary)' }}>*</span>
                                    </label>
                                    <input name="name" value={form.name} onChange={handleChange} placeholder="Your full name"
                                        style={field('name')}
                                        onFocus={() => setFocusField('name')}
                                        onBlur={() => setFocusField(null)} />
                                    {errors.name && <p style={{ fontSize: '11px', color: 'var(--color-secondary)', margin: '3px 0 0' }}>{errors.name}</p>}
                                </div>
                                <div style={{ flex: '1 1 160px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>Phone Number</label>
                                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="01XXXXXXXXX"
                                        style={field('phone')}
                                        onFocus={() => setFocusField('phone')}
                                        onBlur={() => setFocusField(null)} />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                                    Email Address <span style={{ color: 'var(--color-secondary)' }}>*</span>
                                </label>
                                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="example@email.com"
                                    style={field('email')}
                                    onFocus={() => setFocusField('email')}
                                    onBlur={() => setFocusField(null)} />
                                {errors.email && <p style={{ fontSize: '11px', color: 'var(--color-secondary)', margin: '3px 0 0' }}>{errors.email}</p>}
                            </div>

                            {/* Subject */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>Subject</label>
                                <select name="subject" value={form.subject} onChange={handleChange}
                                    style={{ ...field('subject'), cursor: 'pointer', appearance: 'auto' }}
                                    onFocus={() => setFocusField('subject')}
                                    onBlur={() => setFocusField(null)}>
                                    <option value="">Select a topic...</option>
                                    {SUBJECTS.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Message */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                                    Message <span style={{ color: 'var(--color-secondary)' }}>*</span>
                                </label>
                                <textarea name="message" value={form.message} onChange={handleChange}
                                    placeholder="Describe your issue or question in detail..."
                                    rows={5}
                                    style={{ ...field('message'), resize: 'vertical', minHeight: '120px' }}
                                    onFocus={() => setFocusField('message')}
                                    onBlur={() => setFocusField(null)} />
                                {errors.message && <p style={{ fontSize: '11px', color: 'var(--color-secondary)', margin: '3px 0 0' }}>{errors.message}</p>}
                            </div>

                            {/* Submit */}
                            <button type="submit" disabled={loading} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '12px 28px',
                                background: loading ? '#6b7280' : 'linear-gradient(135deg, var(--color-primary), #0d5c30)',
                                color: '#fff', border: 'none', borderRadius: '8px',
                                fontSize: '13.5px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease', alignSelf: 'flex-start',
                                boxShadow: loading ? 'none' : '0 4px 14px rgba(79,70,229,0.35)',
                            }}
                                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.45)'; } }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.35)'; }}
                            >
                                {loading
                                    ? <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'preloaderSpin 0.8s linear infinite' }} /> Sending...</>
                                    : <><FiSend size={14} /> Send Message</>
                                }
                            </button>
                        </form>
                    </div>

                    {/* ─── RIGHT: Info ─── */}
                    <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Business Hours */}
                        {HOURS.length > 0 && (
                            <div style={{
                                border: '1.5px solid #e5e7eb', borderRadius: '12px',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    background: '#f3f4f6', padding: '12px 18px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    borderBottom: '1px solid #e5e7eb',
                                }}>
                                    <FiClock size={15} color="#6b7280" />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>Business Hours</span>
                                </div>
                                <div style={{ padding: '6px 0' }}>
                                    {HOURS.map((h: any, i: number) => (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 18px',
                                            borderBottom: i < HOURS.length - 1 ? '1px solid #f3f4f6' : 'none',
                                        }}>
                                            <span style={{ fontSize: '12.5px', color: '#374151', fontWeight: 500 }}>{h.day}</span>
                                            <span style={{
                                                fontSize: '12px', fontWeight: 600,
                                                color: h.time === 'Closed' ? 'var(--color-secondary)' : 'var(--color-primary)',
                                                background: h.time === 'Closed' ? '#fef2f2' : 'var(--color-primary-lightest)',
                                                padding: '2px 8px', borderRadius: '999px',
                                            }}>
                                                {h.time}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick Tips */}
                        {TIPS.length > 0 && (
                            <div style={{
                                background: 'linear-gradient(135deg, var(--color-primary-lightest), #fafffe)',
                                border: '1.5px solid #bbf7d0',
                                borderRadius: '12px', padding: '16px 18px',
                            }}>
                                <p style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 10px' }}>💡 Quick Tips</p>
                                {TIPS.map((tip: string, i: number) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: i < TIPS.length - 1 ? '8px' : 0 }}>
                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-primary)', marginTop: '6px', flexShrink: 0 }} />
                                        <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6 }}>{tip}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Social Quick Links */}
                        {SOCIALS.length > 0 && (
                            <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 18px' }}>
                                <p style={{ fontSize: '12.5px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px' }}>Follow Us</p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {SOCIALS.map((s: any, i: number) => (
                                        <a key={i} href={s.url} style={{
                                            padding: '6px 12px',
                                            background: `${s.color}12`,
                                            color: s.color,
                                            fontSize: '11.5px', fontWeight: 600,
                                            borderRadius: '6px', textDecoration: 'none',
                                            transition: 'all 0.2s ease',
                                        }}
                                            onMouseEnter={e => { e.currentTarget.style.background = s.color; e.currentTarget.style.color = '#fff'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = `${s.color}12`; e.currentTarget.style.color = s.color; }}
                                        >
                                            {s.label}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
