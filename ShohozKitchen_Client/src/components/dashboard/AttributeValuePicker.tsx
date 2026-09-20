"use client";

/**
 * Searchable dropdown for a product's colours / sizes, fed by the global attributes
 * (GET /api/attributes → the Color / Size attribute).
 *
 * - Lists the attribute's values not yet on the product; typing filters them.
 * - A value that isn't in the list can still be typed and added. It is saved to the
 *   attribute straight away (PATCH addValues) so it is offered next time; if that call
 *   fails, the server's product → attribute merge picks it up once the product is saved.
 * - Colours: the swatch next to the input previews the hex that will be stored. It comes
 *   from the colour picker if the admin touched it, else the hex products already use for
 *   that name, else the CSS colour of that name, else the picker's value.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { LuPlus, LuSettings2 } from 'react-icons/lu';
import { useGetAttributesQuery, useUpdateAttributeMutation, type AttributeValueInfo } from '@/redux/api/attributeApi';

const keyOf = (s: string) => (s || '').trim().toLowerCase();

/* ─── CSS colour names → hex ("Sky Blue" → #87ceeb) ──────────── */

const namedCache = new Map<string, string | null>();
let canvasCtx: CanvasRenderingContext2D | null | undefined;

export function namedColorHex(name: string): string | null {
    const n = keyOf(name).replace(/\s+/g, '');
    if (!n || typeof document === 'undefined') return null;
    if (namedCache.has(n)) return namedCache.get(n) ?? null;
    if (canvasCtx === undefined) canvasCtx = document.createElement('canvas').getContext('2d');
    let out: string | null = null;
    if (canvasCtx) {
        const sentinel = '#010203';
        canvasCtx.fillStyle = sentinel;
        canvasCtx.fillStyle = n;
        const v = String(canvasCtx.fillStyle);
        out = v.startsWith('#') && (v !== sentinel || n === sentinel) ? v : null;
    }
    namedCache.set(n, out);
    return out;
}

type Item = { kind: 'option'; info: AttributeValueInfo } | { kind: 'create'; value: string };

