import { Request, Response, NextFunction } from 'express';

/**
 * Let a shopper's browser reuse a response for a few seconds.
 *
 * Every page load re-fetches the categories, the site content and the active
 * offers, and from Dhaka each of those round trips costs ~660ms of pure network
 * latency (the server itself answers in ~10ms). None of it changes between one
 * page and the next.
 *
 * Only unauthenticated requests are cached. The client attaches a bearer token
 * to every call once someone is signed in, so an admin who saves store settings
 * and reloads still gets a fresh response instead of watching their own change
 * appear to revert. `Vary: Authorization` keeps any shared cache from serving
 * one audience's copy to the other.
 */
export const publicCache = (seconds: number) => (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Vary', 'Authorization');
    if (!req.headers.authorization) {
        res.setHeader('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`);
    } else {
        res.setHeader('Cache-Control', 'no-store');
    }
    next();
};
