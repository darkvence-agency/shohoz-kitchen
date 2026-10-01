import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { fileToUrl } from '../../utils/fileUpload';

// POST /api/upload/image   — single image
// POST /api/upload/images  — multiple images (max 10)

export const uploadController = {
    // ── Single image ──────────────────────────────────────────
    uploadSingle: catchAsync(async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const url = fileToUrl(req, req.file as Express.Multer.File);
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: 'Image uploaded successfully',
            data: { url },
        });
    }),

    // ── Documents (up to 10): each with its original name, for the list it lands in ──
    uploadDocuments: catchAsync(async (req: Request, res: Response) => {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }
        const data = files.map((f) => ({
            url: fileToUrl(req, f),
            name: f.originalname.slice(0, 200),
            type: f.mimetype,
        }));
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: `${data.length} file(s) uploaded`,
            data,
        });
    }),

    // ── Multiple images (up to 10) ────────────────────────────
    uploadMultiple: catchAsync(async (req: Request, res: Response) => {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }
        const urls = files.map((f) => fileToUrl(req, f));
        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: `${urls.length} image(s) uploaded successfully`,
            data: { urls },
        });
    }),
};