export default function AttributeValuePicker({ kind, selected, onAdd, placeholder }: {
    kind: 'color' | 'size';
    /** Values already on the product (compared case-insensitively). */
    selected: string[];
    /** Called with the value (in the attribute's spelling when it exists) and, for colours, its hex. */
    onAdd: (value: string, hex?: string) => void;
    placeholder?: string;
}) {
    const { data, isLoading, isFetching, fulfilledTimeStamp, refetch } = useGetAttributesQuery();
    // Values added on the Attributes page (e.g. in the "Manage" tab) show up on the next focus.
    const refreshIfStale = () => {
        if (!isFetching && fulfilledTimeStamp && Date.now() - fulfilledTimeStamp > 15000) refetch();
    };
    const [updateAttribute] = useUpdateAttributeMutation();
    const attr = data?.data?.find((a) => a.linkedTo === kind);
    const options: AttributeValueInfo[] = attr && attr.isActive ? attr.valueInfo || [] : [];
    const known = new Set((attr?.values || []).map(keyOf));

    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState(-1); // -1 = default highlight
    const [hex, setHex] = useState('#000000');
    const [hexTouched, setHexTouched] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const selectedKeys = new Set((selected || []).map(keyOf));
    const q = keyOf(text);
    const rank = (v: string) => (keyOf(v) === q ? 0 : keyOf(v).startsWith(q) ? 1 : 2);
    const matches = options
        .filter((o) => !selectedKeys.has(keyOf(o.value)) && (!q || keyOf(o.value).includes(q)))
        .sort((a, b) => rank(a.value) - rank(b.value)); // stable: keeps the attribute's order within a rank
    const exact = options.find((o) => keyOf(o.value) === q);
    const alreadyOnProduct = !!q && selectedKeys.has(q);
    const canCreate = !!q && !exact && !alreadyOnProduct;
    const items: Item[] = [
        ...matches.slice(0, 60).map((info) => ({ kind: 'option' as const, info })),
        ...(canCreate ? [{ kind: 'create' as const, value: text.trim() }] : []),
    ];
    // Default highlight: nothing until something is typed; then a match that starts with the
    // typed text, else "Add …" — so Enter on "Red" never silently picks "Dark Red".
    const defaultCursor = items.length === 0 || !q ? -1
        : items[0].kind === 'option' && rank(items[0].info.value) < 2 ? 0
        : canCreate ? items.length - 1 : 0;
    const active = cursor >= 0 && cursor < items.length ? cursor : defaultCursor;
    const activeItem = items[active];

    const hexFor = (value: string, info?: AttributeValueInfo) =>
        hexTouched ? hex : info?.hex || namedColorHex(value) || hex;
    // Swatch preview follows the highlighted value until the admin picks a colour themselves.
    const previewHex = kind === 'color'
        ? activeItem?.kind === 'option' ? hexFor(activeItem.info.value, activeItem.info)
            : q ? hexFor(text) : hex
        : hex;

    const add = (raw: string, info?: AttributeValueInfo) => {
        const typed = raw.trim();
        if (!typed) return;
        const match = info || options.find((o) => keyOf(o.value) === keyOf(typed));
        const value = match?.value || typed;
        if (selectedKeys.has(keyOf(value))) { setText(''); return; }
        onAdd(value, kind === 'color' ? hexFor(value, match) : undefined);
        // Brand-new value → save it to the attribute now (best effort; the server merge is the backstop).
        if (attr && !known.has(keyOf(value))) {
            updateAttribute({ id: attr._id, addValues: [value] }).unwrap().catch(() => { /* merged after the product is saved */ });
        }
        setText('');
        setCursor(-1);
        setHexTouched(false);
        inputRef.current?.focus();
    };

    const pickItem = (it?: Item) => {
        if (!it) return add(text);
        if (it.kind === 'option') add(it.info.value, it.info);
        else add(it.value);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) { setOpen(true); return; }
            if (!items.length) return;
            const down = e.key === 'ArrowDown';
            setCursor(active < 0 ? (down ? 0 : items.length - 1) : (active + (down ? 1 : -1) + items.length) % items.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            pickItem(open ? activeItem : undefined);
        } else if (e.key === 'Escape') {
            if (open) { e.preventDefault(); setOpen(false); }
        }
    };

    const noun = kind === 'color' ? 'colour' : 'size';
    const showList = open && (items.length > 0 || isLoading || !!q || options.length === 0);

    return (
        <div ref={wrapRef} className="relative">
            <div className="flex gap-2 items-center">
                {kind === 'color' && (
                    <input
                        type="color"
                        aria-label="Colour swatch"
                        title="Pick the exact shade (optional)"
                        value={previewHex}
                        onChange={(e) => { setHex(e.target.value); setHexTouched(true); }}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0"
                    />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={showList && activeItem ? `${listId}-${active}` : undefined}
                    placeholder={placeholder || `Search or type a ${noun}`}
                    value={text}
                    onChange={(e) => { setText(e.target.value); setCursor(-1); setOpen(true); }}
                    onFocus={() => { setOpen(true); refreshIfStale(); }}
                    onClick={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    className="flex-1 min-w-0 px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)]"
                />
                <button type="button" onClick={() => add(text)} className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold hover:bg-[var(--color-primary-dark)] shrink-0">+ Add</button>
            </div>

            {showList && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    <ul id={listId} role="listbox" aria-label={`${attr?.name || noun} values`} className="max-h-64 overflow-y-auto py-1">
                        {isLoading && <li className="px-3 py-2 text-sm text-gray-400">Loading {noun}s…</li>}
                        {!isLoading && items.length === 0 && (
                            <li className="px-3 py-2 text-sm text-gray-400">
                                {alreadyOnProduct ? `"${text.trim()}" is already added.`
                                    : attr && !attr.isActive ? `${attr.name} suggestions are turned off — type a ${noun} to add it.`
                                    : options.length === 0 ? `No saved ${noun}s yet — type one to add it.`
                                    : `Every saved ${noun} is already added.`}
                            </li>
                        )}
                        {items.map((it, i) => {
                            const isActive = i === active;
                            const cls = `flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm ${isActive ? 'bg-[var(--color-primary-lightest)] text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`;
                            if (it.kind === 'create') {
                                return (
                                    <li key="__create" id={`${listId}-${i}`} role="option" aria-selected={isActive}
                                        className={`${cls} border-t border-gray-100`}
                                        onMouseEnter={() => setCursor(i)}
                                        onMouseDown={(e) => { e.preventDefault(); pickItem(it); }}>
                                        <LuPlus size={14} className="shrink-0 text-[var(--color-primary)]" />
                                        <span className="min-w-0 flex-1 truncate">Add <strong className="font-semibold">&ldquo;{it.value}&rdquo;</strong></span>
                                        <span className="shrink-0 text-xs text-gray-400">new {noun}</span>
                                    </li>
                                );
                            }
                            const sw = kind === 'color' ? it.info.hex || namedColorHex(it.info.value) : null;
                            return (
                                <li key={it.info.value} id={`${listId}-${i}`} role="option" aria-selected={isActive}
                                    className={cls}
                                    onMouseEnter={() => setCursor(i)}
                                    onMouseDown={(e) => { e.preventDefault(); pickItem(it); }}>
                                    {kind === 'color' && (
                                        <span className="h-4 w-4 shrink-0 rounded border border-gray-300"
                                            style={{ background: sw || 'repeating-linear-gradient(45deg,#e5e7eb 0 3px,#fff 3px 6px)' }} />
                                    )}
                                    <span className="min-w-0 flex-1 truncate">{it.info.value}</span>
                                    {!!it.info.products && (
                                        <span className="shrink-0 text-xs text-gray-400">{it.info.products} product{it.info.products === 1 ? '' : 's'}</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                        <span>New {noun}s are saved to {attr?.name || (kind === 'color' ? 'Color' : 'Size')} for next time.</span>
                        {/* New tab, so the product being edited isn't lost. */}
                        <Link href="/dashboard/admin/attributes" target="_blank" rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 font-medium text-[var(--color-primary)] hover:underline">
                            <LuSettings2 size={12} /> Manage
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
