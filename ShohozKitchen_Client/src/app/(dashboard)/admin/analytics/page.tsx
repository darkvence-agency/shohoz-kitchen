"use client";

import React from 'react';
import {
    FiTrendingUp,
    FiTrendingDown,
    FiCalendar,
    FiDollarSign,
    FiShoppingCart,
    FiUsers,
    FiEye
} from 'react-icons/fi';

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
                    <p className="text-gray-500">Track your store performance</p>
                </div>
                <div className="flex gap-3">
                    <select className="px-4 py-2 border rounded-lg bg-white text-sm">
                        <option>Last 7 days</option>
                        <option>Last 30 days</option>
                        <option>Last 3 months</option>
                        <option>This year</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <FiCalendar size={18} />
                        Custom Range
                    </button>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Total Revenue', value: '৳12,54,300', change: '+12.5%', trend: 'up', icon: FiDollarSign, color: 'var(--color-primary)' },
                    { title: 'Total Orders', value: '3,245', change: '+8.2%', trend: 'up', icon: FiShoppingCart, color: '#3B82F6' },
                    { title: 'Unique Visitors', value: '45,678', change: '+15.3%', trend: 'up', icon: FiEye, color: '#8B5CF6' },
                    { title: 'Conversion Rate', value: '3.24%', change: '-0.8%', trend: 'down', icon: FiUsers, color: '#F59E0B' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${stat.color}15` }}
                            >
                                <stat.icon size={24} style={{ color: stat.color }} />
                            </div>
                            <span className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {stat.trend === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
                        <p className="text-sm text-gray-500">{stat.title}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Revenue Overview</h3>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                            <div key={day} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-[var(--color-primary)] rounded-t-lg hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
                                    style={{ height: `${Math.random() * 180 + 40}px` }}
                                />
                                <span className="text-xs text-gray-500">{day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Orders Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Orders Overview</h3>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                            <div key={day} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-blue-500 rounded-t-lg hover:bg-blue-600 transition-colors cursor-pointer"
                                    style={{ height: `${Math.random() * 180 + 40}px` }}
                                />
                                <span className="text-xs text-gray-500">{day}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Traffic Sources & Top Pages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic Sources */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Traffic Sources</h3>
                    <div className="space-y-4">
                        {[
                            { source: 'Direct', value: 45, color: 'var(--color-primary)' },
                            { source: 'Organic Search', value: 30, color: '#3B82F6' },
                            { source: 'Social Media', value: 15, color: '#EC4899' },
                            { source: 'Referral', value: 10, color: '#F59E0B' },
                        ].map((item, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">{item.source}</span>
                                    <span className="font-medium">{item.value}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Pages */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Top Pages</h3>
                    <div className="space-y-4">
                        {[
                            { page: '/shop', views: '12,456', bounceRate: '32%' },
                            { page: '/products/wireless-headphones', views: '8,234', bounceRate: '28%' },
                            { page: '/', views: '7,890', bounceRate: '45%' },
                            { page: '/categories/electronics', views: '5,678', bounceRate: '38%' },
                            { page: '/cart', views: '4,321', bounceRate: '22%' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div>
                                    <p className="font-medium text-gray-800">{item.page}</p>
                                    <p className="text-sm text-gray-500">{item.views} views</p>
                                </div>
                                <span className="text-sm text-gray-500">Bounce: {item.bounceRate}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Recent Activity</h3>
                <div className="space-y-4">
                    {[
                        { action: 'New order placed', details: 'Order #ORD-001 by John Doe', time: '2 minutes ago', type: 'order' },
                        { action: 'Product added', details: 'Wireless Headphones Pro added to inventory', time: '15 minutes ago', type: 'product' },
                        { action: 'New customer registered', details: 'sarah@example.com joined', time: '1 hour ago', type: 'customer' },
                        { action: 'Payment received', details: '৳4,999 from Order #ORD-002', time: '2 hours ago', type: 'payment' },
                        { action: 'Review submitted', details: '5-star review on Smart Watch Pro', time: '3 hours ago', type: 'review' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'order' ? 'bg-blue-100 text-blue-600' :
                                    item.type === 'product' ? 'bg-green-100 text-green-600' :
                                        item.type === 'customer' ? 'bg-purple-100 text-purple-600' :
                                            item.type === 'payment' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-pink-100 text-pink-600'
                                }`}>
                                {item.type === 'order' ? <FiShoppingCart /> :
                                    item.type === 'product' ? '📦' :
                                        item.type === 'customer' ? <FiUsers /> :
                                            item.type === 'payment' ? <FiDollarSign /> : '⭐'}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-800">{item.action}</p>
                                <p className="text-sm text-gray-500">{item.details}</p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{item.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
