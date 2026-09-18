'use client';

import React from 'react';
import ChatBox from '@/components/chat/ChatBox';

export default function AdminMessagesPage() {
    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                    Support Messages
                </h1>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                    Customer support conversations.
                </p>
            </div>
            <ChatBox role="admin" />
        </div>
    );
}
