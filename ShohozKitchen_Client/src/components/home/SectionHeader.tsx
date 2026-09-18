"use client";

import React from 'react';
import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';

interface SectionHeaderProps {
    /** Bold section title shown on the left (Daraz style). */
    title: string;
    /** Optional small accent line drawn before the title. */
    accent?: boolean;
    /** Optional link target for the right-side "See More ›" action. */
    seeMoreHref?: string;
    /** Custom label for the right-side link (defaults to "See More"). */
    seeMoreLabel?: string;
}

/**
 * Reusable Daraz-style section header: bold title on the left and an optional
 * "See More ›" link on the right. Used by the home page row sections so they all
 * share the exact same look.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    accent = true,
    seeMoreHref,
    seeMoreLabel = 'See More',
}) => {
    return (
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
                {accent && (
                    <span
                        className="w-[3px] h-5 rounded-full"
                        style={{ background: 'var(--color-primary)' }}
                    />
                )}
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                    {title}
                </h2>
            </div>
            {seeMoreHref && (
                <Link
                    href={seeMoreHref}
                    className="flex items-center text-xs sm:text-sm font-semibold text-gray-600 hover:text-[var(--color-primary)] transition-colors"
                >
                    {seeMoreLabel} <FiChevronRight size={16} />
                </Link>
            )}
        </div>
    );
};

export default SectionHeader;
