"use client";

import React, { useState } from 'react';
import ProductCard from '../shared/ProductCard';

// Demo products - will be replaced with API data
const demoProducts = [
    { id: 1, name: 'Premium Grocery Collection', image: 'https://maraviyainfotech.com/projects/grabit-tailwind/grabit-tailwind/assets/img/product-images/52_1.jpg', price: 450, rating: 5, reviews: 12, category: 'new' },
    { id: 2, name: 'Fresh Farm Produce', image: 'https://maraviyainfotech.com/projects/grabit-tailwind/grabit-tailwind/assets/img/product-images/38_1.jpg', price: 1200, originalPrice: 1500, discount: 20, rating: 5, reviews: 8, category: 'best' },
    { id: 3, name: 'Healthy Nut Mix', image: 'https://maraviyainfotech.com/projects/grabit-tailwind/grabit-tailwind/assets/img/product-images/54_1.jpg', price: 350, rating: 4, reviews: 15, category: 'popular' },
    { id: 4, name: 'Natural Organic Honey', image: 'https://maraviyainfotech.com/projects/grabit-tailwind/grabit-tailwind/assets/img/product-images/32_1.jpg', price: 550, rating: 4.5, reviews: 20, category: 'featured' },
    { id: 11, name: 'Vintage Leather Backpack', image: 'https://images.unsplash.com/photo-1548036691-cdf0e615eabe?q=80&w=800', price: 8500, originalPrice: 11000, discount: 22, rating: 5, reviews: 24, category: 'new' },
    { id: 12, name: 'Minimal White Sneakers', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800', price: 6500, rating: 4.8, reviews: 45, category: 'best' },
    { id: 13, name: 'Classic Navy Polo', image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?q=80&w=800', price: 2500, rating: 4.5, reviews: 32, category: 'popular' },
    { id: 14, name: 'Urban Snapback Cap', image: 'https://images.unsplash.com/photo-1588850567047-1849a4445e5f?q=80&w=800', price: 1800, originalPrice: 2500, discount: 28, rating: 4.2, reviews: 18, category: 'featured' },
    { id: 5, name: 'Handcrafted Felt Hat', image: 'https://images.unsplash.com/photo-1514327605112-b88325e5c540?q=80&w=800', price: 5300, rating: 4, reviews: 1, category: 'new' },
    { id: 6, name: "Premium Leather Handbag", image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800', price: 2600, rating: 4, reviews: 3, category: 'best' },
    { id: 7, name: 'iPhone 15 Pro Case', image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbea?q=80&w=800', price: 1300, originalPrice: 1450, discount: 7, rating: 5, reviews: 5, category: 'popular' },
    { id: 15, name: 'Luxury Travel Bag', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800', price: 12000, rating: 5, reviews: 10, category: 'best' },
    { id: 8, name: 'Designer Smart Watch', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800', price: 26000, rating: 4, reviews: 8, category: 'featured' },
    { id: 9, name: 'Ultra HD 4K Camera', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244ec32?q=80&w=800', price: 45000, originalPrice: 49900, discount: 10, rating: 4, reviews: 9, category: 'new' },
    { id: 10, name: 'Casual Summer Tee', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800', price: 1900, rating: 4, reviews: 22, category: 'best' },
];

const filters = [
    { id: 'all', label: 'ALL PRODUCTS' },
    { id: 'new', label: 'NEW ARRIVALS' },
    { id: 'best', label: 'BEST SELLER' },
    { id: 'popular', label: 'MOST POPULAR' },
    { id: 'featured', label: 'FEATURED' },
];

const PopularProducts: React.FC = () => {
    const [activeFilter, setActiveFilter] = useState('all');

    const filteredProducts = activeFilter === 'all'
        ? demoProducts
        : demoProducts.filter(p => p.category === activeFilter);

    return (
        <div className='container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-20'>
            {/* Section Header - Left Aligned */}
            <div className='mb-12'>
                <h2 className='text-3xl font-bold text-gray-900 mb-8'>
                    Popular Departments
                </h2>

                {/* Filter Tabs - Left Aligned */}
                <div className='flex flex-wrap gap-4'>
                    {filters.map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)}
                            className={`px-6 py-2.5 text-[13px] font-bold tracking-wider rounded-md transition-all ${activeFilter === filter.id
                                ? 'bg-[var(--color-primary)] text-white shadow-xl shadow-[var(--color-primary)]/20'
                                : 'bg-white text-gray-500 border border-gray-100 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Grid */}
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
                {filteredProducts.slice(0, 10).map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
};

export default PopularProducts;
