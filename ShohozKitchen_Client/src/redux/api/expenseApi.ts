import { baseApi } from './baseApi';

// Expenses — what the business spends money on (admin only). Backend: /api/expenses
// Dates are Bangladesh calendar days (YYYY-MM-DD); `day` on each row is that day.

export type PaidBy = 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'card' | 'other';

export const PAID_BY_OPTIONS: { value: PaidBy; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank' },
    { value: 'bkash', label: 'bKash' },
    { value: 'nagad', label: 'Nagad' },
    { value: 'rocket', label: 'Rocket' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' },
];

export const paidByLabel = (v?: string) => PAID_BY_OPTIONS.find((o) => o.value === v)?.label || (v ? v.charAt(0).toUpperCase() + v.slice(1) : '—');

export interface IExpenseCategory {
    _id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
    expenseCount: number;
    total: number;
    lastUsedDay: string | null;
    createdAt: string;
}

export interface IExpense {
    _id: string;
    seq: number;
    voucherNo: string;
    /** Stored instant (00:00 Dhaka) */
    date: string;
    /** The Dhaka calendar day, YYYY-MM-DD */
    day: string;
    title: string;
    category: { _id: string; name: string; isActive: boolean } | null;
    paidTo: string;
    reference: string;
    paidBy: PaidBy;
    amount: number;
    note: string;
    receiptUrl: string;
    createdBy?: { _id: string; firstName?: string; lastName?: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface IExpenseFilters {
    search?: string;
    category?: string;
    paidBy?: PaidBy;
    /** inclusive Dhaka days, YYYY-MM-DD */
    from?: string;
    to?: string;
}

export type ExpenseSort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'recent';

export interface IExpenseListParams extends IExpenseFilters {
    sort?: ExpenseSort;
    page?: number;
    limit?: number;
}

export interface IExpenseListResponse {
    data: IExpense[];
    meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface IExpenseCategoryTotal {
    categoryId: string | null;
    name: string;
    isActive: boolean;
    total: number;
    count: number;
    /** % of the period's total */
    share: number;
}

export interface IExpenseSummary {
    total: number;
    count: number;
    average: number;
    withReceipt: number;
    firstDay: string | null;
    lastDay: string | null;
    biggestCategory: IExpenseCategoryTotal | null;
    byCategory: IExpenseCategoryTotal[];
    byPaidBy: { paidBy: PaidBy; total: number; count: number }[];
    /** The 12 months ending with the period's last month (YYYY-MM), oldest first */
    months: { month: string; total: number; count: number }[];
}

export interface IExpenseInput {
    date: string;
    title: string;
    category: string;
    amount: number;
    paidTo?: string;
    reference?: string;
    paidBy?: PaidBy;
    note?: string;
    receiptUrl?: string;
}

type Wrapped<T> = { data: T };
const TAGS = ['Expenses', 'Accounts'] as const;

export const expenseApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /expenses — paginated rows for the filters
        getExpenseList: builder.query<IExpenseListResponse, IExpenseListParams>({
            query: (params) => ({ url: '/expenses', params }),
            providesTags: ['Expenses'],
        }),

        // GET /expenses/summary — totals, biggest category, by category, last 12 months
        getExpenseSummary: builder.query<IExpenseSummary, IExpenseFilters>({
            query: (params) => ({ url: '/expenses/summary', params }),
            transformResponse: (r: Wrapped<IExpenseSummary>) => r.data,
            providesTags: ['Expenses'],
        }),

        // GET /expenses/export — every matching row (capped server-side) for CSV
        getExpenseExport: builder.query<{ rows: IExpense[]; total: number; truncated: boolean }, IExpenseFilters & { sort?: ExpenseSort }>({
            query: (params) => ({ url: '/expenses/export', params }),
            transformResponse: (r: Wrapped<{ rows: IExpense[]; total: number; truncated: boolean }>) => r.data,
            keepUnusedDataFor: 0,
        }),

        // GET /expenses/categories — also seeds the default heads on an empty collection
        getExpenseCategoryList: builder.query<IExpenseCategory[], void>({
            query: () => '/expenses/categories',
            transformResponse: (r: Wrapped<IExpenseCategory[]>) => r.data || [],
            providesTags: ['Expenses'],
        }),

        createExpense: builder.mutation<IExpense, IExpenseInput>({
            query: (body) => ({ url: '/expenses', method: 'POST', body }),
            transformResponse: (r: Wrapped<IExpense>) => r.data,
            invalidatesTags: [...TAGS],
        }),

        updateExpense: builder.mutation<IExpense, Partial<IExpenseInput> & { id: string }>({
            query: ({ id, ...body }) => ({ url: `/expenses/${id}`, method: 'PATCH', body }),
            transformResponse: (r: Wrapped<IExpense>) => r.data,
            invalidatesTags: [...TAGS],
        }),

        deleteExpense: builder.mutation<unknown, string>({
            query: (id) => ({ url: `/expenses/${id}`, method: 'DELETE' }),
            invalidatesTags: [...TAGS],
        }),

        createExpenseCategory: builder.mutation<IExpenseCategory, { name: string; isActive?: boolean }>({
            query: (body) => ({ url: '/expenses/categories', method: 'POST', body }),
            transformResponse: (r: Wrapped<IExpenseCategory>) => r.data,
            invalidatesTags: [...TAGS],
        }),

        updateExpenseCategory: builder.mutation<IExpenseCategory, { id: string; name?: string; isActive?: boolean; sortOrder?: number }>({
            query: ({ id, ...body }) => ({ url: `/expenses/categories/${id}`, method: 'PATCH', body }),
            transformResponse: (r: Wrapped<IExpenseCategory>) => r.data,
            invalidatesTags: [...TAGS],
        }),

        deleteExpenseCategory: builder.mutation<unknown, string>({
            query: (id) => ({ url: `/expenses/categories/${id}`, method: 'DELETE' }),
            invalidatesTags: [...TAGS],
        }),
    }),
});

export const {
    useGetExpenseListQuery,
    useGetExpenseSummaryQuery,
    useLazyGetExpenseExportQuery,
    useGetExpenseCategoryListQuery,
    useCreateExpenseMutation,
    useUpdateExpenseMutation,
    useDeleteExpenseMutation,
    useCreateExpenseCategoryMutation,
    useUpdateExpenseCategoryMutation,
    useDeleteExpenseCategoryMutation,
} = expenseApi;
