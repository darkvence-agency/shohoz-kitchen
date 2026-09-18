"use client";

import React from 'react';
import Link from 'next/link';

interface LatestExclusiveProps {
    bgImage?: string;
}

const LatestExclusive: React.FC<LatestExclusiveProps> = ({ bgImage }) => {
    return (
        <div className='py-24'>
            <div
                className='h-[50vh] sm:h-[60vh] container mx-auto px-4 sm:px-8 md:px-12 lg:px-24 rounded-md bg-cover bg-center'
                style={{
                    backgroundImage: bgImage ? `url(${bgImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
            >
                <div className='text-white flex justify-center h-full gap-4 flex-col items-center text-center md:items-end md:text-right'>
                    <p className='text-2xl sm:text-3xl md:text-4xl font-semibold'>30% off sale</p>
                    <h3 className='text-3xl sm:text-4xl md:text-5xl font-semibold'>
                        Latest Exclusive <br />
                        Summer Collection
                    </h3>
                    <Link href="/">
                        <button className='bg-[var(--color-primary)] px-5 py-2 rounded-md text-white hover:scale-105 transition-all'>
                            Shop Now
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LatestExclusive;
