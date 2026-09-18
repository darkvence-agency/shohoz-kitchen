"use client";

import React from 'react';
import Link from 'next/link';

const TwoBanners: React.FC = () => {
    return (
        <div className='container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-12'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Left Banner - Cosmetic */}
                <div
                    className='relative rounded-md overflow-hidden h-40 md:h-48 bg-cover bg-center'
                    style={{ backgroundImage: 'url(https://portotheme.com/html/wolmart/assets/images/demos/demo1/categories/3-1.jpg)' }}
                >
                    <div className='absolute inset-0 flex flex-col justify-center px-8'>
                        <p className='text-[var(--color-primary)] text-xs font-semibold uppercase tracking-wider mb-1'>Natural Process</p>
                        <h3 className='text-white text-2xl md:text-3xl font-bold leading-tight mb-4'>
                            Cosmetic Makeup<br />Professional
                        </h3>
                        <Link
                            href="/?category=cosmetic"
                            className='text-white text-sm font-semibold flex items-center gap-2 hover:gap-3 transition-all'
                        >
                            SHOP NOW <span>→</span>
                        </Link>
                    </div>
                </div>

                {/* Right Banner - Women's Collection */}
                <div
                    className='relative rounded-md overflow-hidden h-40 md:h-48 bg-cover bg-center'
                    style={{ backgroundImage: 'url(https://portotheme.com/html/wolmart/assets/images/demos/demo1/categories/3-2.jpg)' }}
                >
                    <div className='absolute inset-0 flex flex-col justify-center px-8'>
                        <p className='text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1'>Trending Now</p>
                        <h3 className='text-gray-800 text-2xl md:text-3xl font-bold leading-tight mb-4'>
                            Women's Lifestyle<br />Collection
                        </h3>
                        <Link
                            href="/?category=women"
                            className='text-gray-800 text-sm font-semibold flex items-center gap-2 hover:gap-3 transition-all'
                        >
                            SHOP NOW <span>→</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TwoBanners;
