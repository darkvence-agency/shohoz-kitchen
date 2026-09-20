/**
 * Printable shipping labels (100 × 75 mm, one per page) and order invoices (A4, one
 * order per page), built as complete HTML documents for an <iframe srcDoc>.
 *
 * HTML rather than a server PDF: customer names and addresses are often in Bangla,
 * which the browser shapes correctly (the PDF library on the server cannot).
 * On screen the pages sit on a dark grey backdrop like a PDF viewer; the print
 * stylesheet drops the backdrop and gives each label / invoice its own page.
 *
 * Every value from the database goes through esc() — the document is rendered
 * same-origin, so nothing customer-typed may ever become markup.
 */

import { code128Svg, isCode128BEncodable } from './code128';

/* ─── Data ───────────────────────────────────────────────── */

export type PrintItem = {
    name: string;
    sku: string;
    color: string;
    size: string;
    quantity: number;
    price: number;
    discount: number;
    total: number;
};

/** One order as returned by POST /api/orders/admin/print. */
export type PrintOrder = {
    _id: string;
    orderId: string;
    createdAt?: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    customer: { name: string; phone: string; email: string };
    shippingAddress: { fullName: string; phone: string; address: string; area: string; city: string; postalCode: string };
    items: PrintItem[];
    subtotal: number;
    discount: number;
    shippingCost: number;
    total: number;
    paid: number;
    due: number;
    refunded: boolean;
    note: string;
    consignmentId: string;
    consignmentIds: string[];
};

/** Store details for the letterhead — any contact field may be empty on purpose. */
export type PrintStore = {
    name: string;
    tagline: string;
    address: string;
    phones: string[];
    emails: string[];
    website: string;
    logoUrl: string;
};

const DEFAULT_STORE_NAME = 'Shohoz Kitchen';
/** The storefront's default logo is the full lockup; the round mark suits the print header. */
const DEFAULT_LOGO = '/logo.svg';
const MARK_LOGO = '/logo-mark.svg';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const uniq = (list: string[]) => {
    const seen = new Set<string>();
    return list.filter((s) => {
        const k = s.toLowerCase();
        if (!s || seen.has(k)) return false;
        seen.add(k);
        return true;
    });
};

/** An absolute http(s) URL for use inside the iframe, or '' if it is not one. */
function absoluteUrl(url: string, origin: string): string {
    try {
        const u = new URL(url, origin);
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
    } catch {
        return '';
    }
}

/**
 * Store details from the public site content (GET /api/site-content). Contact
 * fields the owner cleared stay empty, and their lines are left off the paper.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function storeFromSiteContent(content: any, origin: string): PrintStore {
    const general = content?.general || {};
    const contact = content?.contact || {};
    const rawLogo = str(content?.theme?.logoUrl);
    const logo = rawLogo && rawLogo !== DEFAULT_LOGO ? rawLogo : MARK_LOGO;
    return {
        name: str(general.storeName) || str(content?.footer?.companyName) || DEFAULT_STORE_NAME,
        tagline: str(general.tagline) || str(content?.defaultTagline),
        address: str(contact.address) || str(contact.corporateOffice),
        phones: uniq([str(contact.phone), ...(Array.isArray(contact.phones) ? contact.phones.map(str) : [])]),
        emails: uniq([str(contact.email), ...(Array.isArray(contact.emails) ? contact.emails.map(str) : [])]),
        website: str(contact.website),
        logoUrl: absoluteUrl(logo, origin) || absoluteUrl(MARK_LOGO, origin),
    };
}

/* ─── Formatting ─────────────────────────────────────────── */

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** HTML-escape anything that goes into the document. */
export const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** ৳1,61,938 (up to 2 decimals) */
const taka = (n: number) =>
    '৳' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 18 Sept 2026 */
const day = (d?: string) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const METHOD: Record<string, string> = {
    cod: 'Cash on delivery', bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', sslcommerz: 'SSLCommerz',
};
const methodLabel = (m: string) => METHOD[(m || '').toLowerCase()] || (m || '').toUpperCase();

/** "Cash on delivery", "Paid — bKash", "Refunded", "bKash — unpaid" */
function paymentLine(o: PrintOrder): string {
    const method = methodLabel(o.paymentMethod);
    if (o.paymentStatus === 'paid') return method ? `Paid — ${method}` : 'Paid';
    if (o.paymentStatus === 'refunded') return 'Refunded';
    if ((o.paymentMethod || '').toLowerCase() === 'cod') return 'Cash on delivery';
    return method ? `${method} — unpaid` : 'Unpaid';
}

