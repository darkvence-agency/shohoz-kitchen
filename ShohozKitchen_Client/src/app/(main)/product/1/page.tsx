"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { FiHeart, FiShare2, FiShoppingCart, FiMinus, FiPlus, FiCheckCircle, FiTruck, FiRefreshCw } from 'react-icons/fi';
import { FaStar, FaFacebookF, FaTwitter, FaPinterestP, FaInstagram } from 'react-icons/fa';
import ProductCard from '@/components/shared/ProductCard';

const relatedProducts = [
    { id: 1, name: 'Floral Summer Dress', image: 'https://portotheme.com/html/wolmart/assets/images/demos/demo1/products/2-1.jpg', price: 45.00, rating: 5, reviews: 12, category: 'Fashion' },
    { id: 2, name: 'Elegant Evening Gown', image: 'https://portotheme.com/html/wolmart/assets/images/demos/demo1/products/2-2.jpg', price: 120.00, rating: 5, reviews: 8, category: 'Fashion' },
    { id: 11, name: 'Premium Leather Backpack', image: 'https://portotheme.com/html/wolmart/assets/images/demos/demo1/products/1-2.jpg', price: 85.00, rating: 5, reviews: 24, category: 'Accessories' },
    { id: 12, name: 'Modern White Sneakers', image: 'https://portotheme.com/html/wolmart/assets/images/demos/demo1/products/1-5.jpg', price: 65.00, rating: 4.8, reviews: 45, category: 'Shoes' },
];

