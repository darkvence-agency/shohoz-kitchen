import { baseApi } from './baseApi';

// Transfers — goods moved between warehouses (admin only). Backend: /api/transfers
// Records only: a transfer never changes product stock or the Inventory ledger.

export type TransferStatus = 'in_transit' | 'received' | 'cancelled';

export interface TransferWarehouse {
    _id: string;
    name: string;
    location?: string;
    isActive?: boolean;
}

export interface TransferItem {
    /** A product id (list) or the populated product (detail); null for a free-text item. */
    product: string | { _id: string; name: string; sku?: string; unit?: string; thumbnail?: string; slug?: string; status?: string } | null;
    name: string;
    sku: string;
    unit: string;
    qty: number;
}

export interface Transfer {
    _id: string;
    reference: string;
    /** null when the warehouse was removed from the database by other means. */
    from: TransferWarehouse | null;
    to: TransferWarehouse | null;
    items: TransferItem[];
    totalQty: number;
    status: TransferStatus;
    transferredAt: string;
    receivedAt: string | null;
    cancelledAt: string | null;
    note: string;
    createdBy?: { _id: string; firstName?: string; lastName?: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface TransferSummary {
    total: number;
    inTransit: number;
    received: number;
    cancelled: number;
    /** Units moved or moving (cancelled transfers excluded). */
    units: number;
    unitsInTransit: number;
    unitsReceived: number;
}

export interface TransferListParams {
    search?: string;
    warehouse?: string;
    direction?: 'any' | 'out' | 'in';
    status?: TransferStatus;
    /** YYYY-MM-DD, inclusive, Bangladesh days */
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

export interface TransferListResponse {
    data: { transfers: Transfer[]; summary: TransferSummary };
    meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface TransferItemInput {
    product?: string | null;
    name?: string;
    qty: number;
}

export interface TransferInput {
    from: string;
    to: string;
    items: TransferItemInput[];
    /** YYYY-MM-DD (Bangladesh); today when left out */
    transferredAt?: string;
    note?: string;
}

export type TransferUpdate =
    | { id: string; status: TransferStatus; receivedAt?: string; note?: string }
    | ({ id: string; status?: never } & Partial<TransferInput> & { receivedAt?: string });

const unwrap = <T,>(r: { data?: T } | T): T => ((r as { data?: T })?.data ?? (r as T));

const clean = (p: TransferListParams) =>
    Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== '' && v !== null));

export const transferApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getTransferList: builder.query<TransferListResponse, TransferListParams>({
            query: (params) => ({ url: '/transfers', params: clean(params) }),
            providesTags: ['Transfers'],
        }),
        getTransferById: builder.query<Transfer, string>({
            query: (id) => `/transfers/${id}`,
            transformResponse: (r: { data?: Transfer } | Transfer) => unwrap(r),
            providesTags: (_r, _e, id) => [{ type: 'Transfers', id }],
        }),
        createTransfer: builder.mutation<Transfer, TransferInput>({
            query: (body) => ({ url: '/transfers', method: 'POST', body }),
            transformResponse: (r: { data?: Transfer } | Transfer) => unwrap(r),
            // Warehouses show transfer counts.
            invalidatesTags: ['Transfers', 'Warehouses'],
        }),
        updateTransfer: builder.mutation<Transfer, TransferUpdate>({
            query: ({ id, ...body }) => ({ url: `/transfers/${id}`, method: 'PATCH', body }),
            transformResponse: (r: { data?: Transfer } | Transfer) => unwrap(r),
            invalidatesTags: (_r, _e, { id }) => ['Transfers', { type: 'Transfers', id }, 'Warehouses'],
        }),
        deleteTransfer: builder.mutation<void, string>({
            query: (id) => ({ url: `/transfers/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Transfers', 'Warehouses'],
        }),
    }),
});

export const {
    useGetTransferListQuery,
    useGetTransferByIdQuery,
    useCreateTransferMutation,
    useUpdateTransferMutation,
    useDeleteTransferMutation,
} = transferApi;
