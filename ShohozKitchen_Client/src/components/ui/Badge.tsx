"use client";

import React from 'react';

interface BadgeProps {
    variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({
    variant = 'primary',
    size = 'md',
    children,
    className = '',
}) => {
    const variantStyles = {
        primary: 'bg-[rgba(92,175,144,0.1)] text-[var(--color-primary)]',
        secondary: 'bg-[rgba(75,89,102,0.1)] text-[var(--color-secondary)]',
        accent: 'bg-[rgba(255,107,107,0.1)] text-[var(--color-accent)]',
        success: 'bg-[rgba(34,197,94,0.1)] text-[var(--color-success)]',
        warning: 'bg-[rgba(245,158,11,0.1)] text-[var(--color-warning)]',
        error: 'bg-[rgba(239,68,68,0.1)] text-[var(--color-error)]',
    };

    const sizeStyles = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
    };

    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
        >
            {children}
        </span>
    );
};

export default Badge;
