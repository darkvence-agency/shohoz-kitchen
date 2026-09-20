/* eslint-disable @typescript-eslint/no-explicit-any */
// Links for the storefront contact channels (call, WhatsApp, Messenger), shared by the
// floating contact buttons and the admin Site Content page so both read them the same way.

/** Placeholder the site-content seed shipped with — never a real page. */
const MESSENGER_PLACEHOLDER = 'your_page_username';

/** "+880 1611-829111" → "+8801611829111" (what a tel: link needs). '' when there is no number. */
export function telHref(phone?: string): string {
    const raw = String(phone ?? '').trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 6) return '';
    return `tel:${raw.startsWith('+') ? '+' : ''}${digits}`;
}

/** Any Bangladeshi spelling (01…, 8801…, +880 1…) → "https://wa.me/8801…". '' when there is no number. */
export function whatsappHref(number?: string): string {
    const digits = String(number ?? '').replace(/\D/g, '');
    if (digits.length < 6) return '';
    const intl = digits.startsWith('880') ? digits : digits.startsWith('0') ? `88${digits}` : digits.startsWith('1') && digits.length === 10 ? `880${digits}` : digits;
    return `https://wa.me/${intl}`;
}

/**
 * The page's Messenger id from whatever the admin pasted: "shohozkitchen", "@shohozkitchen",
 * "m.me/shohozkitchen", "facebook.com/shohozkitchen", "fb.com/…", or a
 * "facebook.com/profile.php?id=123…" link. '' when it is empty or the seed placeholder.
 */
export function messengerId(value?: string): string {
    let v = String(value ?? '').trim();
    if (!v) return '';
    // Drop the scheme and a www./web./m. subdomain (but keep the m.me short domain).
    v = v.replace(/^https?:\/\//i, '').replace(/^(www\.|web\.|business\.|m\.(?!me\/))/i, '');
    const profile = v.match(/profile\.php\?(?:.*&)?id=(\d+)/i);
    if (profile) return profile[1];
    v = v.replace(/^(m\.me|facebook\.com|fb\.com|messenger\.com\/t)\//i, '');
    v = v.replace(/^@/, '').split(/[/?#]/)[0].trim();
    if (!/^[A-Za-z0-9.\-_]{2,100}$/.test(v)) return '';
    if (v.toLowerCase() === MESSENGER_PLACEHOLDER) return '';
    return v;
}

/** "https://m.me/<page>" or '' when there is no usable page. */
export function messengerHref(value?: string): string {
    const id = messengerId(value);
    return id ? `https://m.me/${id}` : '';
}

export interface ContactChannels {
    phone: string;          // number as written, for display
    phoneHref: string;      // tel:…
    whatsapp: string;
    whatsappHref: string;   // https://wa.me/…
    messenger: string;
    messengerHref: string;  // https://m.me/…
    showPhone: boolean;
    showWhatsapp: boolean;
    showMessenger: boolean;
}

/**
 * What the floating buttons use. Each channel takes the Floating Widget's own value when
 * one is set, otherwise the Contact Info value — so by default they follow Contact Info.
 * A button only shows when it is switched on AND has a usable number/page.
 */
export function resolveContactChannels(site: any): ContactChannels {
    const f = site?.floating || {};
    const c = site?.contact || {};
    const phone = String(f.phone || c.phone || '').trim();
    const whatsapp = String(f.whatsapp || c.whatsapp || '').trim();
    const messenger = String(messengerId(f.messenger) ? f.messenger : c.messenger || '').trim();
    const links = { phoneHref: telHref(phone), whatsappHref: whatsappHref(whatsapp), messengerHref: messengerHref(messenger) };
    return {
        phone, whatsapp, messenger, ...links,
        showPhone: f.showPhone !== false && !!links.phoneHref,
        showWhatsapp: f.showWhatsapp !== false && !!links.whatsappHref,
        showMessenger: f.showMessenger !== false && !!links.messengerHref,
    };
}
