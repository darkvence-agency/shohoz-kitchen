import express from 'express';
import { upload, uploadStaffImages, uploadDocuments } from '../../utils/fileUpload';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import { rateLimit } from '../../middlewares/rateLimit';
import { uploadController } from './upload.controller';

const router = express.Router();

// Every route here checks the sign-in before multer runs, so an anonymous request
// is turned away before anything is written to disk. No caller uploads without
// signing in: reviews carry no photos, and the quotation form sends none.

// Customers can open an account themselves, so their route is also capped per IP.
const myImagesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many uploads. Please wait a few minutes and try again.',
});

// POST /api/upload/image — single image. Staff: product, category and site
// images, and the store logo and favicon (the only route that takes SVG).
router.post(
    '/image',
    authMiddleware,
    authorizeRoles('admin', 'editor'),
    uploadStaffImages.single('image'),
    uploadController.uploadSingle,
);

// POST /api/upload/images — multiple up to 10. Staff: product galleries.
router.post(
    '/images',
    authMiddleware,
    authorizeRoles('admin', 'editor'),
    uploadStaffImages.array('images', 10),
    uploadController.uploadMultiple,
);

// POST /api/upload/my-images — multiple up to 5. Any signed-in user: avatars,
// chat photos, return photos.
router.post(
    '/my-images',
    myImagesLimiter,
    authMiddleware,
    upload.array('images', 5),
    uploadController.uploadMultiple,
);

// POST /api/upload/documents — up to 10 photos or documents (PDF, Word, Excel).
// Staff only: this is where receipts and bills for Expenses are filed.
router.post(
    '/documents',
    authMiddleware,
    authorizeRoles('admin'),
    uploadDocuments.array('files', 10),
    uploadController.uploadDocuments,
);

export const UploadRoutes = router;
