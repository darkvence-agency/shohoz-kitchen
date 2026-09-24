import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import OrderService from './order.service';
import SiteContentService from '../siteContent/siteContent.service';
import AppError from '../../utils/AppError';
import { createAdminOrderBody } from './order.validation';

const MANUAL_METHODS = ['bkash', 'nagad', 'rocket', 'bank'];

/**
 * What a customer may pay with at checkout: cash on delivery always; bKash, Nagad,
 * Rocket and bank transfer only while the super admin has them switched on with an
 * account set (Settings → Payment methods). A manual payment also needs where it was
 * sent from, the transaction ID and the time, which staff check before marking the
 * order paid. Orders staff create from the dashboard skip this.
 */
const checkCheckoutPayment = async (body: { paymentMethod?: string; paymentDetails?: Record<string, string> }) => {
    const method = body.paymentMethod || 'cod';
    if (method === 'cod') return;

    const unavailable = new AppError(400, 'This payment method is not available right now. Please choose another one.');
    if (!MANUAL_METHODS.includes(method)) throw unavailable;

    const content = await SiteContentService.get();
    const cfg = (content as unknown as { payment?: Record<string, Record<string, unknown>> } | null)?.payment?.[method];
    const account = method === 'bank' ? cfg?.accountNumber : cfg?.number;
    if (cfg?.active !== true || !String(account || '').trim()) throw unavailable;

    const d = body.paymentDetails || {};
    if (!d.senderNumber?.trim() || !d.transactionId?.trim() || !d.paymentTime?.trim()) {
        throw new AppError(400, 'Enter where you paid from, the transaction ID and the payment time.');
    }
};

const OrderController = {
    getAll: catchAsync(async (req: Request, res: Response) => {
        const { orders, meta } = await OrderService.getAllOrders(req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'Orders fetched', data: orders, meta });
    }),

    getMyOrders: catchAsync(async (req: Request, res: Response) => {
        const { orders, meta } = await OrderService.getMyOrders(req.user!.userId, req.query as Record<string, unknown>);
        sendResponse(res, { statusCode: 200, success: true, message: 'My orders fetched', data: orders, meta });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        // Staff (super admin, admin, editor) can view any order; everyone else only their own.
        const isAdmin = req.user!.role === 'admin' || req.user!.role === 'superadmin' || req.user!.role === 'editor';
        const order = await OrderService.getOrderById(req.params.id, isAdmin ? undefined : req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Order fetched', data: order });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        await checkCheckoutPayment(req.body);
        const order = await OrderService.createOrder(req.user!.userId, req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Order placed successfully', data: order });
    }),

    updateStatus: catchAsync(async (req: Request, res: Response) => {
        const order = await OrderService.updateOrderStatus(req.params.id, req.body.status, req.body.note, req.user?.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Order status updated', data: order });
    }),

    updateOrder: catchAsync(async (req: Request, res: Response) => {
        const order = await OrderService.updateOrderDetails(req.params.id, req.body, req.user?.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Order updated', data: order });
    }),

    updatePaymentStatus: catchAsync(async (req: Request, res: Response) => {
        const order = await OrderService.updatePaymentStatus(req.params.id, req.body.paymentStatus);
        sendResponse(res, { statusCode: 200, success: true, message: 'Payment status updated', data: order });
    }),

    addNote: catchAsync(async (req: Request, res: Response) => {
        const order = await OrderService.addAdminNote(req.params.id, req.body.note);
        sendResponse(res, { statusCode: 200, success: true, message: 'Note added', data: order });
    }),

    updateOrderTracking: catchAsync(async (req: Request, res: Response) => {
        const order = await OrderService.updateOrderTracking(req.params.id, req.body.trackingNumber, req.body.carrier);
        sendResponse(res, { statusCode: 200, success: true, message: 'Order tracking updated', data: order });
    }),

    // Public order tracking (no auth)
    trackOrder: catchAsync(async (req: Request, res: Response) => {
        const data = await OrderService.trackOrder(req.params.orderId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Order tracking fetched', data });
    }),

    cancel: catchAsync(async (req: Request, res: Response) => {
        const order = await OrderService.cancelOrder(req.params.id, req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Order cancelled', data: order });
    }),

    getStats: catchAsync(async (req: Request, res: Response) => {
        const stats = await OrderService.getOrderStats();
        sendResponse(res, { statusCode: 200, success: true, message: 'Order stats fetched', data: stats });
    }),

    // POST /api/orders/admin (admin) — "New order" from the dashboard.
    // validateRequest only checks the body; parsing it again here drops unknown fields
    // and fills the defaults (status / payment 'pending', shipping 'auto').
    // The order is created even when setting its starting status or payment then fails:
    // `warnings` says what still needs doing, and the message repeats it.
    createByAdmin: catchAsync(async (req: Request, res: Response) => {
        const payload = createAdminOrderBody.parse(req.body);
        const { order, warnings } = await OrderService.createAdminOrder(payload, req.user!.userId);
        const plain = typeof order?.toJSON === 'function' ? order.toJSON() : order;
        const message = warnings.length
            ? `Order ${plain.orderId} was created, but not all of it went through. ${warnings.join(' ')}`
            : 'Order created';
        sendResponse(res, { statusCode: 201, success: true, message, data: { ...plain, warnings } });
    }),

    guestCheckout: catchAsync(async (req: Request, res: Response) => {
        await checkCheckoutPayment(req.body);
        const result = await OrderService.createGuestOrder(req.body);
        const message = result.isNewUser
            ? 'Order placed successfully! An account has been created and you are now logged in. Use "Forgot password" to set a login password for next time.'
            : 'Order placed successfully!';
        sendResponse(res, { statusCode: 201, success: true, message, data: result });
    }),





};

export default OrderController;
