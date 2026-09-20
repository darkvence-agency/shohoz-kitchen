import { baseApi } from './baseApi';

/* ─── Inventory (admin) — /api/inventory ──────────────────────────────────
 * Money is BDT as a plain number. product.stock is the sellable count; variants
 * carry their own stock as a breakdown. costPrice is the moving-average unit cost. */

export type StockFilter = 'all' | 'low' | 'out' | 'draft';
export type StockSort = 'name' | '-name' | 'stock' | '-stock' | 'value' | '-value' | '-updatedAt';

export interface StockVariant {
    _id: string;
    label: string;
    color: string;
    size: string;
    sku: string;
    stock: number;
}

export interface StockRow {
    _id: string;
    name: string;
    sku: string;
    slug: string;
    thumbnail: string;
    status: 'active' | 'draft' | 'out-of-stock' | string;
    unit: string;
    price: number;
    stock: number;
    lowStockThreshold: number;
    costPrice: number;
    value: number;
    isOut: boolean;
    isLow: boolean;
    variants: StockVariant[];
    variantTotal: number;
    updatedAt: string;
}

export interface InventorySummary {
    products: number;
    units: number;
    value: number;
    low: number;
    out: number;
    drafts: number;
    /** in stock but no cost recorded — missing from `value` */
    uncosted: number;
}

export const MOVEMENT_TYPES = ['opening', 'stock_in', 'stock_out', 'adjustment', 'sale', 'return', 'cancel'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface StockMovement {
    _id: string;
    product: { _id: string; name: string; sku?: string; unit?: string; thumbnail?: string; status?: string } | null;
    variant: { color: string; size: string; label: string } | null;
    type: MovementType;
    quantity: number;
    balanceAfter: number;
    variantBalanceAfter: number | null;
    unitCost: number | null;
    note: string;
    order: { _id: string; orderId?: string } | null;
    createdBy: { _id: string; firstName?: string; lastName?: string; role?: string } | null;
    createdAt: string;
}

export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
export interface Paged<T> { data: T[]; meta: PageMeta }

export interface StockQuery { search?: string; filter?: StockFilter; sort?: StockSort; page?: number; limit?: number }
export interface MovementsQuery { product?: string; type?: MovementType; search?: string; from?: string; to?: string; page?: number; limit?: number }

export interface StockInBody { productId: string; variantId?: string; quantity: number; unitCost?: number; note?: string }
export interface AdjustBody { productId: string; variantId?: string; mode: 'set' | 'remove'; quantity: number; reason: string; note?: string }
export interface QuickProductBody {
    name: string; category: string; unit?: string; sku?: string; quantity: number;
    unitCost?: number; price?: number; lowStockThreshold?: number;
}

/** Drop empty values so they never reach the query string. */
const clean = <T extends object>(o: T) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<T>;

type Envelope<T> = { data: T; meta?: PageMeta };

export const inventoryApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /inventory/summary — tiles
        getInventorySummary: builder.query<InventorySummary, void>({
            query: () => '/inventory/summary',
            transformResponse: (r: Envelope<InventorySummary>) => r.data,
            // 'Products' too: a product edit (stock / cost) must refresh these numbers.
            providesTags: ['Inventory', 'Products'],
        }),
        // GET /inventory/stock — one row per product
        getInventoryStock: builder.query<Paged<StockRow>, StockQuery>({
            query: (params) => ({ url: '/inventory/stock', params: clean(params) }),
            transformResponse: (r: Envelope<StockRow[]>) => ({
                data: r.data || [],
                meta: r.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
            }),
            providesTags: ['Inventory', 'Products'],
        }),
        // GET /inventory/movements — the ledger
        getStockMovements: builder.query<Paged<StockMovement>, MovementsQuery>({
            query: (params) => ({ url: '/inventory/movements', params: clean(params) }),
            transformResponse: (r: Envelope<StockMovement[]>) => ({
                data: r.data || [],
                meta: r.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
            }),
            providesTags: ['Inventory', 'Products', 'Orders'],
        }),
        // POST /inventory/stock-in
        stockIn: builder.mutation<{ reactivated: boolean; costPrice: number }, StockInBody>({
            query: (body) => ({ url: '/inventory/stock-in', method: 'POST', body }),
            transformResponse: (r: Envelope<{ reactivated: boolean; costPrice: number }>) => r.data,
            invalidatesTags: ['Inventory', 'Products', 'Dashboard'],
        }),
        // POST /inventory/adjust
        adjustStock: builder.mutation<unknown, AdjustBody>({
            query: (body) => ({ url: '/inventory/adjust', method: 'POST', body }),
            invalidatesTags: ['Inventory', 'Products', 'Dashboard'],
        }),
        // POST /inventory/quick-product — creates a DRAFT product with its opening stock
        quickAddProduct: builder.mutation<{ _id: string; name: string; stock: number; unit: string }, QuickProductBody>({
            query: (body) => ({ url: '/inventory/quick-product', method: 'POST', body }),
            transformResponse: (r: Envelope<{ _id: string; name: string; stock: number; unit: string }>) => r.data,
            invalidatesTags: ['Inventory', 'Products', 'Categories', 'Dashboard'],
        }),
    }),
});

export const {
    useGetInventorySummaryQuery,
    useGetInventoryStockQuery,
    useGetStockMovementsQuery,
    useStockInMutation,
    useAdjustStockMutation,
    useQuickAddProductMutation,
} = inventoryApi;