export default function ProductDetailsPage() {
    const { id } = useParams();
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [selectedImage, setSelectedImage] = useState(0);

    // Dynamic mock product based on ID (In real app, fetch from API)
    const product = {
        id: id,
        name: "Premium Leather Fashion Backpack",
        price: 85.00,
        originalPrice: 110.00,
        rating: 4.8,
        reviews: 124,
        sku: "MS-46893",
        category: "Accessories",
        tags: ["Bag", "Fashion", "Leather"],
        images: [
            "https://portotheme.com/html/wolmart/assets/images/demos/demo1/products/1-2.jpg",
            "https://portotheme.com/html/wolmart/assets/images/demos/demo1/products/1-1.jpg",
            "https://portotheme.com/html/wolmart/assets/images/demos/demo1/products/1-3.jpg",
            "https://portotheme.com/html/wolmart/assets/images/demos/demo1/products/1-4.jpg"
        ],
        description: "Experience the perfect blend of style and functionality with our Premium Leather Fashion Backpack. Crafted from high-quality top-grain leather, this backpack is designed to age beautifully while withstanding the rigors of daily travel. Featuring multiple compartments including a padded laptop sleeve, it's the ideal companion for the modern professional or urban explorer."
    };

    return (
        <div className="bg-white min-h-screen">
            {/* Breadcrumb */}
            <div className="bg-gray-50 border-b border-gray-100 py-3">
                <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 flex items-center gap-2 text-[13px] text-gray-400 font-medium">
                    <a href="/" className="hover:text-[var(--color-primary)]">Home</a>
                    <span>/</span>
                    <a href="/" className="hover:text-[var(--color-primary)]">Shop</a>
                    <span>/</span>
                    <span className="text-gray-900">{product.name}</span>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-12">
                <div className="flex flex-col lg:flex-row gap-16">
                    {/* LEFT: Image Gallery */}
                    <div className="flex-1">
                        <div className="flex flex-col-reverse md:flex-row gap-4">
                            {/* Thumbnails */}
                            <div className="flex md:flex-col gap-4">
                                {product.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={`w-20 h-20 border-2 rounded-xl overflow-hidden transition-all ${selectedImage === idx ? 'border-[var(--color-primary)] shadow-lg' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <img src={img} className="w-full h-full object-cover" alt="product" />
                                    </button>
                                ))}
                            </div>
                            {/* Main Image */}
                            <div className="flex-1 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group">
                                <img
                                    src={product.images[selectedImage]}
                                    className="w-full h-full object-contain p-10 group-hover:scale-110 transition-transform duration-700"
                                    alt="Selected product"
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Product Info */}
                    <div className="flex-1">
                        <div className="pb-8 border-b border-gray-100">
                            <p className="text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-3">{product.category}</p>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">{product.name}</h1>

                            <div className="flex items-center gap-6 mb-6">
                                <div className="flex items-center gap-1">
                                    <div className="flex text-[#fba20b]">
                                        {[...Array(5)].map((_, i) => <FaStar key={i} size={14} className={i < 4 ? 'text-[#fba20b]' : 'text-gray-300'} />)}
                                    </div>
                                    <span className="text-sm text-gray-400 font-medium font-medium">({product.reviews} Customer Reviews)</span>
                                </div>
                                <span className="w-[1px] h-4 bg-gray-200"></span>
                                <span className="text-sm text-green-500 font-bold flex items-center gap-1">
                                    <FiCheckCircle /> In Stock
                                </span>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-3xl font-black text-[var(--color-primary)]">${product.price.toFixed(2)}</span>
                                <span className="text-xl text-gray-400 line-through font-medium">${product.originalPrice?.toFixed(2)}</span>
                                <span className="bg-red-50 text-red-500 text-xs font-bold px-2 py-1 rounded">20% SAVE</span>
                            </div>

                            <p className="text-gray-500 text-[15px] leading-loose mb-8">
                                {product.description}
                            </p>
                        </div>

                        {/* Actions Area */}
                        <div className="py-8 space-y-8">
                            {/* Quantity and Cart */}
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center border-2 border-gray-100 rounded-xl px-2">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-12 h-14 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        <FiMinus size={18} />
                                    </button>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        className="w-12 h-14 bg-transparent border-none text-center font-black text-lg focus:ring-0"
                                    />
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-12 h-14 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        <FiPlus size={18} />
                                    </button>
                                </div>
                                <button className="flex-1 h-14 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-[var(--color-primary)] transition-all shadow-xl shadow-gray-200">
                                    <FiShoppingCart size={20} />
                                    ADD TO CART
                                </button>
                                <button className="w-14 h-14 border-2 border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-all">
                                    <FiHeart size={22} />
                                </button>
                            </div>

                            {/* Buy Now */}
                            <button className="w-full h-14 border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl font-black hover:bg-[var(--color-primary)] hover:text-white transition-all">
                                BUY NOW
                            </button>

                            {/* Meta Info */}
                            <div className="pt-8 border-t border-gray-50 space-y-4">
                                <div className="flex gap-10">
                                    <p className="text-xs font-black text-gray-400 uppercase w-16">SKU:</p>
                                    <p className="text-xs font-bold text-gray-700">{product.sku}</p>
                                </div>
                                <div className="flex gap-10">
                                    <p className="text-xs font-black text-gray-400 uppercase w-16">CATEGORY:</p>
                                    <p className="text-xs font-bold text-gray-700">{product.category}</p>
                                </div>
                                <div className="flex gap-10">
                                    <p className="text-xs font-black text-gray-400 uppercase w-16">TAGS:</p>
                                    <div className="flex gap-2">
                                        {product.tags.map(tag => <span key={tag} className="text-xs font-bold text-gray-700 hover:text-[var(--color-primary)] cursor-pointer">#{tag}</span>)}
                                    </div>
                                </div>
                            </div>

                            {/* Social Share */}
                            <div className="flex items-center gap-6 pt-4">
                                <p className="text-xs font-black text-gray-400 uppercase">Share On:</p>
                                <div className="flex gap-4">
                                    <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-[#3b5998] hover:text-white transition-all"><FaFacebookF size={14} /></button>
                                    <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-[#1da1f2] hover:text-white transition-all"><FaTwitter size={14} /></button>
                                    <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-[#bd081c] hover:text-white transition-all"><FaPinterestP size={14} /></button>
                                    <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-[#e4405f] hover:text-white transition-all"><FaInstagram size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Guarantee Bars */}
                        <div className="grid grid-cols-3 gap-4 pt-10">
                            {[
                                { icon: FiTruck, title: "Fast Delivery", sub: "Standard Shipping" },
                                { icon: FiRefreshCw, title: "Easy Returns", sub: "30 Days Money Back" },
                                { icon: FiCheckCircle, title: "100% Secure", sub: "Safe Payments" }
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 rounded-xl p-4 text-center group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100">
                                    <item.icon className="mx-auto mb-2 text-[var(--color-primary)] group-hover:scale-110 transition-transform" size={24} />
                                    <p className="text-[11px] font-black text-gray-900 uppercase mb-1">{item.title}</p>
                                    <p className="text-[10px] font-medium text-gray-400">{item.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* BOTTOM: Tabs Section */}
                <div className="mt-24">
                    <div className="flex justify-center border-b border-gray-100 gap-12">
                        {['Description', 'Reviews', 'Shipping'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                className={`pb-6 text-sm font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === tab.toLowerCase() ? 'text-gray-900 after:w-full' : 'text-gray-400 after:w-0 hover:text-gray-600'} after:content-[""] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-[var(--color-primary)] after:transition-all`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="py-12 max-w-4xl mx-auto text-center">
                        {activeTab === 'description' && (
                            <div className="animate-fadeIn">
                                <h3 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-widest">About This Product</h3>
                                <p className="text-gray-500 leading-loose">
                                    {product.description} It offers exceptional durability with its premium materials. Whether you're commuting to work or heading out for a weekend adventure, this piece combines utility with an unmatched minimalist aesthetic. The internal organization is thoughtfully laid out to keep your essentials safe and accessible.
                                </p>
                            </div>
                        )}
                        {activeTab === 'reviews' && <div className="text-gray-500 font-bold uppercase tracking-widest py-10">No reviews yet. Be the first to review!</div>}
                        {activeTab === 'shipping' && <div className="text-gray-500 font-bold uppercase tracking-widest py-10">Free shipping on orders over $200. Standard delivery takes 3-5 business days.</div>}
                    </div>
                </div>

                {/* Related Products Section */}
                <div className="mt-24 pt-24 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-12">
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-widest">Related Products</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                </div>
            </div>
        </div>
    );
}
