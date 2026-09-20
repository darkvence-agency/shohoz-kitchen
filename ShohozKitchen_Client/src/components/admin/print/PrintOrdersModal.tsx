"use client";

import React, { useMemo, useRef, useState } from 'react';
import { LuPrinter, LuRefreshCw } from 'react-icons/lu';
import { Modal, Btn } from '@/components/admin/ui';
import { useGetOrdersPrintDataQuery } from '@/redux/api/orderApi';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import { buildInvoicesHtml, buildLabelsHtml, storeFromSiteContent, type PrintOrder } from './printDocs';

/**
 * Print shipping labels or order invoices for one or many orders.
 *
 * The documents are HTML (so Bangla names and addresses shape correctly), shown in
 * an <iframe srcDoc> that looks like a PDF viewer. "Print / Save as PDF" prints only
 * the iframe; the browser's print dialog offers Save as PDF.
 *
 * The iframe is sandboxed without scripts (only same-origin, so this page can wait
 * for its fonts and call print(), and modals, so print() is allowed).
 */

export type PrintKind = 'labels' | 'invoices';
export type PrintJob = { kind: PrintKind; ids: string[] };

/** The server accepts at most this many orders per request. */
export const MAX_PRINT_ORDERS = 100;

const TITLES: Record<PrintKind, string> = { labels: 'Shipping labels', invoices: 'Order invoices' };
const HINTS: Record<PrintKind, string> = {
    labels: '100 × 75 mm, one label per page. Pick your label printer (or Save as PDF) in the print dialog.',
    invoices: 'A4, one order per page. In the print dialog, untick “Headers and footers” for a clean page.',
};

/** Wait (at most `timeoutMs`) for the document's web fonts and images, so nothing prints half-loaded. */
async function waitForAssets(doc: Document, timeoutMs = 8000): Promise<void> {
    const work = (async () => {
        const fonts = doc.fonts;
        if (fonts) {
            // Ask for the Bangla-capable face explicitly — fonts.ready alone can resolve
            // before the browser has even started fetching a face it has not laid out yet.
            await Promise.allSettled([
                fonts.load('400 12px "Hind Siliguri"', 'অর্ডার Aa'),
                fonts.load('700 12px "Hind Siliguri"', 'অর্ডার Aa'),
            ]);
            await fonts.ready;
        }
        await Promise.all(Array.from(doc.images).map((img) => (img.complete
            ? undefined
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
            }))));
    })();
    await Promise.race([work, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
}

function errorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'data' in error) {
        const data = (error as { data?: { message?: string } }).data;
        if (data?.message) return data.message;
    }
    return 'Could not load the orders to print.';
}

/** Renders nothing until there is a job; a new job starts a fresh dialog. */
export default function PrintOrdersModal({ job, onClose }: { job: PrintJob | null; onClose: () => void }) {
    if (!job || job.ids.length === 0) return null;
    return <PrintDialog key={`${job.kind}:${job.ids.join(',')}`} job={job} onClose={onClose} />;
}

function PrintDialog({ job, onClose }: { job: PrintJob; onClose: () => void }) {
    const ids = job.ids.slice(0, MAX_PRINT_ORDERS);
    const { data, isLoading, isFetching, isError, error, refetch } = useGetOrdersPrintDataQuery(ids);
    const { data: siteData, isLoading: isSiteLoading } = useGetSiteContentQuery(undefined);
    const frameRef = useRef<HTMLIFrameElement>(null);
    // The document whose fonts and images have finished loading in the iframe.
    const [readyHtml, setReadyHtml] = useState<string | null>(null);

    const html = useMemo(() => {
        const orders: PrintOrder[] = data?.data || [];
        if (!orders.length || isSiteLoading) return '';
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const store = storeFromSiteContent(siteData?.data, origin);
        return job.kind === 'labels' ? buildLabelsHtml(orders, store) : buildInvoicesHtml(orders, store);
    }, [data, siteData, isSiteLoading, job.kind]);

    const found: number = data?.data?.length || 0;
    const count = found || ids.length;
    const missing = data && !isFetching ? ids.length - found : 0;
    const ready = !!html && readyHtml === html;

    const onFrameLoad = async () => {
        const doc = frameRef.current?.contentDocument;
        if (!doc || !html) return;
        const loaded = html;
        await waitForAssets(doc);
        setReadyHtml(loaded);
    };

    const print = async () => {
        const frame = frameRef.current;
        const win = frame?.contentWindow;
        const doc = frame?.contentDocument;
        if (!win || !doc) return;
        await waitForAssets(doc);
        win.focus();
        win.print();
    };

    const notes = [
        HINTS[job.kind],
        job.ids.length > MAX_PRINT_ORDERS ? `Only the first ${MAX_PRINT_ORDERS} selected orders are included.` : '',
        missing > 0 ? `${missing} order${missing > 1 ? 's' : ''} could not be found.` : '',
    ].filter(Boolean).join(' ');

    return (
        <Modal
            open
            onClose={onClose}
            title={`${TITLES[job.kind]} (${count})`}
            subtitle={notes}
            width="max-w-5xl"
            footer={<>
                <Btn onClick={onClose}>Close</Btn>
                <Btn variant="primary" icon={<LuPrinter size={15} />} onClick={print} disabled={!ready}>
                    {ready ? 'Print / Save as PDF' : 'Preparing…'}
                </Btn>
            </>}
        >
            {isError ? (
                <div className="flex h-[60vh] flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-6 text-center">
                    <p className="text-sm text-gray-700">{errorMessage(error)}</p>
                    <Btn icon={<LuRefreshCw size={15} />} onClick={() => refetch()}>Try again</Btn>
                </div>
            ) : !html ? (
                <div className="flex h-[70vh] items-center justify-center rounded-xl bg-[#525659]">
                    <p className="text-sm text-gray-200">{isLoading || isSiteLoading ? 'Loading orders…' : 'Nothing to print.'}</p>
                </div>
            ) : (
                <iframe
                    ref={frameRef}
                    title={TITLES[job.kind]}
                    srcDoc={html}
                    onLoad={onFrameLoad}
                    sandbox="allow-same-origin allow-modals"
                    className="block h-[70vh] w-full rounded-xl border-0 bg-[#525659]"
                />
            )}
        </Modal>
    );
}
