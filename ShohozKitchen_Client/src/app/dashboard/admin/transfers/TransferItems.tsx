"use client";

import React from 'react';
import type { TransferItem } from '@/redux/api/transferApi';
import { Thumb, qty, unitShort } from './shared';

const productOf = (it: TransferItem) => (it.product && typeof it.product === 'object' ? it.product : null);

/** The lines of a transfer: product (or free-text item), SKU and quantity. */
export default function TransferItems({ items, thumbs = false }: { items: TransferItem[]; thumbs?: boolean }) {
    if (!items.length) return <p className="text-sm text-gray-400">No items.</p>;
    const total = items.reduce((n, it) => n + (it.qty || 0), 0);
    return (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <ul className="divide-y divide-gray-100">
                {items.map((it, i) => {
                    const p = productOf(it);
                    const freeText = !it.product;
                    return (
                        <li key={`${i}-${it.name}`} className="flex items-center gap-3 px-3 py-2">
                            {thumbs && <Thumb src={p?.thumbnail} size={32} />}
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm text-gray-800 [overflow-wrap:anywhere]">{it.name}</p>
                                <p className="text-xs text-gray-400">
                                    {freeText ? 'Not in catalogue' : (it.sku || 'No SKU')}
                                </p>
                            </div>
                            <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-gray-900">
                                {qty(it.qty)}{unitShort(it.unit) && <span className="ml-1 text-xs font-normal text-gray-400">{unitShort(it.unit)}</span>}
                            </span>
                        </li>
                    );
                })}
            </ul>
            {items.length > 1 && (
                <div className="flex justify-between border-t border-gray-100 bg-gray-50/70 px-3 py-2 text-xs text-gray-500">
                    <span>{items.length} lines</span>
                    <span className="font-semibold text-gray-700">{qty(total)} units</span>
                </div>
            )}
        </div>
    );
}
