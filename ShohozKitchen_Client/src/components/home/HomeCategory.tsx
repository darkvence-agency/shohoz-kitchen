"use client";

import React from 'react';
import Link from 'next/link';
import {
    MdOutlinePhoneIphone,
    MdOutlineCheckroom,
    MdOutlineHome,
    MdOutlineFace,
    MdOutlineSportsSoccer,
    MdOutlineMenuBook,
    MdOutlineWatch,
    MdOutlineHeadphones,
    MdOutlineChair,
    MdOutlineCardGiftcard
} from 'react-icons/md';
import { HiArrowNarrowRight } from 'react-icons/hi';

const categories = [
    { id: 1, name: 'Electronics', icon: MdOutlinePhoneIphone, items: 234, color: '#3B82F6', bgColor: '#EFF6FF' },
    { id: 2, name: 'Fashion', icon: MdOutlineCheckroom, items: 567, color: '#EC4899', bgColor: '#FDF2F8' },
    { id: 3, name: 'Home & Living', icon: MdOutlineHome, items: 189, color: '#10B981', bgColor: 'var(--color-primary-lightest)' },
    { id: 4, name: 'Beauty', icon: MdOutlineFace, items: 342, color: '#F59E0B', bgColor: '#FFFBEB' },
    { id: 5, name: 'Sports', icon: MdOutlineSportsSoccer, items: 156, color: '#EF4444', bgColor: '#FEF2F2' },
    { id: 6, name: 'Books', icon: MdOutlineMenuBook, items: 423, color: '#8B5CF6', bgColor: '#F5F3FF' },
    { id: 7, name: 'Watches', icon: MdOutlineWatch, items: 98, color: '#14B8A6', bgColor: '#F0FDFA' },
    { id: 8, name: 'Audio', icon: MdOutlineHeadphones, items: 167, color: '#6366F1', bgColor: '#EEF2FF' },
    { id: 9, name: 'Furniture', icon: MdOutlineChair, items: 245, color: '#84CC16', bgColor: '#F7FEE7' },
    { id: 10, name: 'Gifts', icon: MdOutlineCardGiftcard, items: 312, color: '#F43F5E', bgColor: '#FFF1F2' },
];

const HomeCategory: React.FC = () => {
    return (
        <div className='container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-16'>
            {/* Section Header - Left Aligned */}
            <div className='flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4'>
                <div className='text-left'>
                    <h2 className='text-2xl md:text-3xl font-bold text-gray-800 mb-2'>Browse Categories</h2>
                    <p className='text-gray-500 font-medium'>Find what you're looking for from our curated collection</p>
                </div>
                <Link
                    href="/"
                    className='text-[var(--color-primary)] font-bold text-sm flex items-center gap-2 hover:opacity-80 transition-all border-b-2 border-transparent hover:border-[var(--color-primary)] pb-1 w-fit'
                >
                    View All Categories <HiArrowNarrowRight size={18} />
                </Link>
            </div>

            {/* Categories Grid */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
                {categories.map(category => (
                    <Link href={`/?category=${category.id}`} key={category.id} className="block">
                        <div className='group relative bg-white border border-gray-100 rounded-md p-5 flex items-center gap-5 hover:shadow-2xl hover:shadow-[var(--color-primary)]/5 hover:border-[var(--color-primary)]/20 transition-all duration-300 cursor-pointer overflow-hidden'>
                            {/* Decorative Background Blur */}
                            <div
                                className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full opacity-10 group-hover:scale-[3] transition-transform duration-500 pointer-events-none"
                                style={{ backgroundColor: category.color }}
                            ></div>

                            {/* Icon - Left Side */}
                            <div
                                className='w-14 h-14 flex-shrink-0 rounded-md flex items-center justify-center group-hover:bg-white shadow-sm transition-all duration-300 z-10'
                                style={{ backgroundColor: category.bgColor }}
                            >
                                <category.icon size={26} style={{ color: category.color }} />
                            </div>

                            {/* Text - Left Side */}
                            <div className="z-10">
                                <h3 className='font-bold text-gray-800 text-[15px] mb-0.5 group-hover:text-[var(--color-primary)] transition-colors'>
                                    {category.name}
                                </h3>
                                <p className='text-[12px] font-semibold text-gray-400 uppercase tracking-tight'>
                                    {category.items} Products
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default HomeCategory;
