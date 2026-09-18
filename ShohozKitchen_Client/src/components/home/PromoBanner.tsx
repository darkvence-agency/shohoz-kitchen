"use client";

import React from 'react';
import Link from 'next/link';

const PromoBanner: React.FC = () => {
    return (
        <div className='container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 pt-2 pb-12'>
            <div
                className='rounded-md overflow-hidden bg-cover bg-center bg-no-repeat'
                style={{ backgroundImage: 'url(https://portotheme.com/html/wolmart/assets/images/demos/demo1/banners/4.jpg)' }}
            >
                <div className='flex items-center justify-between px-8 md:px-12 py-8'>
                    {/* Left - Discount */}
                    <div className='flex items-center gap-6 md:gap-10'>
                        <div className='flex items-baseline'>
                            <span className='text-[#f5a623] text-4xl md:text-5xl font-bold'>25</span>
                            <div className='flex flex-col ml-1'>
                                <span className='text-[#f5a623] text-lg md:text-xl font-bold'>%</span>
                                <span className='text-white text-xs'>OFF</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className='hidden sm:block w-px h-12 bg-gray-500'></div>

                        {/* Text */}
                        <div className='hidden sm:block'>
                            <h3 className='text-white text-lg md:text-xl font-bold uppercase tracking-wide'>
                                For Today's Fashion
                            </h3>
                            <p className='text-gray-300 text-sm'>
                                Use code <span className='bg-gray-700 text-white px-2 py-0.5 rounded text-xs font-mono'>Black 12345</span> to get best offer.
                            </p>
                        </div>
                    </div>

                    {/* Right - Shop Now Button */}
                    <Link
                        href="/?discount=25"
                        className='flex items-center gap-2 border border-white text-white px-6 py-2.5 font-medium text-sm hover:bg-white hover:text-gray-800 transition-all rounded-md whitespace-nowrap'
                    >
                        SHOP NOW
                        <span>→</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PromoBanner;
