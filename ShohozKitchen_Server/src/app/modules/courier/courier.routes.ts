import express from 'express';
import CourierController from './courier.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';

const router = express.Router();

// ── Public: Steadfast delivery-status webhook (refused unless the shared secret matches) ──
router.post('/webhook', CourierController.webhook);

// ── Staff: Steadfast courier management ──
// The order desk (editors) books parcels and follows them, as admins do. Only the
// Steadfast account balance — shop money — stays with admins and super admins.
const desk = [authMiddleware, authorizeRoles('admin', 'editor')];
const admin = [authMiddleware, authorizeRoles('admin', 'superadmin')];

// Courier board — flattened parcels by tab, the per-tab counts, and "Sync all".
router.get('/packages', ...desk, CourierController.listPackages);
router.get('/counts', ...desk, CourierController.tabCounts);
router.post('/sync-active', ...desk, CourierController.syncActive);

// Bulk actions (checkbox selections from the Shipments board).
router.post('/bulk-book', ...desk, CourierController.bulkBook);
router.post('/bulk-status', ...desk, CourierController.bulkRefresh);

// Single package (from the order-detail page).
router.post('/orders/:orderId/packages/:packageId/book', ...desk, CourierController.bookPackage);
router.get('/orders/:orderId/packages/:packageId/status', ...desk, CourierController.refreshStatus);

router.get('/balance', ...admin, CourierController.getBalance);

export const CourierRoutes = router;
