import { baseApi } from './baseApi';

export interface Unit {
    _id: string;
    name: string;
    shortName: string;
    isActive: boolean;
    createdAt: string;
    /** The string a product stores in product.unit for this unit. */
    key: string;
    productCount: number;
}

const unwrap = <T,>(r: { data?: T } | T): T => ((r as { data?: T })?.data ?? (r as T));

export const unitApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Admin: units list (also seeds defaults and picks up units products already use)
        getUnits: builder.query<Unit[], { scope?: 'active' | 'all' } | void>({
            query: (args) => ({ url: '/units', params: args?.scope ? { scope: args.scope } : undefined }),
            transformResponse: (r: { data?: Unit[] } | Unit[]) => unwrap(r) || [],
            providesTags: ['Units'],
        }),
        createUnit: builder.mutation<Unit, { name: string; shortName: string; isActive?: boolean }>({
            query: (body) => ({ url: '/units', method: 'POST', body }),
            invalidatesTags: ['Units'],
        }),
        updateUnit: builder.mutation<Unit, { id: string; name?: string; shortName?: string; isActive?: boolean }>({
            query: ({ id, ...body }) => ({ url: `/units/${id}`, method: 'PATCH', body }),
            // A rename moves products to the new name.
            invalidatesTags: ['Units', 'Products'],
        }),
        deleteUnit: builder.mutation<void, string>({
            query: (id) => ({ url: `/units/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Units'],
        }),
    }),
});

export const { useGetUnitsQuery, useCreateUnitMutation, useUpdateUnitMutation, useDeleteUnitMutation } = unitApi;

/** The unit a product's unit string refers to — by name or short name, any case. */
export const findUnit = (units: Unit[] | undefined, value?: string) => {
    const v = String(value ?? '').trim().toLowerCase();
    return (units || []).find((u) => u.name.toLowerCase() === v || u.shortName.toLowerCase() === v);
};

/**
 * <option>s for a product's unit: the active units (value = what a product stores). The
 * product's current unit always stays selectable — under its own stored spelling (e.g.
 * "kg" for Kilogram), even when that unit is inactive or not in the list at all.
 * Pass the list from useGetUnitsQuery({ scope: 'all' }).
 */
export const unitOptions = (units: Unit[] | undefined, current?: string) => {
    const cur = String(current ?? '').trim();
    const opts = (units || [])
        .filter((u) => u.isActive || (cur && findUnit([u], cur)))
        .map((u) => ({
            value: cur && findUnit([u], cur) ? cur : u.key,
            label: `${u.name} (${u.shortName})`,
        }));
    if (cur && !opts.some((o) => o.value === cur)) opts.unshift({ value: cur, label: cur });
    return opts;
};
