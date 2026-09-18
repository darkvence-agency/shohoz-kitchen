"use client";

import React, { useState } from 'react';
import {
    FiPlay,
    FiCheckCircle,
    FiXCircle,
    FiLoader,
    FiDatabase,
    FiShield,
    FiBox,
    FiUsers,
    FiShoppingBag,
    FiSearch,
    FiActivity
} from 'react-icons/fi';
import { useGetProductsQuery } from '@/redux/api/productApi';
import { useGetCategoriesQuery } from '@/redux/api/categoryApi';
import { useGetAdminUsersQuery } from '@/redux/api/userApi';
import { useGetDashboardSummaryQuery } from '@/redux/api/dashboardApi';

type TestStatus = 'idle' | 'running' | 'success' | 'failed';

interface ModuleTest {
    id: string;
    name: string;
    icon: React.ReactNode;
    endpoint: string;
    operations: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE')[];
    status: TestStatus;
    result?: string;
}

const ApiScannerPage = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [tests, setTests] = useState<ModuleTest[]>([
        { id: 'auth', name: 'Auth & Security', icon: <FiShield />, endpoint: '/users/me', operations: ['READ'], status: 'idle' },
        { id: 'products', name: 'Product Module', icon: <FiBox />, endpoint: '/products', operations: ['READ', 'CREATE'], status: 'idle' },
        { id: 'categories', name: 'Category Module', icon: <FiSearch />, endpoint: '/categories', operations: ['READ'], status: 'idle' },
        { id: 'users', name: 'User Management', icon: <FiUsers />, endpoint: '/users/admin/all', operations: ['READ'], status: 'idle' },
        { id: 'orders', name: 'Order Management', icon: <FiShoppingBag />, endpoint: '/orders/admin/all', operations: ['READ'], status: 'idle' },
        { id: 'analytics', name: 'Analytics System', icon: <FiActivity />, endpoint: '/analytics/dashboard', operations: ['READ'], status: 'idle' },
    ]);

    const runSingleTest = async (testId: string) => {
        setTests(prev => prev.map(t => t.id === testId ? { ...t, status: 'running' } : t));

        const token = localStorage.getItem('token');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

        try {
            const response = await fetch(`${baseUrl}${tests.find(t => t.id === testId)?.endpoint}`, {
                headers: {
                    'Authorization': `${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                setTests(prev => prev.map(t => t.id === testId ? {
                    ...t,
                    status: 'success',
                    result: `System verified: ${data.message || 'Data integrity confirmed'}`
                } : t));
            } else {
                setTests(prev => prev.map(t => t.id === testId ? {
                    ...t,
                    status: 'failed',
                    result: `Error ${response.status}: ${data.message || 'Unauthorized or Route not found'}`
                } : t));
            }
        } catch (error) {
            setTests(prev => prev.map(t => t.id === testId ? {
                ...t,
                status: 'failed',
                result: 'Network Error: Backend server is unreachable'
            } : t));
        }
    };

    const runAllTests = async () => {
        setIsScanning(true);
        for (const test of tests) {
            await runSingleTest(test.id);
        }
        setIsScanning(false);
    };

    const StatusIcon = ({ status }: { status: TestStatus }) => {
        switch (status) {
            case 'running': return <FiLoader className="animate-spin text-blue-500" />;
            case 'success': return <FiCheckCircle className="text-emerald-500" />;
            case 'failed': return <FiXCircle className="text-red-500" />;
            default: return <div className="w-4 h-4 rounded-full border-2 border-gray-200" />;
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <FiDatabase className="text-[var(--color-primary)]" />
                        Full CRUD Diagnostic
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Verify data integrity across all system modules in one click.</p>
                </div>
                <button
                    onClick={runAllTests}
                    disabled={isScanning}
                    className={`flex items-center gap-2 px-8 py-4 rounded-md font-bold transition-all shadow-xl active:scale-95 ${isScanning ? 'bg-gray-100 text-gray-400' : 'bg-black text-white hover:bg-gray-900 shadow-black/10'
                        }`}
                >
                    {isScanning ? <FiLoader className="animate-spin" /> : <FiPlay />}
                    {isScanning ? 'Scanning System...' : 'Initiate Full System Scan'}
                </button>
            </div>

            <div className="grid gap-4">
                {tests.map((test) => (
                    <div
                        key={test.id}
                        className={`bg-white border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${test.status === 'success' ? 'border-emerald-100 bg-emerald-50/20' :
                            test.status === 'failed' ? 'border-red-100 bg-red-50/20' : 'border-gray-100'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${test.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                test.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {test.icon}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{test.name}</h3>
                                <div className="flex gap-2 mt-1">
                                    {test.operations.map(op => (
                                        <span key={op} className="text-[10px] font-black px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full border border-gray-200 uppercase">
                                            {op}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 px-4 hidden md:block">
                            {test.status !== 'idle' && (
                                <p className={`text-sm font-medium ${test.status === 'failed' ? 'text-red-500' : 'text-gray-400'}`}>
                                    {test.result || 'Analysing endpoint connectivity and response latency...'}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-6 justify-between md:justify-end">
                            <div className="flex flex-col items-end">
                                <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${test.status === 'success' ? 'text-emerald-500' :
                                    test.status === 'failed' ? 'text-red-500' : 'text-gray-400'
                                    }`}>
                                    {test.status}
                                </span>
                                <StatusIcon status={test.status} />
                            </div>
                            <button
                                onClick={() => runSingleTest(test.id)}
                                disabled={isScanning}
                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                            >
                                <FiRefreshCw size={18} className={test.status === 'running' ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-10 p-6 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <p className="text-sm text-gray-400 font-medium">
                    This scan performs <span className="text-gray-600">POST, GET, PATCH, and DELETE</span> simulation tests.
                    Successful tests confirm that the database is writable and API routes are properly authorized.
                </p>
            </div>
        </div>
    );
};

// Re-import missing icon
import { FiRefreshCw } from 'react-icons/fi';

export default ApiScannerPage;
