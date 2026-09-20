import { baseApi } from './baseApi';

/* ─── Suppliers (admin only) — /api/suppliers ─────────────────────────────
 * Companies we buy stock from. Money figures are BDT and come from purchases:
 * only placed purchases count (confirmed / partially received / received). */

export interface SupplierTopProduct { name: string; qty: number }

export interface Supplier {
    _id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    country: string;
    address: string;
    note: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    /** Every purchase on record, any status. */
    purchaseCount: number;
    /** Confirmed or partially received — goods still to come. */
    openCount: number;
    totalPurchased: number;
    totalPaid: number;
    due: number;
    lastOrderDate: string | null;
    /** Distinct products taken, and how many units ordered / received. */
    productCount: number;
    unitsOrdered: number;
    unitsReceived: number;
    topProducts: SupplierTopProduct[];
}

export interface SupplierProductTaken {
    key: string;
    product: { _id: string; name: string; thumbnail: string; sku: string; unit: string; isDeleted: boolean } | null;
    name: string;
    sku: string;
    unit: string;
    purchaseCount: number;
    qtyOrdered: number;
    qtyReceived: number;
    /** Item cost in BDT. */
    goodsCost: number;
    /** Item cost plus its share of shipping, duty and other costs, less discount. */
    landedCost: number;
    lastOrderDate: string | null;
    lastUnitCost: number;
    lastCurrency: string;
}

export interface SupplierRecentPurchase {
    _id: string;
    reference: string;
    status: string;
    shippingMode: string;
    orderDate: string;
    eta: string | null;
    grandTotal: number;
    paid: number;
    due: number;
    itemCount: number;
    totalQty: number;
    receivedQty: number;
}

export interface SupplierDetail extends Supplier {
    productsTaken: SupplierProductTaken[];
    recentPurchases: SupplierRecentPurchase[];
}

export interface SupplierInput {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    country?: string;
    address?: string;
    note?: string;
    isActive?: boolean;
}

type Envelope<T> = { data: T };

export const supplierApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /suppliers?scope=active|all&search=
        getSupplierList: builder.query<Supplier[], { scope?: 'active' | 'all'; search?: string } | void>({
            query: (args) => {
                const params: Record<string, string> = {};
                if (args?.scope) params.scope = args.scope;
                if (args?.search?.trim()) params.search = args.search.trim();
                return { url: '/suppliers', params };
            },
            transformResponse: (r: Envelope<Supplier[]>) => r?.data || [],
            providesTags: ['Suppliers'],
        }),
        // GET /suppliers/:id — with products taken and recent purchases
        getSupplierDetail: builder.query<SupplierDetail, string>({
            query: (id) => `/suppliers/${id}`,
            transformResponse: (r: Envelope<SupplierDetail>) => r.data,
            providesTags: (_r, _e, id) => ['Suppliers', { type: 'Suppliers', id }],
        }),
        createSupplier: builder.mutation<Supplier, SupplierInput>({
            query: (body) => ({ url: '/suppliers', method: 'POST', body }),
            transformResponse: (r: Envelope<Supplier>) => r.data,
            invalidatesTags: ['Suppliers'],
        }),
        updateSupplier: builder.mutation<Supplier, Partial<SupplierInput> & { id: string }>({
            query: ({ id, ...body }) => ({ url: `/suppliers/${id}`, method: 'PATCH', body }),
            transformResponse: (r: Envelope<Supplier>) => r.data,
            // Purchases show the supplier's name.
            invalidatesTags: ['Suppliers', 'Purchases'],
        }),
        deleteSupplier: builder.mutation<unknown, string>({
            query: (id) => ({ url: `/suppliers/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Suppliers'],
        }),
    }),
});

export const {
    useGetSupplierListQuery,
    useGetSupplierDetailQuery,
    useCreateSupplierMutation,
    useUpdateSupplierMutation,
    useDeleteSupplierMutation,
} = supplierApi;
