"use client";

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = `
    inline-flex items-center justify-center gap-2 font-medium 
    rounded-md border-none cursor-pointer transition-all duration-300
    disabled:opacity-50 disabled:cursor-not-allowed
    hover:transform hover:-translate-y-0.5 hover:shadow-lg
    active:transform active:translate-y-0
  `;

    const variantStyles = {
        primary: 'bg-[var(--color-primary)] text-white hover:brightness-110',
        secondary: 'bg-[var(--color-secondary)] text-white hover:brightness-110',
        outline: 'bg-transparent border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white',
        ghost: 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]',
        accent: 'bg-[var(--color-accent)] text-white hover:brightness-110',
    };

    const sizeStyles = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            ) : (
                leftIcon
            )}
            {children}
            {rightIcon && !isLoading && rightIcon}
        </button>
    );
};

export default Button;
