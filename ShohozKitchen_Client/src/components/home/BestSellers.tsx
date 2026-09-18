"use client";

import React from 'react';
import NewProductCard from '@/components/shared/NewProductCard';
import { useGetProductsQuery } from '@/redux/api/productApi';
import SectionHeader from './SectionHeader';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Daraz-style "Best Sellers" section — the top-selling products from
 * GET /api/products?limit=12&sort=-totalSold. Reuses the shared NewProductCard
 * so the look stays identical to the main feed. Renders nothing if there are no
 * products yet.
 */
const BestSellers: React.FC = () => {
    const { data } = useGetProductsQuery({ limit: 12, sort: '-totalSold' });
    const products: any[] = data?.data || [];

    if (products.length === 0) return null;

    return (
        <div className="container mx-auto px-2 sm:px-4 my-2 sm:my-3">
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                <SectionHeader title="Best Sellers" seeMoreHref="/products?sort=-totalSold" />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                    {products.map((product) => (
                        <NewProductCard
                            key={product._id}
                            product={{
                                id: product._id,
                                slug: product.slug,
                                name: product.name,
                                image: product.thumbnail || product.images?.[0] || '',
                                price: product.price,
                                originalPrice: product.originalPrice || undefined,
                                discount: product.discount,
                                rating: product.rating,
                                reviews: product.reviewCount,
                                warranty: product.tagline || product.brand || 'Lower price than others but quality higher',
                                categoryName: product.category?.name || '',
                                priceType: product.priceType || 'negotiable',
                                sold: product.totalSold || 0,
                                likeCount: product.likeCount || 0,
                                commentCount: product.commentCount || 0,
                                shareCount: product.shareCount || 0,
                                viewCount: product.viewCount || 0,
                                reviewCount: product.reviewCount || 0,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BestSellers;
