import { baseApi } from './baseApi';

/* ─── Purchases (admin only) — /api/purchases ─────────────────────────────
 * Orders placed with suppliers. Item prices are in the purchase currency
 * (BDT / RMB / USD) and converted with exchangeRate (BDT per 1 unit); extra
 * costs, payments and totals are BDT. The server recomputes every total. */

export const PURCHASE_STATUSES = ['draft', 'confirmed', 'partially_received', 'received', 'cancelled'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];
export type ShippingMode = 'air' | 'sea' | 'road' | 'local' | '';
export type PurchaseCurrency = 'BDT' | 'RMB' | 'USD';
export type PaymentMethod = 'cash' | 'bank' | 'bkash' | 'nagad' | 'other';

export interface PurchaseProductRef {
    _id: string;
    name: string;
    sku: string;
    unit: string;
    thumbnail: string;
    status: string;
    isDeleted: boolean;
    stock: number;
    costPrice: number;
    variants: { _id: string; label: string; sku: string; stock: number }[];
}

export interface PurchaseItem {
    _id: string;
    product: PurchaseProductRef | null;
    variantId: string | null;
    variantLabel: string;
    name: string;
    sku: string;
    unit: string;
    qty: number;
    unitCost: number;
    receivedQty: number;
    remaining: number;
    lineTotal: number;
    lineTotalBdt: number;
    /** BDT per unit incl. its share of shipping, duty and other costs, less discount. */
    landedUnitCost: number;
}

export interface PurchasePayment {
    _id: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    reference: string;
    note: string;
    createdBy: { _id: string; firstName?: string; lastName?: string } | null;
    createdAt: string;
}

export interface PurchaseReceiptLine {
    itemId: string;
    qty: number;
    variantId: string | null;
    variantLabel: string;
    unitCost: number;
    stocked: boolean;
    stockNote: string;
    name: string;
    unit: string;
}

export interface PurchaseReceipt {
    _id: string;
    date: string;
    warehouse: { _id: string; name: string; location?: string; isActive?: boolean } | null;
    lines: PurchaseReceiptLine[];
    addedToStock: boolean;
    note: string;
    createdBy: { _id: string; firstName?: string; lastName?: string } | null;
    createdAt: string;
}

export interface PurchaseSupplierRef {
    _id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    country?: string;
    address?: string;
    isActive?: boolean;
}

export interface Purchase {
    _id: string;
    reference: string;
    supplier: PurchaseSupplierRef | null;
    supplierInvoice: string;
    status: PurchaseStatus;
    shippingMode: ShippingMode;
    orderDate: string;
    eta: string | null;
    currency: PurchaseCurrency;
    exchangeRate: number;
    items: PurchaseItem[];
    shippingCost: number;
    customsDuty: number;
    otherCost: number;
    otherCostLabel: string;
    discount: number;
    subtotal: number;
    subtotalBdt: number;
    grandTotal: number;
    paid: number;
    due: number;
    payments: PurchasePayment[];
    receipts: PurchaseReceipt[];
    note: string;
    cancelledAt: string | null;
    cancelReason: string;
    createdBy: { _id: string; firstName?: string; lastName?: string } | null;
    createdAt: string;
    updatedAt: string;
    itemCount: number;
    totalQty: number;
    receivedQty: number;
    can: { editItems: boolean; receive: boolean; cancel: boolean; delete: boolean; pay: boolean };
    receiveBlockedReason: string | null;
    deleteBlockedReason: string | null;
}

/** A row of the list: the purchase without payments, receipts or full items. */
export interface PurchaseRow {
    _id: string;
    reference: string;
    supplier: { _id: string; name: string; country?: string; isActive?: boolean } | null;
    supplierInvoice: string;
    status: PurchaseStatus;
    shippingMode: ShippingMode;
    orderDate: string;
    eta: string | null;
    currency: PurchaseCurrency;
    exchangeRate: number;
    items: { _id: string; name: string; qty: number; receivedQty: number }[];
    subtotal: number;
    subtotalBdt: number;
    grandTotal: number;
    paid: number;
    due: number;
    createdAt: string;
    itemCount: number;
    totalQty: number;
    receivedQty: number;
    paymentCount: number;
    receiptCount: number;
}

export interface PurchaseSummary {
    /** Placed purchases (confirmed / partially received / received) in the supplier + date scope. */
    total: number;
    paid: number;
    due: number;
    count: number;
    /** Confirmed + partially received. */
    open: number;
    all: number;
    byStatus: Record<PurchaseStatus, number>;
}

