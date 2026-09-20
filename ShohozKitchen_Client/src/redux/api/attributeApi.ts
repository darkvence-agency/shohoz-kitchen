import { baseApi } from './baseApi';

/** One value of an attribute, with how the catalogue uses it. */
export type AttributeValueInfo = {
    value: string;
    /** Products using this value — only tracked on the linked Color / Size attributes (else null). */
    products: number | null;
    /** Colour swatch most used on products for this name (Color only). */
    hex: string | null;
};

export type Attribute = {
    _id: string;
    name: string;
    values: string[];
    valueInfo: AttributeValueInfo[];
    /** Values removed here that products still carry (kept out of the product merge). */
    hiddenValues: AttributeValueInfo[];
    /** 'color' ↔ product colours, 'size' ↔ product sizes; null for other attributes. */
    linkedTo: 'color' | 'size' | null;
    /** Products using at least one of this attribute's values (linked attributes only). */
    productCount: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type AttributeUpdate = {
    id: string;
    name?: string;
    values?: string[];
    addValue?: string;
    addValues?: string[];
    removeValue?: string;
    isActive?: boolean;
};

export type AttributeUpdateResult = {
    message: string;
    data: { attribute: Attribute; removed: { value: string; products: number }[] };
};

export const attributeApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /api/attributes — also merges every colour/size used on products into Color/Size
        getAttributes: builder.query<{ data: Attribute[] }, void>({
            query: () => ({ url: '/attributes', method: 'GET' }),
            providesTags: ['Attributes'],
        }),
        // POST /api/attributes
        createAttribute: builder.mutation<{ data: Attribute }, { name: string; values?: string[]; isActive?: boolean }>({
            query: (body) => ({ url: '/attributes', method: 'POST', body }),
            invalidatesTags: ['Attributes'],
        }),
        // PATCH /api/attributes/:id — rename, replace / add / remove values, turn on/off
        updateAttribute: builder.mutation<AttributeUpdateResult, AttributeUpdate>({
            query: ({ id, ...body }) => ({ url: `/attributes/${id}`, method: 'PATCH', body }),
            invalidatesTags: ['Attributes'],
        }),
        // DELETE /api/attributes/:id (Color and Size are linked to products and can't be deleted)
        deleteAttribute: builder.mutation<{ message: string }, string>({
            query: (id) => ({ url: `/attributes/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Attributes'],
        }),
    }),
});

export const {
    useGetAttributesQuery,
    useCreateAttributeMutation,
    useUpdateAttributeMutation,
    useDeleteAttributeMutation,
} = attributeApi;
