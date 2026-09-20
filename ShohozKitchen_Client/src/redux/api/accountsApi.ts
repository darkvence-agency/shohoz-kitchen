import { baseApi } from './baseApi';

// Accounts overview — the money side of the business at a glance (admin only,
// read-only). Backend: GET /api/accounts/overview?from&to
// from/to are Bangladesh calendar days (YYYY-MM-DD), both inclusive; leave both out for all time.

export interface IAccountsPeriodArgs {
    from?: string;
    to?: string;
}

export interface IAccountsMonth {
    /** YYYY-MM (Dhaka) */
    month: string;
    /** delivered orders' value, dated by delivery */
    sales: number;
    orders: number;
    expenses: number;
    /** cash paid to suppliers, by payment date */
    purchasesPaid: number;
    /** courier payouts received */
    payouts: number;
}

export interface IAccountsOverview {
    period: { from: string | null; to: string | null; allTime: boolean; today: string; timezone: string };
    investment: { moneyIn: number; moneyOut: number; capital: number; investors: number };
    /** Delivered orders at order.total (items − discount + delivery charge), settled or not */
    sales: {
        total: number;
        orders: number;
        /** delivery charges included in `total` */
        deliveryCharges: number;
        discount: number;
        /** delivered orders paid online (bKash, card …): never collected by the courier */
        paidOnline: number;
        paidOnlineOrders: number;
        codTotal: number;
        codOrders: number;
    };
    payouts: {
        received: number;
        count: number;
        codCollected: number;
        deliveryBills: number;
        codFee: number;
        /** payouts recorded without a COD breakdown (their charges are unknown) */
        withoutBreakdown: number;
        lastReceivedAt: string | null;
    };
    expenses: { total: number; count: number };
    /** Placed purchase orders (not drafts or cancelled), by order date; paymentsMade = cash paid to suppliers by payment date */
    purchases: { total: number; paid: number; due: number; count: number; paymentsMade: number; paymentCount: number };
    /** Today's stock at average purchase cost; not affected by the period */
    stock: { value: number; units: number; uncosted: number; products: number };
    /** sales.total − payouts.received (an estimate) */
    salesNotPaidOut: number;
    gap: { total: number; paidOnline: number; courierCharges: number; rest: number };
    /** An estimate from what is recorded here */
    cash: {
        moneyIn: number;
        moneyOut: number;
        position: number;
        estimate: true;
        in: { capital: number; payouts: number; online: number };
        out: { expenses: number; suppliers: number; capitalOut: number };
    };
    /** nothing moved in the period (stock aside) */
    empty: boolean;
    /** the 12 months ending with the period's last month, oldest first */
    monthly: IAccountsMonth[];
    generatedAt: string;
}

export const accountsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAccountsOverview: builder.query<IAccountsOverview, IAccountsPeriodArgs>({
            query: ({ from, to }) => ({
                url: '/accounts/overview',
                params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
            }),
            transformResponse: (r: { data: IAccountsOverview }) => r.data,
            // Any change in the modules it reads from refreshes the overview.
            providesTags: ['Accounts', 'Orders', 'Expenses', 'Investors', 'Purchases', 'Payouts', 'Inventory', 'Products'],
        }),
    }),
});

export const { useGetAccountsOverviewQuery } = accountsApi;
