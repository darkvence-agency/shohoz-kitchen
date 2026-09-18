"use client";

import React, { useState } from 'react';
import { FiSearch, FiMail, FiPhone, FiMapPin, FiEdit2, FiTrash2, FiEye, FiUserPlus } from 'react-icons/fi';

// Demo customers
const customersData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '01712345678', orders: 12, spent: '৳45,890', status: 'Active', joined: '2025-06-15', avatar: 'J' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '01823456789', orders: 8, spent: '৳32,450', status: 'Active', joined: '2025-07-22', avatar: 'J' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', phone: '01934567890', orders: 5, spent: '৳18,990', status: 'Active', joined: '2025-08-10', avatar: 'M' },
    { id: 4, name: 'Sarah Wilson', email: 'sarah@example.com', phone: '01645678901', orders: 15, spent: '৳67,340', status: 'VIP', joined: '2025-03-05', avatar: 'S' },
    { id: 5, name: 'Tom Brown', email: 'tom@example.com', phone: '01756789012', orders: 3, spent: '৳8,990', status: 'Inactive', joined: '2025-11-20', avatar: 'T' },
    { id: 6, name: 'Emily Davis', email: 'emily@example.com', phone: '01867890123', orders: 22, spent: '৳89,670', status: 'VIP', joined: '2025-01-12', avatar: 'E' },
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Active': return 'bg-green-100 text-green-700';
        case 'VIP': return 'bg-purple-100 text-purple-700';
        case 'Inactive': return 'bg-gray-100 text-gray-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

export default function CustomersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');

    const filteredCustomers = customersData.filter(customer => {
        const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'All' || customer.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
                    <p className="text-gray-500">Manage your customer database</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90">
                    <FiUserPlus size={20} />
                    Add Customer
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-800">{customersData.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="text-2xl font-bold text-green-600">{customersData.filter(c => c.status === 'Active').length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">VIP Customers</p>
                    <p className="text-2xl font-bold text-purple-600">{customersData.filter(c => c.status === 'VIP').length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-[var(--color-primary)]">৳2,63,330</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                        />
                    </div>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-4 py-2 border rounded-lg bg-white"
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="VIP">VIP</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer) => (
                    <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-lg">
                                    {customer.avatar}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                                        {customer.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600">
                                    <FiEdit2 size={16} />
                                </button>
                                <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600">
                                    <FiTrash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-2">
                                <FiMail size={14} className="text-gray-400" />
                                {customer.email}
                            </div>
                            <div className="flex items-center gap-2">
                                <FiPhone size={14} className="text-gray-400" />
                                {customer.phone}
                            </div>
                        </div>

                        <div className="border-t pt-4 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500">Orders</p>
                                <p className="font-semibold text-gray-800">{customer.orders}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Total Spent</p>
                                <p className="font-semibold text-[var(--color-primary)]">{customer.spent}</p>
                            </div>
                        </div>

                        <button className="w-full mt-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
                            <FiEye size={16} />
                            View Details
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
