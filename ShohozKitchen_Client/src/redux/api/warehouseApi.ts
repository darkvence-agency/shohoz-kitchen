import { baseApi } from './baseApi';

// Contract shared by Warehouses, Transfers and Purchases (receive into a warehouse).
// GET /api/warehouses?scope=active|all → { data: Warehouse[] } (admin only).
export interface Warehouse {
    _id: string;
    name: string;
    location: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    // Optional contact details (admin's own reference).
    contactPerson?: string;
    phone?: string;
    note?: string;
    // Counts the list adds.
    /** Transfers from or to this warehouse, any status. */
    transferCount?: number;
    /** Transfers on the way into this warehouse. */
    inTransitIn?: number;
    /** Transfers sent out of it, not yet received. */
    inTransitOut?: number;
    lastTransferAt?: string | null;
    /** Purchases that received goods into this warehouse. */
    purchaseCount?: number;
}

export interface WarehouseInput {
    name: string;
    location?: string;
    contactPerson?: string;
    phone?: string;
    note?: string;
    isActive?: boolean;
}

const unwrap = <T,>(r: { data?: T } | T): T => ((r as { data?: T })?.data ?? (r as T));

export const warehouseApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getWarehouses: builder.query<Warehouse[], { scope?: 'active' | 'all' } | void>({
            query: (args) => ({ url: '/warehouses', params: args?.scope ? { scope: args.scope } : undefined }),
            transformResponse: (r: { data?: Warehouse[] } | Warehouse[]) => unwrap(r) || [],
            providesTags: ['Warehouses'],
        }),
        createWarehouse: builder.mutation<Warehouse, WarehouseInput>({
            query: (body) => ({ url: '/warehouses', method: 'POST', body }),
            transformResponse: (r: { data?: Warehouse } | Warehouse) => unwrap(r),
            invalidatesTags: ['Warehouses'],
        }),
        updateWarehouse: builder.mutation<Warehouse, { id: string } & Partial<WarehouseInput>>({
            query: ({ id, ...body }) => ({ url: `/warehouses/${id}`, method: 'PATCH', body }),
            transformResponse: (r: { data?: Warehouse } | Warehouse) => unwrap(r),
            // Transfers show warehouse names, so a rename refreshes them too.
            invalidatesTags: ['Warehouses', 'Transfers'],
        }),
        deleteWarehouse: builder.mutation<void, string>({
            query: (id) => ({ url: `/warehouses/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Warehouses'],
        }),
    }),
});

export const {
    useGetWarehousesQuery,
    useCreateWarehouseMutation,
    useUpdateWarehouseMutation,
    useDeleteWarehouseMutation,
} = warehouseApi;
