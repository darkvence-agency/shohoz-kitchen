'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '@/redux/hooks';
import {
    useGetConversationsQuery,
    useGetSupportConversationsQuery,
    useGetMessagesQuery,
    useSendMessageMutation,
    useMarkReadMutation,
    useStartConversationMutation,
    Conversation,
    ChatMessage,
} from '@/redux/api/chatApi';
import { useUploadMyImagesMutation } from '@/redux/api/uploadApi';
import { connectSocket, getSocket } from '@/lib/socket';

type ChatRole = 'customer' | 'admin';

interface ChatBoxProps {
    role: ChatRole;
    // Deep-link: open (or create) the customer↔support conversation on mount.
    autoOpenSupport?: boolean;
    // Deep-link: open this exact conversation on mount.
    autoOpenConversationId?: string;
}

// Theme by role: orange for customer, indigo for admin.
function themeFor(role: ChatRole) {
    if (role === 'admin') {
        return { accent: '#4F46E5', accentSoft: '#EEF2FF', mineBg: '#4F46E5' };
    }
    return { accent: 'var(--color-primary)', accentSoft: 'var(--color-primary-light)', mineBg: 'var(--color-primary)' };
}

function idOf(v: unknown): string {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null && '_id' in v) {
        return String((v as { _id: unknown })._id || '');
    }
    return '';
}

function conversationTitle(c: Conversation): string {
    if (c.peer?.name) return c.peer.name;
    if (c.type === 'customer-support') return 'Customer Support';
    return 'Conversation';
}

function avatarSeed(c: Conversation): string {
    return (conversationTitle(c) || '?').trim().charAt(0).toUpperCase() || '?';
}

function formatTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ChatBox: React.FC<ChatBoxProps> = ({ role, autoOpenSupport, autoOpenConversationId }) => {
    const theme = useMemo(() => themeFor(role), [role]);
    const currentUser = useAppSelector((s) => s.auth.user);
    const myId = currentUser?.id || '';

    const [activeId, setActiveId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [pendingImages, setPendingImages] = useState<string[]>([]);
    const [typingPeer, setTypingPeer] = useState(false);
    // Live messages appended via socket, keyed so they survive refetch merges.
    const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Admins see the support inbox; others see their own conversations.
    const supportQuery = useGetSupportConversationsQuery(undefined, { skip: role !== 'admin' });
    const ownQuery = useGetConversationsQuery(undefined, { skip: role === 'admin' });
    const conversations: Conversation[] =
        (role === 'admin' ? supportQuery.data?.data : ownQuery.data?.data) || [];
    const convLoading = role === 'admin' ? supportQuery.isLoading : ownQuery.isLoading;
    const refetchConversations = role === 'admin' ? supportQuery.refetch : ownQuery.refetch;

    const { data: messagesData, isLoading: msgLoading, refetch: refetchMessages } =
        useGetMessagesQuery(
            { id: activeId || '', page: 1, limit: 50 },
            { skip: !activeId },
        );

    const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
    const [markRead] = useMarkReadMutation();
    const [uploadImages, { isLoading: uploading }] = useUploadMyImagesMutation();
    const [startConversation] = useStartConversationMutation();
    const autoOpenedRef = useRef(false);

    const activeConv = conversations.find((c) => c._id === activeId) || null;


    // Open (or create) the customer↔support conversation.
    const openSupportConversation = async () => {
        const existing = conversations.find((c) => c.type === 'customer-support');
        if (existing) { setActiveId(existing._id); return; }
        try {
            const res = await startConversation({ type: 'customer-support' }).unwrap();
            await refetchConversations();
            const conv = res?.data;
            if (conv?._id) setActiveId(conv._id);
        } catch {
            // ignore
        }
    };

    // Deep-link: auto-open the requested conversation once, after load.
    useEffect(() => {
        if (autoOpenedRef.current || convLoading) return;
        if (autoOpenSupport) {
            autoOpenedRef.current = true;
            openSupportConversation();
        } else if (autoOpenConversationId && conversations.some((c) => c._id === autoOpenConversationId)) {
            autoOpenedRef.current = true;
            setActiveId(autoOpenConversationId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoOpenSupport, autoOpenConversationId, convLoading, conversations.length]);

    // Merge fetched history with any live messages for the active conversation.
    const messages: ChatMessage[] = useMemo(() => {
        const base = messagesData?.data || [];
        const seen = new Set(base.map((m) => m._id));
        const extra = liveMessages.filter(
            (m) => m.conversation === activeId && !seen.has(m._id),
        );
        return [...base, ...extra];
    }, [messagesData, liveMessages, activeId]);

    // ---- Socket: connect once on mount, listen for new messages + typing ----
    useEffect(() => {
        const socket = connectSocket();
        if (!socket) return;

        const onNew = (msg: ChatMessage) => {
            setLiveMessages((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;
                return [...prev, msg];
            });
            // Keep the conversation list (last message / unread) fresh.
            refetchConversations();
        };

        const onTyping = (payload: { conversationId: string }) => {
            if (payload?.conversationId && payload.conversationId === activeId) {
                setTypingPeer(true);
                if (typingTimer.current) clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => setTypingPeer(false), 2500);
            }
        };

        socket.on('message:new', onNew);
        socket.on('typing', onTyping);

        return () => {
            socket.off('message:new', onNew);
            socket.off('typing', onTyping);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    // ---- Joining a conversation: join room, mark read, reset typing ----
    useEffect(() => {
        if (!activeId) return;
        const socket = getSocket();
        socket?.emit('conversation:join', activeId);
        markRead(activeId);
        setTypingPeer(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    // Auto-scroll to newest message.
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, typingPeer]);

    const handleSelect = (id: string) => {
        if (id === activeId) return;
        setActiveId(id);
        setDraft('');
        setPendingImages([]);
    };

    const emitTyping = () => {
        if (!activeId) return;
        getSocket()?.emit('typing', { conversationId: activeId });
    };

    const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const formData = new FormData();
        Array.from(files).forEach((f) => formData.append('images', f));
        try {
            const res = await uploadImages(formData).unwrap();
            const urls = res?.data?.urls || [];
            setPendingImages((prev) => [...prev, ...urls]);
        } catch {
            // swallow — UI stays usable; caller can retry
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = async () => {
        if (!activeId) return;
        const text = draft.trim();
        if (!text && pendingImages.length === 0) return;
        try {
            const res = await sendMessage({
                conversationId: activeId,
                text: text || undefined,
                images: pendingImages.length ? pendingImages : undefined,
            }).unwrap();
            const msg = res?.data;
            if (msg) {
                setLiveMessages((prev) =>
                    prev.some((m) => m._id === msg._id) ? prev : [...prev, msg],
                );
            }
            setDraft('');
            setPendingImages([]);
            refetchMessages();
        } catch {
            // keep draft so the user can retry
        }
    };

    const isMine = (m: ChatMessage) => idOf(m.sender) === myId;

    return (
        <div className="flex h-[70vh] min-h-[480px] w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
            {/* Conversation list */}
            <aside
                className={`flex w-full max-w-[300px] flex-col border-r border-gray-200 ${activeId ? 'hidden md:flex' : 'flex'
                    }`}
            >
                <div
                    className="flex items-center px-4 py-3 text-sm font-semibold text-white"
                    style={{ backgroundColor: theme.accent }}
                >
                    {role === 'admin' ? 'Support Inbox' : 'Messages'}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {convLoading ? (
                        <div className="p-4 text-sm text-gray-400">Loading conversations…</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400">No conversations yet.</div>
                    ) : (
                        <>
                        {conversations.map((c) => {
                            const active = c._id === activeId;
                            const unread = (c as { myUnreadCount?: number }).myUnreadCount ?? c.unreadCount ?? 0;
                            return (
                                <button
                                    key={c._id}
                                    onClick={() => handleSelect(c._id)}
                                    className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-3 text-left transition hover:bg-gray-50 ${active ? 'bg-gray-50' : ''
                                        }`}
                                >
                                    <div
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                                        style={{ backgroundColor: theme.accent }}
                                    >
                                        {avatarSeed(c)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium text-gray-800">
                                                {conversationTitle(c)}
                                            </span>
                                            <span className="shrink-0 text-[10px] text-gray-400">
                                                {formatTime(c.lastMessage?.createdAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-xs text-gray-500">
                                                {c.lastMessage?.text || 'No messages yet'}
                                            </span>
                                            {unread > 0 && (
                                                <span
                                                    className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                                                    style={{ backgroundColor: theme.accent }}
                                                >
                                                    {unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        </>
                    )}
                </div>
            </aside>

            {/* Message thread */}
            <section className={`flex flex-1 flex-col ${activeId ? 'flex' : 'hidden md:flex'}`}>
                {!activeConv ? (
                    <div className="flex flex-1 items-center justify-center p-6 text-sm text-gray-400">
                        Select a conversation to start chatting.
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
                            <button
                                className="md:hidden text-gray-500"
                                onClick={() => setActiveId(null)}
                                aria-label="Back"
                            >
                                ←
                            </button>
                            <div
                                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                                style={{ backgroundColor: theme.accent }}
                            >
                                {avatarSeed(activeConv)}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-gray-800">
                                    {conversationTitle(activeConv)}
                                </div>
                                {typingPeer && (
                                    <div className="text-xs" style={{ color: theme.accent }}>
                                        typing…
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-4">
                            {msgLoading ? (
                                <div className="text-sm text-gray-400">Loading messages…</div>
                            ) : messages.length === 0 ? (
                                <div className="text-sm text-gray-400">No messages yet. Say hi!</div>
                            ) : (
                                messages.map((m) => {
                                    const mine = isMine(m);
                                    return (
                                        <div
                                            key={m._id}
                                            className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'text-white' : 'bg-white text-gray-800 border border-gray-200'
                                                    }`}
                                                style={mine ? { backgroundColor: theme.mineBg } : undefined}
                                            >
                                                {m.images?.map((url, i) => (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        key={i}
                                                        src={url}
                                                        alt="attachment"
                                                        className="mb-1 max-h-40 rounded-lg object-cover"
                                                    />
                                                ))}
                                                {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                                                <div
                                                    className={`mt-1 text-right text-[10px] ${mine ? 'text-white/70' : 'text-gray-400'
                                                        }`}
                                                >
                                                    {formatTime(m.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Composer */}
                        <div className="border-t border-gray-200 p-3">
                            {pendingImages.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-2">
                                    {pendingImages.map((url, i) => (
                                        <div key={i} className="relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={url} alt="pending" className="h-12 w-12 rounded object-cover" />
                                            <button
                                                onClick={() =>
                                                    setPendingImages((prev) => prev.filter((_, idx) => idx !== i))
                                                }
                                                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-700 text-[10px] text-white"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleAttach}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                                    aria-label="Attach image"
                                >
                                    {uploading ? '…' : '📎'}
                                </button>
                                <input
                                    type="text"
                                    value={draft}
                                    onChange={(e) => {
                                        setDraft(e.target.value);
                                        emitTyping();
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Type a message…"
                                    className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2"
                                    style={{ ['--tw-ring-color' as string]: theme.accent }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={sending || (!draft.trim() && pendingImages.length === 0)}
                                    className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                    style={{ backgroundColor: theme.accent }}
                                >
                                    {sending ? '…' : 'Send'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default ChatBox;
