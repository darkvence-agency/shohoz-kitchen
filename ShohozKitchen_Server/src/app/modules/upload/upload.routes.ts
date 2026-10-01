import express from 'express';
import { upload, uploadDocuments } from '../../utils/fileUpload';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth';
import { uploadController } from './upload.controller';

const router = express.Router();

// POST /api/upload/image  — single image (public: reviews, admin)
router.post(
    '/image',
    upload.single('image'),
    uploadController.uploadSingle,
);

// POST /api/upload/images — multiple up to 10 (admin / reviews)
router.post(
    '/images',
    upload.array('images', 10),
    uploadController.uploadMultiple,
);

// POST /api/upload/my-images — multiple up to 5
router.post(
    '/my-images',
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