/** Street, area, city, postcode — empty parts and repeats left out. */
function addressLine(a: PrintOrder['shippingAddress']): string {
    const parts = uniq([a.address, a.area, a.city, a.postalCode].map(str));
    return parts.filter((p, i) => i === 0 || !parts[0].toLowerCase().includes(p.toLowerCase())).join(', ');
}

const variantText = (it: PrintItem) => [it.color, it.size].filter(Boolean).join(' / ');

const websiteText = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

/* ─── Shared document shell ──────────────────────────────── */

const FONT_LINKS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap">`;

const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; }
body {
    font-family: "Hind Siliguri", "Noto Sans Bengali", "Segoe UI", Roboto, Arial, sans-serif;
    color: #111; line-height: 1.3;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    -webkit-font-smoothing: antialiased;
}
img { display: block; }
.k { font-size: 6.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #555; }
/* On screen: pages on a dark backdrop, like a PDF viewer. */
@media screen {
    html, body { background: #525659; }
    body { padding: 24px 12px; }
    .page { margin: 0 auto 24px; box-shadow: 0 2px 12px rgba(0, 0, 0, .45); }
    .page:last-child { margin-bottom: 0; }
}`;

function shell(title: string, css: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>${FONT_LINKS}
<style>${BASE_CSS}${css}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function docTitle(kind: string, orders: PrintOrder[]): string {
    if (orders.length === 1) return `${kind} ${orders[0].orderId}`;
    return `${kind}s (${orders.length})`;
}

/* ─── Shipping labels ────────────────────────────────────── */

const LABEL_CSS = `
@page { size: 100mm 75mm; margin: 0; }
.page {
    width: 100mm; height: 75mm; padding: 2mm; background: #fff; overflow: hidden;
    break-after: page; page-break-after: always;
}
.page:last-child { break-after: auto; page-break-after: auto; }
@media print { .page { height: 74.8mm; } }
.frame {
    height: 100%; border: .35mm solid #000; border-radius: 1.6mm; padding: 1.8mm 2.4mm;
    display: flex; flex-direction: column; gap: 1mm; overflow: hidden;
}
.top { display: flex; align-items: center; justify-content: space-between; gap: 2mm; }
.brand { display: flex; align-items: center; gap: 1.8mm; min-width: 0; }
.brand img { height: 7mm; width: auto; max-width: 26mm; object-fit: contain; }
.brand .store { font-size: 11pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { text-align: right; flex-shrink: 0; }
.meta .date { font-size: 7.5pt; color: #333; }
.meta .pay { font-size: 8.5pt; font-weight: 700; }
.barcode { height: 11mm; flex-shrink: 0; }
.barcode svg { display: block; width: 100%; height: 100%; }
.ids { display: flex; justify-content: space-between; gap: 2mm; font-size: 8pt; line-height: 1.2; white-space: nowrap; }
.ids .k { margin-right: 1.2mm; }
.ids b { font-size: 9pt; }
.ids .muted { color: #666; font-weight: 400; }
.to {
    flex: 1 1 auto; min-height: 0; overflow: hidden;
    border: .3mm solid #000; border-radius: 1.2mm; padding: 1.1mm 2mm;
}
.to .name { font-size: 12pt; font-weight: 700; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.to .phone { font-size: 10.5pt; font-weight: 700; line-height: 1.2; }
.to .addr {
    font-size: 8.5pt; line-height: 1.3; color: #111;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
/* Long addresses get a smaller face so the whole address still fits the box. */
.to .addr.long { font-size: 7.5pt; line-height: 1.25; }
.items { font-size: 7.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.bottom { display: flex; align-items: stretch; justify-content: space-between; gap: 2mm; flex-shrink: 0; }
.from { min-width: 0; font-size: 7pt; line-height: 1.25; color: #222; }
.from .lines { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cash {
    flex-shrink: 0; min-width: 30mm; background: #000; color: #fff; border-radius: 1mm;
    padding: 1mm 2.2mm; display: flex; flex-direction: column; justify-content: center; text-align: right;
}
.cash .k { color: #fff; font-size: 6pt; }
.cash .amt { font-size: 14pt; font-weight: 700; line-height: 1.1; }
.cash.paid { text-align: center; }
.cash.paid .amt { letter-spacing: .12em; }`;

function barcodeFor(value: string): string {
    if (!isCode128BEncodable(value)) return '';
    try {
        return code128Svg(value);
    } catch {
        return '';
    }
}

function labelHtml(o: PrintOrder, store: PrintStore): string {
    const a = o.shippingAddress;
    const name = a.fullName || o.customer.name;
    const phone = a.phone || o.customer.phone;
    const address = addressLine(a);
    const code = o.consignmentId || o.orderId;
    const items = o.items
        .map((it) => `${it.quantity} × ${it.name}${variantText(it) ? ` (${variantText(it)})` : ''}`)
        .join(' · ');
    const fromLines = [store.address, store.phones.join(', ')].filter(Boolean);

    let cash: string;
    if (o.due > 0) cash = `<div class="cash"><div class="k">Cash to collect</div><div class="amt">${esc(taka(o.due))}</div></div>`;
    else if (o.paymentStatus === 'paid') cash = `<div class="cash paid"><div class="amt">PAID</div></div>`;
    else cash = `<div class="cash"><div class="k">Cash to collect</div><div class="amt">${esc(taka(0))}</div></div>`;

    return `<section class="page">
<div class="frame">
    <div class="top">
        <div class="brand">${store.logoUrl ? `<img src="${esc(store.logoUrl)}" alt="">` : ''}<span class="store">${esc(store.name)}</span></div>
        <div class="meta"><div class="date">${esc(day(o.createdAt))}</div><div class="pay">${esc(paymentLine(o))}</div></div>
    </div>
    <div class="barcode">${barcodeFor(code)}</div>
    <div class="ids">
        <span><span class="k">Consignment ID</span>${o.consignmentId ? `<b>${esc(o.consignmentIds.join(', '))}</b>` : '<b class="muted">Not booked yet</b>'}</span>
        <span><span class="k">Order No</span><b>${esc(o.orderId)}</b></span>
    </div>
    <div class="to">
        <div class="k">Deliver to</div>
        ${name ? `<div class="name">${esc(name)}</div>` : ''}
        ${phone ? `<div class="phone">${esc(phone)}</div>` : ''}
        ${address ? `<div class="addr${address.length > 70 ? ' long' : ''}">${esc(address)}</div>` : ''}
    </div>
    ${items ? `<div class="items">${esc(items)}</div>` : ''}
    <div class="bottom">
        <div class="from"><div class="k">From</div><div class="lines">${fromLines.length ? fromLines.map(esc).join('<br>') : esc(store.name)}</div></div>
        ${cash}
    </div>
</div>
</section>`;
}

export function buildLabelsHtml(orders: PrintOrder[], store: PrintStore): string {
    return shell(docTitle('Shipping label', orders), LABEL_CSS, orders.map((o) => labelHtml(o, store)).join('\n'));
}

/* ─── Order invoices ─────────────────────────────────────── */

const INVOICE_CSS = `
@page { size: A4; margin: 12mm; }
.page {
    position: relative; background: #fff; font-size: 9pt; color: #111;
    display: flex; flex-direction: column;
    break-after: page; page-break-after: always;
}
.page:last-child { break-after: auto; page-break-after: auto; }
@media screen { .page { width: 210mm; min-height: 297mm; padding: 12mm; } }
@media screen and (max-width: 860px) { .page { zoom: .5; } }
@media print { .page { min-height: 270mm; } }
.watermark {
    position: absolute; left: 50%; top: 50%; width: 120mm; height: 120mm; object-fit: contain;
    transform: translate(-50%, -50%); opacity: .035; filter: grayscale(1); pointer-events: none; z-index: 0;
}
.content { position: relative; z-index: 1; display: flex; flex-direction: column; flex: 1 1 auto; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; }
.brand { display: flex; gap: 3.5mm; align-items: flex-start; min-width: 0; }
.brand img { height: 16mm; width: auto; max-width: 40mm; object-fit: contain; flex-shrink: 0; }
.brand .store { font-size: 17pt; font-weight: 700; line-height: 1.15; }
.brand .tagline { font-size: 8.5pt; color: #555; margin-bottom: 1mm; }
.brand .line { font-size: 8.5pt; color: #333; }
.title { text-align: right; flex-shrink: 0; }
.title .doc { font-size: 20pt; font-weight: 800; letter-spacing: .02em; line-height: 1.1; }
.badge {
    display: inline-block; margin-top: 2.5mm; padding: .8mm 3.5mm; border: .5mm solid currentColor;
    border-radius: 1.2mm; font-size: 10pt; font-weight: 700; letter-spacing: .14em;
}
.badge.red { color: #c62828; }
.badge.green { color: #1b7f3b; }
.badge.grey { color: #6b7280; }
.rule { height: 0; border-top: .9mm solid #111; margin: 4mm 0; }
.box { border: .3mm solid #bbb; border-radius: 1.5mm; padding: 2.5mm 3mm; }
.row2 { display: flex; gap: 4mm; }
.row2 > * { flex: 1 1 0; min-width: 0; }
.meta { display: flex; gap: 6mm; }
.meta > div { min-width: 0; }
.meta .v { font-size: 10pt; font-weight: 600; margin-top: .5mm; }
.parcel { flex: 0 0 58mm; background: #f1f1f1; border-color: #111; }
.parcel .v { font-size: 13pt; font-weight: 700; margin-top: .5mm; letter-spacing: .02em; }
.parcel .v.muted { font-size: 10pt; font-weight: 600; color: #666; }
.parties { margin-top: 4mm; }
.parties .name { font-size: 10.5pt; font-weight: 700; margin-top: 1mm; }
.parties .line { margin-top: .4mm; color: #222; overflow-wrap: anywhere; }
table.items { width: 100%; border-collapse: collapse; margin-top: 5mm; }
table.items thead { display: table-header-group; }
table.items th {
    font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #333;
    text-align: left; padding: 2mm 2mm; border-top: .4mm solid #111; border-bottom: .4mm solid #111; background: #f3f3f3;
}
table.items td { padding: 2mm 2mm; border-bottom: .25mm solid #ddd; vertical-align: top; }
table.items tr { break-inside: avoid; page-break-inside: avoid; }
table.items .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
table.items .qty { text-align: center; white-space: nowrap; }
table.items .iname { font-weight: 600; }
table.items .sub { font-size: 7.5pt; color: #666; margin-top: .4mm; }
.bottom { display: flex; gap: 5mm; margin-top: 5mm; align-items: flex-start; break-inside: avoid; page-break-inside: avoid; }
.bottom .left { flex: 1 1 auto; display: flex; flex-direction: column; gap: 3mm; min-width: 0; }
.bottom .left .v { margin-top: 1mm; white-space: pre-line; overflow-wrap: anywhere; }
.totals { flex: 0 0 72mm; padding: 1.5mm 3mm; }
.totals table { width: 100%; border-collapse: collapse; }
.totals td { padding: 1.1mm 0; }
.totals td:last-child { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.totals tr.grand td { border-top: .4mm solid #111; font-size: 11pt; font-weight: 700; padding-top: 1.8mm; }
.totals tr.due td { font-weight: 700; }
.thanks { margin-top: auto; padding-top: 8mm; text-align: center; font-size: 8pt; color: #666; }`;

function badge(o: PrintOrder): string {
    if (o.paymentStatus === 'paid') return '<span class="badge green">PAID</span>';
    if (o.paymentStatus === 'refunded' || o.refunded) return '<span class="badge grey">REFUNDED</span>';
    if (o.status === 'cancelled') return '<span class="badge grey">CANCELLED</span>';
    if (o.paymentStatus === 'failed') return '<span class="badge red">PAYMENT FAILED</span>';
    return '<span class="badge red">UNPAID</span>';
}

function invoiceHtml(o: PrintOrder, store: PrintStore): string {
    const a = o.shippingAddress;
    const address = addressLine(a);
    const contactLine = [
        store.phones.length ? `Phone: ${store.phones.join(', ')}` : '',
        store.emails.length ? `Email: ${store.emails.join(', ')}` : '',
    ].filter(Boolean).join(' · ');
    const support = [...store.phones, ...store.emails];
    const dash = '-';

    const billName = o.customer.name || a.fullName;
    const billPhone = o.customer.phone || a.phone;
    const shipName = a.fullName || o.customer.name;
    const shipPhone = a.phone || o.customer.phone;

    const rows = o.items.map((it) => {
        const sub = [
            it.sku ? `SKU: ${it.sku}` : '',
            it.color ? `Colour: ${it.color}` : '',
            it.size ? `Size: ${it.size}` : '',
        ].filter(Boolean).join(' · ');
        return `<tr>
            <td><div class="iname">${esc(it.name)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</td>
            <td class="qty">${esc(it.quantity)}</td>
            <td class="num">${esc(taka(it.price))}</td>
            <td class="num">${it.discount > 0 ? `− ${esc(taka(it.discount))}` : dash}</td>
            <td class="num">${esc(taka(it.total))}</td>
        </tr>`;
    }).join('');

    return `<section class="page">
${store.logoUrl ? `<img class="watermark" src="${esc(store.logoUrl)}" alt="">` : ''}
<div class="content">
    <div class="head">
        <div class="brand">
            ${store.logoUrl ? `<img src="${esc(store.logoUrl)}" alt="">` : ''}
            <div>
                <div class="store">${esc(store.name)}</div>
                ${store.tagline ? `<div class="tagline">${esc(store.tagline)}</div>` : ''}
                ${store.address ? `<div class="line">${esc(store.address)}</div>` : ''}
                ${contactLine ? `<div class="line">${esc(contactLine)}</div>` : ''}
                ${store.website ? `<div class="line">${esc(websiteText(store.website))}</div>` : ''}
            </div>
        </div>
        <div class="title">
            <div class="doc">ORDER INVOICE</div>
            ${badge(o)}
        </div>
    </div>
    <div class="rule"></div>
    <div class="row2">
        <div class="box meta">
            <div><div class="k">Order No</div><div class="v">${esc(o.orderId)}</div></div>
            <div><div class="k">Date</div><div class="v">${esc(day(o.createdAt) || dash)}</div></div>
            <div><div class="k">Payment</div><div class="v">${esc(methodLabel(o.paymentMethod) || dash)}</div></div>
        </div>
        <div class="box parcel">
            <div class="k">Parcel ID</div>
            ${o.consignmentId ? `<div class="v">${esc(o.consignmentIds.join(', '))}</div>` : '<div class="v muted">Not booked yet</div>'}
        </div>
    </div>
    <div class="row2 parties">
        <div class="box">
            <div class="k">Bill to</div>
            <div class="name">${esc(billName || dash)}</div>
            ${billPhone ? `<div class="line">Phone: ${esc(billPhone)}</div>` : ''}
            ${o.customer.email ? `<div class="line">Email: ${esc(o.customer.email)}</div>` : ''}
            ${address ? `<div class="line">${esc(address)}</div>` : ''}
        </div>
        <div class="box">
            <div class="k">Ship to</div>
            <div class="name">${esc(shipName || dash)}</div>
            ${shipPhone ? `<div class="line">Phone: ${esc(shipPhone)}</div>` : ''}
            ${address ? `<div class="line">${esc(address)}</div>` : ''}
        </div>
    </div>
    <table class="items">
        <thead><tr>
            <th>Item</th><th class="qty" style="width:14mm">Qty</th><th class="num" style="width:27mm">Unit price</th>
            <th class="num" style="width:22mm">Disc.</th><th class="num" style="width:29mm">Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>
    <div class="bottom">
        <div class="left">
            <div class="box"><div class="k">Customer note</div><div class="v">${esc(o.note || dash)}</div></div>
            ${support.length ? `<div class="box"><div class="k">Support</div><div class="v">${support.map(esc).join('<br>')}</div></div>` : ''}
        </div>
        <div class="box totals">
            <table>
                <tr><td>Subtotal</td><td>${esc(taka(o.subtotal))}</td></tr>
                <tr><td>Discount</td><td>${o.discount > 0 ? `− ${esc(taka(o.discount))}` : esc(taka(0))}</td></tr>
                <tr><td>Delivery charge</td><td>${esc(taka(o.shippingCost))}</td></tr>
                <tr class="grand"><td>Total</td><td>${esc(taka(o.total))}</td></tr>
                <tr><td>Paid</td><td>${esc(taka(o.paid))}</td></tr>
                <tr class="due"><td>Due</td><td>${esc(taka(o.due))}</td></tr>
            </table>
        </div>
    </div>
    <div class="thanks">Thank you for shopping with ${esc(store.name)}</div>
</div>
</section>`;
}

export function buildInvoicesHtml(orders: PrintOrder[], store: PrintStore): string {
    return shell(docTitle('Invoice', orders), INVOICE_CSS, orders.map((o) => invoiceHtml(o, store)).join('\n'));
}
