import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import config from '../config';

// ── Where uploaded files live ───────────────────────────────────────────────
// Images are stored on the server's own disk and served back from /uploads.
// UPLOAD_DIR lets the hosting point this at a persistent volume; without one a
// redeploy replaces the container and every previously-uploaded image is gone.
export const uploadsDir = config.upload_dir;
export const UPLOAD_DIR = uploadsDir;

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Disk storage — writes files into uploadsDir with a unique name ──────────
const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
        cb(null, `product_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
    },
});

// ── Multer upload — up to 10 files, 10MB each ────────────────────────────────
export const upload = multer({
    storage: diskStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpg, png, webp, gif, avif, svg)'));
        }
    },
});

// ── Resolve the public URL for an uploaded file ──────────────────────────────
// Files are served by the /uploads static route, so the URL is just this API's
// own origin plus the stored filename.
export function fileToUrl(req: Request, file: Express.Multer.File): string {
    const base = (config.backend_url || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    return `${base}/uploads/${file.filename}`;
}
