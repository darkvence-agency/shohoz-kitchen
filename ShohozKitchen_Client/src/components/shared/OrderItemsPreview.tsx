"use client";

import React from 'react';
import { FiPackage } from 'react-icons/fi';

export interface PreviewItem {
    thumbnail?: string;
    name?: string;
    quantity?: number;
    color?: string;
    size?: string;
}

interface Props {
    items?: PreviewItem[];
    /** Total item count in the order/package (for the "+N" bubble & "more items" line). Falls back to items.length. */
    totalCount?: number;
    /** Thumbnail size in px. Default 38. */
    size?: number;
    /** Max thumbnails to stack. Default 3. */
    maxThumbs?: number;
    /** Show the name + qty/variant text beside the thumbnails. Default true. */
    showText?: boolean;
}

// Standardised product preview for dashboard list rows:
// overlapping thumbnails (+N) → product name → qty • colour/size → "+N more items".
const OrderItemsPreview: React.FC<Props> = ({
    items = [],
    totalCount,
    size = 38,
    maxThumbs = 3,
    showText = true,
}) => {
    const total = typeof totalCount === 'number' ? totalCount : items.length;
    const shown = items.slice(0, maxThumbs);
    const extraThumbs = total - shown.length;
    const first = items[0];

    const variant = [first?.color, first?.size].filter(Boolean).join(' / ');

    const Thumb = ({ item, idx }: { item?: PreviewItem; idx: number }) =>
        item?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={item.thumbnail}
                alt={item?.name || 'product'}
                title={item?.name || ''}
                className="rounded-lg object-cover ring-2 ring-white bg-gray-50"
                style={{ width: size, height: size, marginLeft: idx === 0 ? 0 : -size * 0.32, zIndex: 10 - idx }}
            />
        ) : (
            <div
                className="rounded-lg ring-2 ring-white bg-gray-100 flex items-center justify-center"
                style={{ width: size, height: size, marginLeft: idx === 0 ? 0 : -size * 0.32, zIndex: 10 - idx }}
            >
                <FiPackage size={size * 0.45} className="text-gray-300" />
            </div>
        );

    return (
        <div className="flex items-center gap-3 min-w-0">
            {/* Thumbnail stack */}
            <div className="flex items-center shrink-0">
                {shown.length > 0 ? (
                    shown.map((it, i) => <Thumb key={i} item={it} idx={i} />)
                ) : (
                    <Thumb idx={0} />
                )}
                {extraThumbs > 0 && (
                    <div
                        className="rounded-lg ring-2 ring-white bg-gray-800 text-white flex items-center justify-center text-[11px] font-bold"
                        style={{ width: size, height: size, marginLeft: -size * 0.32, zIndex: 1 }}
                    >
                        +{extraThumbs}
                    </div>
                )}
            </div>

            {/* Text */}
            {showText && (
                <div className="min-w-0 leading-tight">
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]" title={first?.name || ''}>
                        {first?.name || `${total} item${total !== 1 ? 's' : ''}`}
                    </p>
                    <p className="text-[11px] text-gray-400">
                        {first ? `x${first.quantity || 1}` : ''}{variant ? ` · ${variant}` : ''}
                        {total > 1 && <span className="text-[var(--color-primary)] font-semibold">{first ? `  ·  +${total - 1} more` : ''}</span>}
                    </p>
                </div>
            )}
        </div>
    );
};

export default OrderItemsPreview;
