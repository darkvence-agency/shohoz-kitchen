"use client";

import React, { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiMessageCircle } from 'react-icons/fi';
import ChatBox from '@/components/chat/ChatBox';
import { useGetMyOrdersQuery } from '@/redux/api/orderApi';

function UserMessagesInner() {
    const searchParams = useSearchParams();
    const autoOpenSupport = searchParams.get('support') === '1';


    return (
        <div>
            {/* Page header */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'var(--color-primary-lightest, var(--color-primary-light))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-primary, var(--color-primary))', flexShrink: 0,
                    }}>
                        <FiMessageCircle size={18} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111', margin: 0, lineHeight: 1.2 }}>Messages</h1>
                        <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>Chat with customer support</p>
                    </div>
                </div>
            </div>

            {/* Chat */}
            <div style={{
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #F0F0F0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
                <ChatBox role="customer" autoOpenSupport={autoOpenSupport} />
            </div>
        </div>
    );
}

export default function UserMessagesPage() {
    return (
        <Suspense fallback={<div style={{ padding: '24px', color: '#94A3B8', fontSize: '14px' }}>Loading messages…</div>}>
            <UserMessagesInner />
        </Suspense>
    );
}
