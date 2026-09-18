"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';

const DEFAULT_HERO_IMAGE = '/images/hero-01.png';
/** Portrait-friendly crop of the same banner, for < 768px. */
const MOBILE_HERO_IMAGE = '/images/hero-01-mobile.jpg';

interface HeroSlide {
    _id?: string;
    imageUrl: string;
    link?: string;
    active?: boolean;
    order?: number;
}

const HeroSection: React.FC = () => {
    const { data: siteRes } = useGetSiteContentQuery({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Extract and sort active hero slides from site-content
    const slides: HeroSlide[] = useMemo(() => {
        const rawSlides: HeroSlide[] = siteRes?.data?.heroSlides;
        if (Array.isArray(rawSlides) && rawSlides.length > 0) {
            const activeOnly = rawSlides
                .filter((s) => s && s.active !== false && s.imageUrl)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            if (activeOnly.length > 0) return activeOnly;
        }
        return [{ imageUrl: DEFAULT_HERO_IMAGE, link: '/products' }];
    }, [siteRes]);

    const total = slides.length;
    // Derive valid index safely without needing a setState effect
    const safeIndex = currentIndex < total ? currentIndex : 0;

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => ((prev < total ? prev : 0) + 1) % total);
    }, [total]);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => ((prev < total ? prev : 0) - 1 + total) % total);
    }, [total]);

    // Auto-advance every 5 seconds if there are multiple slides and user is not hovering
    useEffect(() => {
        if (total <= 1 || isHovered) return;
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [total, isHovered, nextSlide]);

    const currentSlide = slides[safeIndex] || slides[0];
    const isDefaultSlide = currentSlide.imageUrl === DEFAULT_HERO_IMAGE;

    return (
        <section className="w-full">
            {/* Same .container as every other section, so the banner's edges line
                up with the cards below it. Its width rule lives in globals.css. */}
            <div className="container mx-auto py-4 sm:py-5">
                <div
                    className="relative w-full h-[200px] min-[480px]:h-[260px] sm:h-[320px] md:h-[380px] lg:h-auto lg:aspect-[2293/590] rounded-md overflow-hidden bg-slate-100 group shadow-sm"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Slide Image Link */}
                    <Link
                        href={currentSlide.link || '/products'}
                        className="block relative w-full h-full"
                        aria-label="Hero Banner"
                    >
                        {/* The banner is 3.89:1 but the frame is ~1.7:1 on phones and
                            tablets, so object-cover would crop ~28% off each side and
                            eat the products. Serve a portrait-friendly crop below 768px
                            and the wide one above it. Only the default banner has a
                            mobile cut; admin-uploaded slides fall back to the wide file. */}
                        <picture>
                            {isDefaultSlide && (
                                <source media="(max-width: 1023px)" srcSet={MOBILE_HERO_IMAGE} />
                            )}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                key={currentSlide.imageUrl}
                                src={currentSlide.imageUrl}
                                alt="Shohoz Kitchen Hero Banner"
                                className="w-full h-full object-cover object-center transition-opacity duration-500 ease-in-out"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = DEFAULT_HERO_IMAGE;
                                }}
                            />
                        </picture>
                    </Link>

                    {/* Navigation Arrows (shown if multiple slides) */}
                    {total > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    prevSlide();
                                }}
                                aria-label="Previous Slide"
                                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105 backdrop-blur-xs cursor-pointer z-10"
                            >
                                <FiChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    nextSlide();
                                }}
                                aria-label="Next Slide"
                                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105 backdrop-blur-xs cursor-pointer z-10"
                            >
                                <FiChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>

                            {/* Dots Indicator */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-10 bg-black/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
                                {slides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setCurrentIndex(idx);
                                        }}
                                        aria-label={`Go to slide ${idx + 1}`}
                                        className={`transition-all duration-300 rounded-full cursor-pointer ${
                                            idx === safeIndex
                                                ? 'w-5 sm:w-6 h-2 bg-white'
                                                : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                                        }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
