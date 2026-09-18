"use client";

import React from "react";
import Link from "next/link";
import {
    FaFacebookF,
    FaTwitter,
    FaLinkedinIn,
    FaInstagram,
    FaCcVisa,
    FaCcMastercard,
    FaCcPaypal,
    FaCcAmex,
} from "react-icons/fa";
import { AiOutlinePhone, AiOutlineMail } from "react-icons/ai";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { FiSend } from "react-icons/fi";

const Footer: React.FC = () => {
    const categories = [
        "Electronics",
        "Fashion & Clothing",
        "Home & Garden",
        "Beauty & Health",
        "Sports & Outdoor",
        "Toys & Hobbies",
    ];
    const quickLinks = [
        { label: "Home", href: "/" },
        { label: "My Account", href: "/dashboard/user" },
        { label: "Cart", href: "/cart" },
        { label: "Checkout", href: "/checkout" },
    ];

    return (
        <footer className="bg-[#1a1a1a] text-gray-300 pt-16">
            <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16">
                {/* Upper Footer: Newsletter & Social */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pb-12 border-b border-gray-800">
                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-2">Subscribe to our newsletter</h2>
                        <p className="text-gray-400">Get all the latest information on Events, Sales and Offers.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <input
                                type="email"
                                placeholder="Email address here..."
                                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-md py-3 px-4 outline-none focus:border-[var(--color-primary)] transition-all"
                            />
                        </div>
                        <button className="bg-[var(--color-primary)] text-white px-8 py-3 rounded-md font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                            SUBSCRIBE <FiSend />
                        </button>
                    </div>
                </div>

                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 py-16">
                    {/* Column 1: About */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-md bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-xl">
                                M
                            </div>
                            <span className="text-2xl font-semibold text-white">Shohoz Kitchen</span>
                        </div>
                        <p className="text-sm leading-relaxed mb-6 italic">
                            "Providing the best products for our customers since 2020. Quality and satisfaction guaranteed."
                        </p>
                        <div className="flex gap-4">
                            {[FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram].map((Icon, i) => (
                                <Link key={i} href="#" className="w-10 h-10 rounded-md bg-[#2a2a2a] flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-all duration-300">
                                    <Icon size={16} />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Categories */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-6 uppercase tracking-wider">Categories</h3>
                        <ul className="space-y-4">
                            {categories.map((item, i) => (
                                <li key={i}>
                                    <Link href="/" className="hover:text-[var(--color-primary)] hover:translate-x-1 inline-block transition-all duration-300">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Quick Links */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-6 uppercase tracking-wider">Quick Links</h3>
                        <ul className="space-y-4">
                            {quickLinks.map((item, i) => (
                                <li key={i}>
                                    <Link href={item.href} className="hover:text-[var(--color-primary)] hover:translate-x-1 inline-block transition-all duration-300">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Contact Info */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-6 uppercase tracking-wider">Contact Info</h3>
                        <ul className="space-y-5">
                            <li className="flex gap-4">
                                <HiOutlineLocationMarker className="text-[var(--color-primary)] flex-shrink-0" size={24} />
                                <span className="text-sm">123 Street, Dhaka, Bangladesh</span>
                            </li>
                            <li className="flex gap-4">
                                <AiOutlinePhone className="text-[var(--color-primary)] flex-shrink-0" size={24} />
                                <span className="text-sm">+880 1234 567 890</span>
                            </li>
                            <li className="flex gap-4">
                                <AiOutlineMail className="text-[var(--color-primary)] flex-shrink-0" size={24} />
                                <span className="text-sm">support@megashop.com</span>
                            </li>
                        </ul>
                        <div className="mt-8">
                            <h4 className="text-white font-bold mb-4 uppercase text-xs">Download App</h4>
                            <div className="flex gap-2">
                                <div className="bg-[#2a2a2a] p-2 rounded-md border border-gray-700 cursor-pointer hover:border-[var(--color-primary)] transition-all">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Play Store" className="h-8" />
                                </div>
                                <div className="bg-[#2a2a2a] p-2 rounded-md border border-gray-700 cursor-pointer hover:border-[var(--color-primary)] transition-all">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-8" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright Area */}
            <div className="bg-[#111111] py-8">
                <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-sm text-gray-500">
                        Copyright © {new Date().getFullYear()} <span className="text-white font-bold">Shohoz Kitchen</span>. All Rights Reserved.
                    </p>
                    <div className="flex items-center gap-4 grayscale opacity-50">
                        <FaCcVisa size={30} />
                        <FaCcMastercard size={30} />
                        <FaCcPaypal size={30} />
                        <FaCcAmex size={30} />
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
