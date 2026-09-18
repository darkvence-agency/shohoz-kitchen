"use client";

import React from 'react';
import Link from 'next/link';

const collections = [
    {
        id: 1,
        title: "Women's",
        subtitle: "Collection",
        bgGradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
        id: 2,
        title: "Children's",
        subtitle: "Collection",
        bgGradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
    {
        id: 3,
        title: "Men's",
        subtitle: "Collection",
        bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
];

const Collection: React.FC = () => {
    return (
        <div>
            <div className='container mx-auto px-4 sm:px-8 md:px-12 lg:px-24 flex flex-wrap justify-center gap-8 my-24'>
                {collections.map(collection => (
                    <div
                        key={collection.id}
                        className='flex flex-col w-full sm:w-1/2 md:w-1/3 lg:w-auto flex-grow px-8 py-8 items-end min-h-[200px] rounded-md bg-cover bg-center'
                        style={{ background: collection.bgGradient }}
                    >
                        <h3 className='text-end text-white text-2xl sm:text-3xl md:text-4xl font-semibold'>
                            {collection.title} <br />{collection.subtitle}
                        </h3>
                        <Link href="/">
                            <button className='btn shadow-none bg-[var(--color-primary)] mt-4 text-white border-none'>
                                Shop Now
                            </button>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Collection;
