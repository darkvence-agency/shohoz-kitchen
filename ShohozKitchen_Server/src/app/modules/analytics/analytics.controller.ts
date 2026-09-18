import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { Order } from '../order/order.model';
import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import { Category } from '../category/category.model';
import AnalyticsService from './analytics.service';

const AnalyticsController = {
    // GET /analytics/dashboard — Main dashboard summary
    getDashboardSummary: catchAsync(async (req: Request, res: Response) => {
        const [
            totalOrders,
            totalProducts,
            totalCustomers,
            totalCategories,
            pendingOrders,
            deliveredOrders,
            paidOrders,
            pendingPayments,
        ] = await Promise.all([
            Order.countDocuments(),
            Product.countDocuments({ isDeleted: false }),
            User.countDocuments({ role: 'user' }),
            Category.countDocuments({ isActive: true }),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'delivered' }),
            // Payment-status counts (used by the Payments dashboard).
            Order.countDocuments({ paymentStatus: 'paid' }),
            Order.countDocuments({ paymentStatus: 'pending' }),
        ]);

        const revenueData = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ]);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayOrders = await Order.countDocuments({ createdAt: { $gte: todayStart } });

        const todayRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: todayStart }, paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Dashboard summary fetched',
            data: {
                totalRevenue: revenueData[0]?.totalRevenue || 0,
                totalOrders,
                totalProducts,
                totalCustomers,
                totalCategories,
                pendingOrders,
                deliveredOrders,
                paidOrders,
                pendingPayments,
                todayOrders,
                todayRevenue: todayRevenue[0]?.total || 0,
            },
        });
    }),

    // GET /analytics/monthly-revenue
    getMonthlyRevenue: catchAsync(async (req: Request, res: Response) => {
        const monthlyRevenue = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 },
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const data = monthlyRevenue.map((item) => ({
            month: months[item._id.month - 1],
            year: item._id.year,
            revenue: item.revenue,
            orders: item.orders,
        }));

        sendResponse(res, { statusCode: 200, success: true, message: 'Monthly revenue fetched', data });
    }),

    // GET /analytics/recent-orders
    getRecentOrders: catchAsync(async (req: Request, res: Response) => {
        const limit = Number(req.query.limit) || 10;
        const orders = await Order.find()
            .populate('user', 'firstName lastName email')
            .sort('-createdAt')
            .limit(limit)
            .select('orderId user total status paymentStatus paymentMethod shippingAddress items createdAt');

        sendResponse(res, { statusCode: 200, success: true, message: 'Recent orders fetched', data: orders });
    }),

    // GET /analytics/top-products
    getTopProducts: catchAsync(async (req: Request, res: Response) => {
        const limit = Number(req.query.limit) || 10;
        const topProducts = await Product.find({ isDeleted: false })
            .sort('-totalSold')
            .limit(limit)
            .select('name thumbnail price totalSold stock category averageRating');

        sendResponse(res, { statusCode: 200, success: true, message: 'Top products fetched', data: topProducts });
    }),

    // GET /analytics/sales-by-category
    getSalesByCategory: catchAsync(async (req: Request, res: Response) => {
        const salesByCategory = await Order.aggregate([
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productInfo',
                },
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    // Products with no category (or a deleted one) fall into a single
                    // clearly-labelled "Uncategorized" bucket instead of a blank/null row.
                    _id: { $ifNull: ['$categoryInfo._id', 'uncategorized'] },
                    name: { $first: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] } },
                    totalSales: { $sum: '$items.total' },
                    totalItems: { $sum: '$items.quantity' },
                },
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 },
        ]);

        sendResponse(res, { statusCode: 200, success: true, message: 'Sales by category fetched', data: salesByCategory });
    }),

    // GET /analytics/revenue
    getRevenueStats: catchAsync(async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query;
        const match: any = { paymentStatus: 'paid' };

        if (startDate) match.createdAt = { $gte: new Date(startDate as string) };
        if (endDate) {
            match.createdAt = { ...match.createdAt, $lte: new Date(endDate as string) };
        }

        const dailyRevenue = await Order.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        sendResponse(res, { statusCode: 200, success: true, message: 'Revenue stats fetched', data: dailyRevenue });
    }),

    // ════════════════════════════════════════════════════════════
    //  ADMIN ENHANCEMENTS
    // ════════════════════════════════════════════════════════════

    // GET /analytics/low-stock?threshold=10
    getLowStock: catchAsync(async (req: Request, res: Response) => {
        const threshold = Number(req.query.threshold) || 10;
        const data = await AnalyticsService.getLowStock(threshold);
        sendResponse(res, { statusCode: 200, success: true, message: 'Low stock products fetched', data });
    }),

    // GET /analytics/returns-summary
    getReturnsSummary: catchAsync(async (req: Request, res: Response) => {
        const data = await AnalyticsService.getReturnsSummary();
        sendResponse(res, { statusCode: 200, success: true, message: 'Returns summary fetched', data });
    }),

    // GET /analytics/report/pdf
    getAdminReportPdf: catchAsync(async (req: Request, res: Response) => {
        const pdf = await AnalyticsService.generateAdminReportPdf();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ShohozKitchen-Platform-Analytics.pdf"`);
        res.send(pdf);
    }),
};

export default AnalyticsController;
