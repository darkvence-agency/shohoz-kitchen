import { baseApi } from './baseApi';

// ---- Shared chat types (consumed by ChatBox + page agents) ----
export interface ChatParticipant {
    user: string | { _id: string; name?: string; avatar?: string; email?: string };
    role: string;
}

export interface ChatLastMessage {
    text: string;
    sender: string;
    createdAt: string;
}

export interface Conversation {
    _id: string;
    participants: ChatParticipant[];
    type: 'customer-support';
    shop: string | { _id: string; name?: string } | null;
    shopName: string;
    lastMessage?: ChatLastMessage;
    unread?: { user: string; count: number }[];
    // server may flatten "my unread count" onto each conversation
    unreadCount?: number;
    // populated convenience fields the server may attach
    peer?: { _id: string; name?: string; avatar?: string; role?: string };
    createdAt: string;
    updatedAt: string;
}

export interface ChatMessage {
    _id: string;
    conversation: string;
    sender: string | { _id: string; name?: string; avatar?: string };
    senderRole: string;
    text: string;
    images: string[];
    readBy: string[];
    createdAt: string;
    updatedAt: string;
}

interface MessagesResponse {
    data: ChatMessage[];
    meta?: { page: number; limit: number; total: number };
}

export const chatApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /chat/conversations -> my conversations
        getConversations: builder.query<{ data: Conversation[] }, void>({
            query: () => '/chat/conversations',
            providesTags: ['Chat'],
        }),

        // GET /chat/conversations/:id/messages?page&limit -> messages asc (also resets my unread)
        getMessages: builder.query<MessagesResponse, { id: string; page?: number; limit?: number }>({
            query: ({ id, page = 1, limit = 50 }) => ({
                url: `/chat/conversations/${id}/messages`,
                params: { page, limit },
            }),
            providesTags: ['Chat'],
        }),

        // POST /chat/messages -> create message
        sendMessage: builder.mutation<
            { data: ChatMessage },
            { conversationId: string; text?: string; images?: string[] }
        >({
            query: (body) => ({
                url: '/chat/messages',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Chat'],
        }),

        // POST /chat/conversations -> find-or-create
        startConversation: builder.mutation<
            { data: Conversation },
            { peerId?: string; shopId?: string; type: Conversation['type'] }
        >({
            query: (body) => ({
                url: '/chat/conversations',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Chat'],
        }),

        // PATCH /chat/conversations/:id/read -> reset my unread to 0
        markRead: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({
                url: `/chat/conversations/${id}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Chat'],
        }),

        // GET /chat/unread-count -> { total }
        getUnreadCount: builder.query<{ data: { total: number } }, void>({
            query: () => '/chat/unread-count',
            providesTags: ['Chat'],
        }),

        // GET /chat/support/conversations (admin) -> support inbox
        getSupportConversations: builder.query<{ data: Conversation[] }, void>({
            query: () => '/chat/support/conversations',
            providesTags: ['Chat'],
        }),
    }),
});

export const {
    useGetConversationsQuery,
    useGetMessagesQuery,
    useSendMessageMutation,
    useStartConversationMutation,
    useMarkReadMutation,
    useGetUnreadCountQuery,
    useGetSupportConversationsQuery,
} = chatApi;
