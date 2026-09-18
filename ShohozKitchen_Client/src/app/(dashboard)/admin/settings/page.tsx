"use client";

import React, { useState } from 'react';
import { FiSave, FiGlobe, FiMail, FiPhone, FiMapPin, FiDollarSign, FiTruck, FiLock, FiBell } from 'react-icons/fi';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General', icon: FiGlobe },
        { id: 'payments', label: 'Payments', icon: FiDollarSign },
        { id: 'shipping', label: 'Shipping', icon: FiTruck },
        { id: 'notifications', label: 'Notifications', icon: FiBell },
        { id: 'security', label: 'Security', icon: FiLock },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
                <p className="text-gray-500">Manage your store settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeTab === tab.id
                                        ? 'bg-[var(--color-primary)] text-white'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon size={20} />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Settings Content */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        {/* General Settings */}
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-800">General Settings</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
                                        <input
                                            type="text"
                                            defaultValue="Shohoz Kitchen"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Store Email</label>
                                        <input
                                            type="email"
                                            defaultValue="info@megashop.com"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                        <input
                                            type="tel"
                                            defaultValue="+880 1234 567 890"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                                        <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]">
                                            <option>BDT (৳)</option>
                                            <option>USD ($)</option>
                                            <option>EUR (€)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Store Address</label>
                                        <textarea
                                            rows={3}
                                            defaultValue="123 Shopping Street, Dhaka 1000, Bangladesh"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Store Description</label>
                                        <textarea
                                            rows={4}
                                            defaultValue="Your one-stop destination for all your shopping needs. Quality products, best prices, and excellent customer service."
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Payment Settings */}
                        {activeTab === 'payments' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-800">Payment Settings</h2>

                                <div className="space-y-4">
                                    {[
                                        { name: 'Cash on Delivery', enabled: true },
                                        { name: 'bKash', enabled: true },
                                        { name: 'Nagad', enabled: true },
                                        { name: 'Rocket', enabled: false },
                                        { name: 'Credit/Debit Card', enabled: true },
                                        { name: 'Bank Transfer', enabled: false },
                                    ].map((method, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                    💳
                                                </div>
                                                <span className="font-medium">{method.name}</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" defaultChecked={method.enabled} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shipping Settings */}
                        {activeTab === 'shipping' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-800">Shipping Settings</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Inside Dhaka</label>
                                        <input
                                            type="number"
                                            defaultValue="60"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Outside Dhaka</label>
                                        <input
                                            type="number"
                                            defaultValue="120"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Free Shipping Above</label>
                                        <input
                                            type="number"
                                            defaultValue="2000"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time (Days)</label>
                                        <input
                                            type="text"
                                            defaultValue="3-5"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifications Settings */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-800">Notification Settings</h2>

                                <div className="space-y-4">
                                    {[
                                        { name: 'New Order Email', desc: 'Receive email for new orders', enabled: true },
                                        { name: 'Order Status Update', desc: 'Notify customer on order status change', enabled: true },
                                        { name: 'Low Stock Alert', desc: 'Alert when stock is below threshold', enabled: true },
                                        { name: 'New Customer', desc: 'Email when new customer registers', enabled: false },
                                        { name: 'New Review', desc: 'Notify on new product reviews', enabled: true },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-800">{item.name}</p>
                                                <p className="text-sm text-gray-500">{item.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Security Settings */}
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-800">Security Settings</h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                        <input
                                            type="password"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                        <input
                                            type="password"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <p className="font-medium text-gray-800">Two-Factor Authentication</p>
                                            <p className="text-sm text-gray-500">Add extra security to your account</p>
                                        </div>
                                        <button className="px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg font-medium hover:bg-[var(--color-primary)] hover:text-white transition-colors">
                                            Enable
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="mt-8 pt-6 border-t flex justify-end">
                            <button className="flex items-center gap-2 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90">
                                <FiSave size={18} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
