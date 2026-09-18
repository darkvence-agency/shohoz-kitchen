import { baseApi } from './baseApi';

export interface InvoiceItem {
    name: string;
    sku: string;
    price: number;
    quantity: number;
    total: number;
}

export interface InvoiceParty {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    area?: string;
    city?: string;
    postalCode?: string;
}

export interface InvoiceData {
    invoiceNumber: string;
    orderId: string;
    date: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    brand: string;
    billTo: InvoiceParty;
    shipTo: InvoiceParty;
    items: InvoiceItem[];
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    couponCode?: string;
}

interface InvoiceResponse {
    success: boolean;
    data: InvoiceData;
}

interface EmailInvoiceResponse {
    success: boolean;
    message: string;
}

export const invoiceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getInvoice: builder.query<InvoiceResponse, string>({
            query: (orderId) => ({
                url: '/invoices/' + orderId,
                method: 'GET',
            }),
            providesTags: ['Invoices'],
        }),
        emailInvoice: builder.mutation<EmailInvoiceResponse, { orderId: string }>({
            query: ({ orderId }) => ({
                url: '/invoices/' + orderId + '/email',
                method: 'POST',
            }),
        }),
    }),
    overrideExisting: false,
});

export const { useGetInvoiceQuery, useEmailInvoiceMutation } = invoiceApi;
