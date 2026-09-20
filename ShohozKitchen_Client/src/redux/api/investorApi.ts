import { baseApi } from './baseApi';

// Investors — capital put into the business and taken back out (admin only).
// Backend: /api/investors. None of it is income or profit.

export type InvestorMethod = 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'card' | 'other';
export type InvestorTxType = 'in' | 'out';

export interface IInvestor {
    _id: string;
    name: string;
    phone: string;
    email: string;
    note: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface IInvestorRow extends IInvestor {
    /** In the chosen period (all time when none) */
    moneyIn: number;
    moneyOut: number;
    /** Balance before the period starts */
    openingBalance: number;
    /** Balance at the end of the period (today when none) */
    balance: number;
    /** Transactions in the period */
    transactionCount: number;
    totalTransactions: number;
    lastTransactionAt: string | null;
    lastTransactionDay: string | null;
}

export interface IInvestorSummary {
    from: string | null;
    to: string | null;
    moneyIn: number;
    moneyOut: number;
    /** moneyIn − moneyOut in the period */
    capital: number;
    openingBalance: number;
    closingBalance: number;
    transactions: number;
    investors: number;
    activeInvestors: number;
    withBalance: number;
}

export interface IInvestorTx {
    _id: string;
    investor: string;
    type: InvestorTxType;
    amount: number;
    date: string;
    /** Dhaka calendar day, YYYY-MM-DD */
    day: string;
    method: InvestorMethod;
    reference: string;
    note: string;
    /** Running balance after this transaction */
    balance: number;
    createdBy?: { _id: string; firstName?: string; lastName?: string } | null;
    createdAt: string;
}

export interface IInvestorLedger extends IInvestor {
    moneyIn: number;
    moneyOut: number;
    balance: number;
    /** Oldest first */
    transactions: IInvestorTx[];
}

export interface IInvestorTxInput {
    type: InvestorTxType;
    amount: number;
    date: string;
    method?: InvestorMethod;
    reference?: string;
    note?: string;
}

export interface IInvestorInput {
    name: string;
    phone?: string;
    email?: string;
    note?: string;
    isActive?: boolean;
    initialInvestment?: Omit<IInvestorTxInput, 'type'>;
}

export interface IInvestorFilters {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    from?: string;
    to?: string;
}

type Wrapped<T> = { data: T };
const TAGS = ['Investors', 'Accounts'] as const;

export const investorApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getInvestorList: builder.query<IInvestorRow[], IInvestorFilters>({
            query: (params) => ({ url: '/investors', params }),
            transformResponse: (r: Wrapped<IInvestorRow[]>) => r.data || [],
            providesTags: ['Investors'],
        }),

        getInvestorSummary: builder.query<IInvestorSummary, { from?: string; to?: string }>({
            query: (params) => ({ url: '/investors/summary', params }),
            transformResponse: (r: Wrapped<IInvestorSummary>) => r.data,
            providesTags: ['Investors'],
        }),

        getInvestorLedger: builder.query<IInvestorLedger, string>({
            query: (id) => `/investors/${id}`,
            transformResponse: (r: Wrapped<IInvestorLedger>) => r.data,
            providesTags: ['Investors'],
        }),

        createInvestor: builder.mutation<IInvestorLedger, IInvestorInput>({
            query: (body) => ({ url: '/investors', method: 'POST', body }),
            transformResponse: (r: Wrapped<IInvestorLedger>) => r.data,
            invalidatesTags: [...TAGS],
        }),

        updateInvestor: builder.mutation<IInvestor, Partial<Omit<IInvestorInput, 'initialInvestment'>> & { id: string }>({
            query: ({ id, ...body }) => ({ url: `/investors/${id}`, method: 'PATCH', body }),
            transformResponse: (r: Wrapped<IInvestor>) => r.data,
            invalidatesTags: [...TAGS],
        }),

        deleteInvestor: builder.mutation<unknown, string>({
            query: (id) => ({ url: `/investors/${id}`, method: 'DELETE' }),
            invalidatesTags: [...TAGS],
        }),

        createInvestorTransaction: builder.mutation<IInvestorTx, IInvestorTxInput & { investorId: string }>({
            query: ({ investorId, ...body }) => ({ url: `/investors/${investorId}/transactions`, method: 'POST', body }),
            transformResponse: (r: Wrapped<IInvestorTx>) => r.data,
            invalidatesTags: [...TAGS],
        }),

        updateInvestorTransaction: builder.mutation<IInvestorTx, Partial<IInvestorTxInput> & { investorId: string; txId: string }>({
            query: ({ investorId, txId, ...body }) => ({ url: `/investors/${investorId}/transactions/${txId}`, method: 'PATCH', body }),
            transformResponse: (r: Wrapped<IInvestorTx>) => r.data,
            invalidatesTags: [...TAGS],
        }),

        deleteInvestorTransaction: builder.mutation<unknown, { investorId: string; txId: string }>({
            query: ({ investorId, txId }) => ({ url: `/investors/${investorId}/transactions/${txId}`, method: 'DELETE' }),
            invalidatesTags: [...TAGS],
        }),
    }),
});

export const {
    useGetInvestorListQuery,
    useGetInvestorSummaryQuery,
    useGetInvestorLedgerQuery,
    useCreateInvestorMutation,
    useUpdateInvestorMutation,
    useDeleteInvestorMutation,
    useCreateInvestorTransactionMutation,
    useUpdateInvestorTransactionMutation,
    useDeleteInvestorTransactionMutation,
} = investorApi;
