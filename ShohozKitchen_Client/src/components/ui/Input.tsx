"use client";

import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    ...props
}, ref) => {
    return (
        <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
            {label && (
                <label className="text-sm font-medium text-[var(--color-text-primary)]">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                        {leftIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    className={`
            w-full py-3 px-4 text-base
            border rounded-md
            bg-[var(--color-background)]
            text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-muted)]
            transition-all duration-150
            focus:outline-none focus:border-[var(--color-primary)]
            focus:shadow-[0_0_0_3px_rgba(92,175,144,0.1)]
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error
                            ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                            : 'border-gray-200'
                        }
            ${className}
          `}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <span className="text-sm text-[var(--color-error)]">{error}</span>
            )}
            {helperText && !error && (
                <span className="text-sm text-[var(--color-text-muted)]">{helperText}</span>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
