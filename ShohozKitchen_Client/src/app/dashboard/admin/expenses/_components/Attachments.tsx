"use client";

/**
 * The files filed with an expense — receipt photos, PDF bills, Word or Excel sheets.
 * The form, the list and the files viewer all use these, so a file is checked, uploaded
 * and shown the same way wherever it is added.
 */

import React, { useRef } from 'react';
import { toast } from 'react-hot-toast';
import { LuFileText, LuFileSpreadsheet, LuFile, LuPaperclip, LuX } from 'react-icons/lu';
import { cx } from '@/components/admin/ui';
import { MAX_EXPENSE_ATTACHMENTS, type IExpenseAttachment } from '@/redux/api/expenseApi';
import { useUploadDocumentsMutation } from '@/redux/api/uploadApi';
import { errMsg } from './shared';

const MAX_BYTES = 10 * 1024 * 1024;

/** What the file picker offers; the server checks the same list (DOCUMENT_TYPES). */
export const ATTACHMENT_ACCEPT = [
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    '.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
].join(',');

/** A photo can be shown inline; anything else gets a file tile. Old receipts say just "image". */
export const isImage = (a: IExpenseAttachment) =>
    (a.type || '').startsWith('image') || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(a.url);

/** The name to show: what it was uploaded as, else the end of its link. */
export const attachmentName = (a: IExpenseAttachment) =>
    a.name || decodeURIComponent(a.url.split('/').pop() || 'File');

function FileGlyph({ a, size = 20 }: { a: IExpenseAttachment; size?: number }) {
    const t = `${a.type || ''} ${a.url}`.toLowerCase();
    if (/sheet|excel|\.xlsx?|csv/.test(t)) return <LuFileSpreadsheet size={size} className="text-emerald-600" />;
    if (/pdf|word|\.docx?/.test(t)) return <LuFileText size={size} className="text-red-500" />;
    return <LuFile size={size} className="text-gray-400" />;
}

/**
 * Upload files staff picked or dropped, keeping to the limits before anything is sent:
 * the expense's room left, 10 MB each. Resolves to what was uploaded (empty on failure).
 */
export function useAttachmentUpload() {
    const [uploadDocuments, { isLoading }] = useUploadDocumentsMutation();

    const upload = async (files: FileList | File[] | null | undefined, room: number): Promise<IExpenseAttachment[]> => {
        const list = Array.from(files || []);
        if (!list.length) return [];
        if (room <= 0) {
            toast.error(`An expense can carry ${MAX_EXPENSE_ATTACHMENTS} files at most — remove one first`);
            return [];
        }
        const tooBig = list.find((f) => f.size > MAX_BYTES);
        if (tooBig) { toast.error(`"${tooBig.name}" is over 10 MB`); return []; }
        const take = list.slice(0, room);
        if (take.length < list.length) toast(`Only ${room} more file${room === 1 ? '' : 's'} fit — the first ${take.length} were added.`);

        const fd = new FormData();
        take.forEach((f) => fd.append('files', f));
        try {
            const res = await uploadDocuments(fd).unwrap();
            return res.data;
        } catch (err) {
            toast.error(errMsg(err, 'Upload failed. Try again.'));
            return [];
        }
    };

    return { upload, uploading: isLoading };
}

/** The files as tiles: photos as thumbnails, documents with their name. Each opens in a new tab. */
export function AttachmentTiles({ items, onRemove, size = 'md' }: {
    items: IExpenseAttachment[];
    onRemove?: (index: number) => void;
    size?: 'md' | 'lg';
}) {
    const box = size === 'lg' ? 'h-36 w-36' : 'h-20 w-20';
    return (
        <ul className="flex flex-wrap gap-2.5">
            {items.map((a, i) => (
                <li key={`${a.url}-${i}`} className={cx('group relative', box)}>
                    <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={attachmentName(a)}
                        className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition hover:border-[var(--color-primary-border)]"
                    >
                        {isImage(a) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.url} alt={attachmentName(a)} className="h-full w-full object-cover" />
                        ) : (
                            <>
                                <FileGlyph a={a} size={size === 'lg' ? 34 : 24} />
                                <span className="mt-1 line-clamp-2 break-all px-1.5 text-center text-[10px] leading-tight text-gray-600">{attachmentName(a)}</span>
                            </>
                        )}
                    </a>
                    {onRemove && (
                        <button
                            type="button"
                            aria-label={`Remove ${attachmentName(a)}`}
                            onClick={() => onRemove(i)}
                            className="absolute -right-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                            <LuX size={13} />
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}

/** "Add files" as a drop zone: click to pick several, or drop them on it. */
export function AttachmentDrop({ onFiles, uploading, compact }: {
    onFiles: (files: FileList | null) => void;
    uploading?: boolean;
    compact?: boolean;
}) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <>
            <button
                type="button"
                onClick={() => ref.current?.click()}
                disabled={uploading}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
                className={cx(
                    'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 text-sm text-gray-500 transition hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-surface)] disabled:cursor-wait',
                    compact ? 'py-2.5' : 'py-4',
                )}
            >
                {uploading ? <>Uploading…</> : (
                    <>
                        <LuPaperclip size={16} /> Add photos or documents
                        <span className="hidden text-xs text-gray-400 sm:inline">(JPG, PNG, PDF, Word, Excel · up to 10 MB each)</span>
                    </>
                )}
            </button>
            <input
                ref={ref}
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }}
            />
        </>
    );
}
