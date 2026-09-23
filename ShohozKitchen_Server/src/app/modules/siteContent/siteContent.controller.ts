import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import SiteContentService from './siteContent.service';
import { updateMarketingValidation, updatePaymentValidation, updateSeoValidation } from './siteContent.validation';

const SiteContentController = {
    // GET /api/site-content — Public
    get: catchAsync(async (req: Request, res: Response) => {
        const content = await SiteContentService.get();
        // Every page load fetches this. `legalPages` holds the complete HTML of the
        // Terms, Privacy and Refund pages — tens of kilobytes that nothing reading
        // this response uses: those pages load from /site-content/legal/:slug, and
        // the admin editor lists them from /site-content/legal.
        const data = { ...((content as any)?.toObject?.() ?? content ?? {}) };
        delete data.legalPages;
        sendResponse(res, { statusCode: 200, success: true, message: 'Site content fetched', data });
    }),

    // PUT /api/site-content — Admin only (full update)
    update: catchAsync(async (req: Request, res: Response) => {
        const content = await SiteContentService.update(req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Site content updated', data: content });
    }),

    // PUT /api/site-content/marketing — Super admin only
    updateMarketing: catchAsync(async (req: Request, res: Response) => {
        // Parse again for the cleaned values (trimmed, upper-cased, the code pulled
        // out of a pasted <meta> tag) — validateRequest only checks, it does not rewrite.
        const data = updateMarketingValidation.shape.body.parse(req.body) as Record<string, string>;
        const content = await SiteContentService.updateMarketing(data);
        sendResponse(res, { statusCode: 200, success: true, message: 'Marketing settings saved', data: content?.marketing });
    }),

    // PUT /api/site-content/seo — Super admin only
    updateSeo: catchAsync(async (req: Request, res: Response) => {
        const data = updateSeoValidation.shape.body.parse(req.body) as Record<string, string>;
        const content = await SiteContentService.updateSeo(data);
        sendResponse(res, { statusCode: 200, success: true, message: 'SEO settings saved', data: content?.seo });
    }),

    // PUT /api/site-content/payment — Super admin only
    updatePayment: catchAsync(async (req: Request, res: Response) => {
        const data = updatePaymentValidation.shape.body.parse(req.body) as Record<string, unknown>;
        const content = await SiteContentService.updatePayment(data);
        sendResponse(res, { statusCode: 200, success: true, message: 'Payment methods saved', data: content?.payment });
    }),

    // PATCH /api/site-content/:section — Admin only (section update)
    updateSection: catchAsync(async (req: Request, res: Response) => {
        const { section } = req.params;
        // 'seo' and 'marketing' are not here: they are super admin only, on their own routes.
        const validSections = ['ticker', 'contact', 'floating', 'footer', 'defaultTagline', 'announcement', 'legalPages'];
        if (!validSections.includes(section)) {
            return sendResponse(res, { statusCode: 400, success: false, message: `Invalid section: ${section}` });
        }
        const content = await SiteContentService.updateSection(section, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: `${section} updated`, data: content });
    }),

    // GET /api/site-content/legal/:slug — Public (single legal page)
    getLegalPage: catchAsync(async (req: Request, res: Response) => {
        const { slug } = req.params;
        const validSlugs = ['terms', 'privacy', 'refund'];
        if (!validSlugs.includes(slug)) {
            return sendResponse(res, { statusCode: 400, success: false, message: `Invalid legal page: ${slug}` });
        }
        const page = await SiteContentService.getLegalPage(slug);
        if (!page) {
            return sendResponse(res, { statusCode: 404, success: false, message: 'Legal page not found' });
        }
        sendResponse(res, { statusCode: 200, success: true, message: 'Legal page fetched', data: page });
    }),

    // PUT /api/site-content/legal/:slug — Admin only (update legal page)
    updateLegalPage: catchAsync(async (req: Request, res: Response) => {
        const { slug } = req.params;
        const validSlugs = ['terms', 'privacy', 'refund'];
        if (!validSlugs.includes(slug)) {
            return sendResponse(res, { statusCode: 400, success: false, message: `Invalid legal page: ${slug}` });
        }
        const page = await SiteContentService.updateLegalPage(slug, req.body);
        sendResponse(res, { statusCode: 200, success: true, message: 'Legal page updated', data: page });
    }),

    // GET /api/site-content/legal — Admin (all legal pages)
    getAllLegalPages: catchAsync(async (req: Request, res: Response) => {
        const pages = await SiteContentService.getAllLegalPages();
        sendResponse(res, { statusCode: 200, success: true, message: 'Legal pages fetched', data: pages });
    }),
};

export default SiteContentController;
