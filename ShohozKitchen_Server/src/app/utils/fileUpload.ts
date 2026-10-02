import multer from 'multer';
import fs from 'fs';
import { Request } from 'express';
import config from '../config';
import AppError from './AppError';

// ── Where uploaded files live ───────────────────────────────────────────────
// Images are stored on the server's own disk and served back from /uploads.
// UPLOAD_DIR lets the hosting point this at a persistent volume; without one a
// redeploy replaces the container and every previously-uploaded image is gone.
export const uploadsDir = config.upload_dir;
export const UPLOAD_DIR = uploadsDir;

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Images: product photos, avatars, chat and return photos ────────────────
// The extension comes from the checked type, never from the sender's file name:
// a "photo.html" sent as image/png would otherwise be served back as a web page.
const IMAGE_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
};

// SVG can carry script, and /uploads is served from the API's own origin. Only the
// staff routes take it, for the store logo and favicon (Settings → Store).
const STAFF_IMAGE_TYPES: Record<string, string> = { ...IMAGE_TYPES, 'image/svg+xml': '.svg' };

// Up to 10 files per request (each route sets its own cap), 10MB each.
const imageUpload = (types: Record<string, string>, message: string) =>
    multer({
        storage: multer.diskStorage({
            destination: (_req, _file, cb) => cb(null, uploadsDir),
            filename: (_req, file, cb) => {
                cb(null, `product_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${types[file.mimetype]}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB
        fileFilter: (_req, file, cb) => {
            if (types[file.mimetype]) cb(null, true);
            else cb(new Error(message));
        },
    });

// Any signed-in user: avatars, chat photos, return photos.
export const upload = imageUpload(IMAGE_TYPES, 'Only image files are allowed (jpg, png, webp, gif, avif)');

// Staff only: product, category and site images, and the store logo and favicon.
export const uploadStaffImages = imageUpload(STAFF_IMAGE_TYPES, 'Only image files are allowed (jpg, png, webp, gif, avif, svg)');

// ── Resolve the public URL for an uploaded file ──────────────────────────────
// Files are served by the /uploads static route, so the URL is just this API's
// own origin plus the stored filename.
export function fileToUrl(req: Request, file: Express.Multer.File): string {
    const base = (config.backend_url || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    return `${base}/uploads/${file.filename}`;
}

// ── Documents: receipts, bills and papers filed by staff ────────────────────
// Photos plus PDF, Word and Excel. SVG and HTML are left out on purpose: the
// /uploads folder is served from the API's own origin, and either could carry
// script. Only admins reach this (see upload.routes.ts).
export const DOCUMENT_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/csv': '.csv',
};

export const uploadDocuments = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadsDir),
        // The extension comes from the checked type, never from the sender's file name.
        filename: (_req, file, cb) => {
            cb(null, `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${DOCUMENT_TYPES[file.mimetype]}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB each, 10 at a time
    fileFilter: (_req, file, cb) => {
        if (DOCUMENT_TYPES[file.mimetype]) cb(null, true);
        // An AppError so the reply is a 400 the dashboard can show, not a 500.
        else cb(new AppError(400, 'Attach a photo (JPG, PNG, WebP), a PDF, or a Word or Excel file'));
    },
});
