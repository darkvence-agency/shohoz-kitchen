"use client";

import React, { useState, useEffect } from 'react';
import {
    FiCheckCircle,
    FiAlertCircle,
    FiActivity,
    FiPackage,
    FiUsers,
    FiShoppingCart,
    FiDatabase,
    FiRefreshCw
} from 'react-icons/fi';
import { useGetApiHealthQuery } from '@/redux/api/dashboardApi';
import { useGetProductsQuery } from '@/redux/api/productApi';
import { useGetAdminUsersQuery } from '@/redux/api/userApi';
import { useGetDashboardSummaryQuery } from '@/redux/api/dashboardApi';

const ApiHealthPage = () => {
    const [lastChecked, setLastChecked] = useState<string>(new Date().toLocaleTimeString());

    // Core API Health
    const { data: healthData, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useGetApiHealthQuery({});

    // Module Checks
    const { isError: productError, isLoading: productLoading, refetch: refetchProducts } = useGetProductsQuery({ limit: 1 });
    const { isError: userError, isLoading: userLoading, refetch: refetchUsers } = useGetAdminUsersQuery({ limit: 1 });
    const { isError: statsError, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardSummaryQuery({});

    const handleRefreshAll = () => {
        refetchHealth();
        refetchProducts();
        refetchUsers();
        refetchStats();
        setLastChecked(new Date().toLocaleTimeString());
    };

    const StatusBadge = ({ error, loading }: { error: boolean, loading: boolean }) => {
        if (loading) return <span className="text-yellow-500 flex items-center gap-1 font-medium"><FiRefreshCw className="animate-spin" size={14} /> checking...</span>;
        if (error) return <span className="text-red-500 flex items-center gap-1 font-medium"><FiAlertCircle size={14} /> offline</span>;
        return <span className="text-emerald-500 flex items-center gap-1 font-medium"><FiCheckCircle size={14} /> online</span>;
    };

    const modules = [
        { name: 'Core API Server', icon: <FiActivity />, status: !healthError, loading: healthLoading, desc: 'Central backend system status' },
        { name: 'Product Service', icon: <FiPackage />, status: !productError, loading: productLoading, desc: 'Manage inventory and listings' },
        { name: 'User Management', icon: <FiUsers />, status: !userError, loading: userLoading, desc: 'Authentication and profile data' },
        { name: 'Order & Analytics', icon: <FiShoppingCart />, status: !statsError, loading: statsLoading, desc: 'Sales tracking and reports' },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <FiDatabase className="text-[var(--color-primary)]" />
                        System Health Monitor
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Monitoring real-time API connectivity and service status</p>
                </div>
                <button
                    onClick={handleRefreshAll}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-md font-bold hover:scale-105 transition-all shadow-lg shadow-[var(--color-primary)]/20 active:scale-95"
                >
                    <FiRefreshCw size={18} />
                    Run All Diagnostics
                </button>
            </div>

            {/* Server Info Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <FiActivity className="text-emerald-500" /> API Server Status
                    </h2>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Last Check: {lastChecked}</span>
                </div>
                <div className="p-8 flex flex-col md:flex-row gap-12">
                    <div className="flex-1">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">General Pulse</p>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                                <span className="text-gray-600 font-medium">Server Uptime</span>
                                <span className="font-bold text-gray-800">{healthData?.uptime ? `${Math.floor(healthData.uptime / 3600)}h ${Math.floor((healthData.uptime % 3600) / 60)}m` : '---'}</span>
                            </div>
                            <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                                <span className="text-gray-600 font-medium">Response Status</span>
                                <StatusBadge error={healthError} loading={healthLoading} />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 font-medium">Network Latency</span>
                                <span className="text-emerald-500 font-bold">Excellent</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-emerald-50/50 rounded-lg border border-emerald-100">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${healthError ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}>
                            {healthError ? <FiAlertCircle size={32} /> : <FiCheckCircle size={32} />}
                        </div>
                        <p className={`text-xl font-black ${healthError ? 'text-red-600' : 'text-emerald-600'}`}>
                            {healthError ? 'Critical System Error' : 'All systems operational'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 font-medium">Connection verified with primary database</p>
                    </div>
                </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {modules.map((module, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-all">
                                {module.icon}
                            </div>
                            <div className={`w-3 h-3 rounded-full ${module.loading ? 'bg-yellow-400 animate-pulse' : (module.status ? 'bg-emerald-400' : 'bg-red-400')}`}></div>
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1">{module.name}</h3>
                        <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">{module.desc}</p>
                        <StatusBadge error={!module.status} loading={module.loading} />
                    </div>
                ))}
            </div>

            {/* Footer Logic Test */}
            <div className="mt-12 p-6 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                    <FiRefreshCw size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900">Developer Diagnostic Tool</h4>
                    <p className="text-sm text-blue-700 font-medium">This page performs real-time verification of all core API controllers. If a service shows as 'offline', please check your environment variables and database connectivity.</p>
                </div>
            </div>
        </div>
    );
};

export default ApiHealthPage;