export interface PurchaseListParams {
    search?: string;
    status?: PurchaseStatus | 'open';
    supplier?: string;
    /** YYYY-MM-DD, Dhaka days, inclusive (by order date) */
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

export interface PurchaseListResponse {
    purchases: PurchaseRow[];
    summary: PurchaseSummary;
    meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PurchaseItemInput {
    _id?: string;
    product?: string | null;
    variantId?: string | null;
    name: string;
    sku?: string;
    qty: number;
    unitCost: number;
}

export interface PurchaseInput {
    supplier: string;
    status?: 'draft' | 'confirmed';
    supplierInvoice?: string;
    shippingMode?: ShippingMode;
    orderDate?: string;
    eta?: string | null;
    currency?: PurchaseCurrency;
    exchangeRate?: number;
    items: PurchaseItemInput[];
    shippingCost?: number;
    customsDuty?: number;
    otherCost?: number;
    otherCostLabel?: string;
    discount?: number;
    note?: string;
}

export interface PurchasePaymentInput {
    amount: number;
    date?: string;
    method?: PaymentMethod;
    reference?: string;
    note?: string;
}

export interface ReceiveInput {
    warehouse: string;
    date?: string;
    addToStock?: boolean;
    note?: string;
    lines: { itemId: string; qty: number; variantId?: string | null; skipStock?: boolean }[];
}

export interface ReceiveResult {
    purchase: Purchase;
    stocked: { name: string; qty: number; unitCost: number }[];
    warnings: string[];
}

/** Drop empty values so they never reach the query string. */
const clean = <T extends object>(o: T) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<T>;

type Envelope<T> = { data: T; meta?: PurchaseListResponse['meta'] };

// Receiving adds stock and every money change moves supplier and account totals.
const MONEY_AND_STOCK = ['Purchases', 'Suppliers', 'Inventory', 'Products', 'Dashboard', 'Accounts'] as const;

export const purchaseApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getPurchaseList: builder.query<PurchaseListResponse, PurchaseListParams>({
            query: (params) => ({ url: '/purchases', params: clean(params) }),
            transformResponse: (r: Envelope<{ purchases: PurchaseRow[]; summary: PurchaseSummary }>) => ({
                purchases: r.data?.purchases || [],
                summary: r.data?.summary as PurchaseSummary,
                meta: r.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
            }),
            providesTags: ['Purchases'],
        }),
        getPurchaseDetail: builder.query<Purchase, string>({
            query: (id) => `/purchases/${id}`,
            transformResponse: (r: Envelope<Purchase>) => r.data,
            providesTags: (_r, _e, id) => ['Purchases', { type: 'Purchases', id }],
        }),
        createPurchase: builder.mutation<Purchase, PurchaseInput>({
            query: (body) => ({ url: '/purchases', method: 'POST', body }),
            transformResponse: (r: Envelope<Purchase>) => r.data,
            invalidatesTags: [...MONEY_AND_STOCK],
        }),
        updatePurchase: builder.mutation<Purchase, Partial<PurchaseInput> & { id: string }>({
            query: ({ id, ...body }) => ({ url: `/purchases/${id}`, method: 'PATCH', body }),
            transformResponse: (r: Envelope<Purchase>) => r.data,
            invalidatesTags: [...MONEY_AND_STOCK],
        }),
        deletePurchase: builder.mutation<unknown, string>({
            query: (id) => ({ url: `/purchases/${id}`, method: 'DELETE' }),
            invalidatesTags: [...MONEY_AND_STOCK],
        }),
        addPurchasePayment: builder.mutation<Purchase, PurchasePaymentInput & { id: string }>({
            query: ({ id, ...body }) => ({ url: `/purchases/${id}/payments`, method: 'POST', body }),
            transformResponse: (r: Envelope<Purchase>) => r.data,
            invalidatesTags: [...MONEY_AND_STOCK],
        }),
        removePurchasePayment: builder.mutation<Purchase, { id: string; paymentId: string }>({
            query: ({ id, paymentId }) => ({ url: `/purchases/${id}/payments/${paymentId}`, method: 'DELETE' }),
            transformResponse: (r: Envelope<Purchase>) => r.data,
            invalidatesTags: [...MONEY_AND_STOCK],
        }),
        cancelPurchase: builder.mutation<Purchase, { id: string; reason?: string }>({
            query: ({ id, reason }) => ({ url: `/purchases/${id}/cancel`, method: 'POST', body: reason ? { reason } : {} }),
            transformResponse: (r: Envelope<Purchase>) => r.data,
            invalidatesTags: [...MONEY_AND_STOCK],
        }),
        receivePurchaseGoods: builder.mutation<ReceiveResult, ReceiveInput & { id: string }>({
            query: ({ id, ...body }) => ({ url: `/purchases/${id}/receive`, method: 'POST', body }),
            transformResponse: (r: Envelope<ReceiveResult>) => r.data,
            invalidatesTags: [...MONEY_AND_STOCK, 'Warehouses'],
        }),
    }),
});

export const {
    useGetPurchaseListQuery,
    useGetPurchaseDetailQuery,
    useCreatePurchaseMutation,
    useUpdatePurchaseMutation,
    useDeletePurchaseMutation,
    useAddPurchasePaymentMutation,
    useRemovePurchasePaymentMutation,
    useCancelPurchaseMutation,
    useReceivePurchaseGoodsMutation,
} = purchaseApi;
