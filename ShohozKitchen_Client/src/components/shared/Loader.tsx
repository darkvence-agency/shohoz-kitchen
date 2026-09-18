"use client";

import React from 'react';

const Loader: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-100 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-[var(--color-primary)]/10 rounded-full animate-pulse"></div>
                </div>
            </div>
            <div className="flex flex-col items-center">
                <p className="text-lg font-bold text-gray-800 animate-pulse">Loading...</p>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-[0.2em] mt-1">Shohoz Kitchen</p>
            </div>
        </div>
    );
};

export default Loader;
