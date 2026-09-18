'use client';

import React, { useRef, useState } from 'react';
import { FiX, FiUploadCloud, FiFileText, FiCheckCircle, FiAlertTriangle, FiDownload } from 'react-icons/fi';
import { useBulkUploadProductsMutation } from '@/redux/api/productApi';
import { toast } from 'react-hot-toast';

// Columns parsed from the CSV. `images` is pipe-separated (url1|url2|url3).
const COLUMNS = [
    'name', 'price', 'thumbnail', 'category', 'description', 'stock',
    'brand', 'model', 'weight', 'boxSize', 'insideTheBox', 'images',
];

const NUMERIC = new Set(['price', 'stock']);

type ParsedRow = Record<string, any> & { __rowIndex: number; __errors: string[] };

// Minimal RFC-ish CSV line splitter that honours double-quoted fields.
function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
            } else cur += ch;
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            out.push(cur); cur = '';
        } else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
}

export default function BulkUploadModal({ onClose }: { onClose: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState<ParsedRow[]>([]);
    const [parseError, setParseError] = useState('');
    const [result, setResult] = useState<{ created: number; failed: { index: number; error: string }[] } | null>(null);

    const [bulkUpload, { isLoading }] = useBulkUploadProductsMutation();

    const buildRow = (cells: string[], headers: string[], rowIndex: number): ParsedRow => {
        const row: ParsedRow = { __rowIndex: rowIndex, __errors: [] };
        headers.forEach((h, i) => {
            const key = h.trim();
            let val: any = (cells[i] ?? '').trim();
            if (key === 'images') {
                val = val ? String(val).split('|').map((u: string) => u.trim()).filter(Boolean) : [];
            } else if (NUMERIC.has(key)) {
                val = val === '' ? '' : Number(val);
            }
            row[key] = val;
        });
        // Client-side per-row checks (mirror backend rules)
        if (!row.name) row.__errors.push('name is required');
        if (row.price === '' || isNaN(Number(row.price)) || Number(row.price) <= 0) row.__errors.push('price must be positive');
        if (!row.thumbnail) row.__errors.push('thumbnail is required');
        if (!row.category) row.__errors.push('category is required');
        if (!row.description) row.__errors.push('description is required');
        const imgCount = [row.thumbnail, ...(Array.isArray(row.images) ? row.images : [])].filter(Boolean).length;
        if (imgCount < 3) row.__errors.push('at least 3 images required (thumbnail + 2 in images, pipe-separated)');
        return row;
    };

    const handleFile = (file: File) => {
        setResult(null);
        setParseError('');
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result || '');
                const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
                if (lines.length < 2) {
                    setParseError('CSV must have a header row and at least one data row.');
                    setRows([]);
                    return;
                }
                const headers = splitCsvLine(lines[0]).map(h => h.trim());
                const known = headers.filter(h => COLUMNS.includes(h));
                if (known.length === 0) {
                    setParseError(`No recognised columns found. Expected header: ${COLUMNS.join(', ')}`);
                    setRows([]);
                    return;
                }
                const parsed = lines.slice(1).map((line, idx) => buildRow(splitCsvLine(line), headers, idx));
                setRows(parsed);
            } catch (err: any) {
                setParseError('Failed to parse CSV: ' + (err?.message || 'unknown error'));
                setRows([]);
            }
        };
        reader.readAsText(file);
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
    };

    const downloadTemplate = () => {
        const header = COLUMNS.join(',');
        const sample = 'Sample Product,1200,https://img/thumb.jpg,<categoryId>,A great product,50,Acme,AC-100,500 g,30x20x15 cm,1x item|1x manual,https://img/2.jpg|https://img/3.jpg';
        const blob = new Blob([header + '\n' + sample + '\n'], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'product-bulk-template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const validRows = rows.filter(r => r.__errors.length === 0);
    const invalidRows = rows.filter(r => r.__errors.length > 0);

    const handleSubmit = async () => {
        if (validRows.length === 0) {
            toast.error('No valid rows to upload. Fix the highlighted errors first.');
            return;
        }
        const products = validRows.map(({ __rowIndex, __errors, ...rest }) => rest);
        try {
            const res: any = await bulkUpload({ products }).unwrap();
            const data = res?.data || res;
            setResult({ created: data?.created || 0, failed: data?.failed || [] });
            toast.success(`Bulk upload complete: ${data?.created || 0} created`);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Bulk upload failed');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <FiUploadCloud className="text-[#4F46E5]" size={20} />
                        <h2 className="text-lg font-bold text-gray-800">Bulk Upload Products (CSV)</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md text-gray-500"><FiX size={18} /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {!result && (
                        <>
                            {/* Instructions */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-4 text-xs text-indigo-700 space-y-1">
                                <p className="font-bold">Expected columns (header row):</p>
                                <p className="font-mono break-all">{COLUMNS.join(', ')}</p>
                                <p><strong>images</strong> column = pipe-separated URLs (e.g. <span className="font-mono">url2|url3</span>). Thumbnail + images must total at least 3.</p>
                                <p><strong>category</strong> = the category ObjectId.</p>
                                <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-white border border-indigo-200 rounded-md font-bold text-indigo-600 hover:bg-indigo-100">
                                    <FiDownload size={13} /> Download CSV template
                                </button>
                            </div>

                            {/* File picker */}
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-md p-8 text-center cursor-pointer hover:border-[#4F46E5] hover:bg-gray-50 transition-all"
                            >
                                <FiFileText className="mx-auto text-gray-400 mb-2" size={28} />
                                <p className="text-sm font-semibold text-gray-700">{fileName || 'Click to choose a .csv file'}</p>
                                <p className="text-xs text-gray-400 mt-1">Comma-separated, UTF-8</p>
                                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onInputChange} />
                            </div>

                            {parseError && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-600 font-medium flex items-start gap-2">
                                    <FiAlertTriangle className="mt-0.5 shrink-0" /> {parseError}
                                </div>
                            )}

                            {/* Preview */}
                            {rows.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="font-bold text-gray-700">{rows.length} row(s) parsed</span>
                                        <span className="text-green-600 font-bold">{validRows.length} valid</span>
                                        {invalidRows.length > 0 && <span className="text-red-500 font-bold">{invalidRows.length} with errors</span>}
                                    </div>
                                    <div className="border border-gray-100 rounded-md overflow-auto max-h-64">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 font-bold text-gray-500">#</th>
                                                    <th className="px-3 py-2 font-bold text-gray-500">Name</th>
                                                    <th className="px-3 py-2 font-bold text-gray-500">Price</th>
                                                    <th className="px-3 py-2 font-bold text-gray-500">Stock</th>
                                                    <th className="px-3 py-2 font-bold text-gray-500">Images</th>
                                                    <th className="px-3 py-2 font-bold text-gray-500">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {rows.map((r) => {
                                                    const imgCount = [r.thumbnail, ...(Array.isArray(r.images) ? r.images : [])].filter(Boolean).length;
                                                    return (
                                                        <tr key={r.__rowIndex} className={r.__errors.length ? 'bg-red-50/40' : ''}>
                                                            <td className="px-3 py-2 text-gray-400">{r.__rowIndex + 1}</td>
                                                            <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate">{r.name || <span className="text-red-400">—</span>}</td>
                                                            <td className="px-3 py-2 text-gray-700">{r.price === '' ? '—' : r.price}</td>
                                                            <td className="px-3 py-2 text-gray-700">{r.stock === '' ? 0 : r.stock}</td>
                                                            <td className="px-3 py-2 text-gray-700">{imgCount}</td>
                                                            <td className="px-3 py-2">
                                                                {r.__errors.length === 0
                                                                    ? <span className="text-green-600 font-bold">OK</span>
                                                                    : <span className="text-red-500" title={r.__errors.join('; ')}>{r.__errors[0]}{r.__errors.length > 1 ? ` (+${r.__errors.length - 1})` : ''}</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-3">
                                <FiCheckCircle className="text-green-600" size={24} />
                                <div>
                                    <p className="font-bold text-green-700">{result.created} product(s) created</p>
                                    {result.failed.length > 0 && <p className="text-xs text-red-500 font-medium">{result.failed.length} row(s) failed</p>}
                                </div>
                            </div>
                            {result.failed.length > 0 && (
                                <div className="border border-red-100 rounded-md overflow-auto max-h-56">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-red-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 font-bold text-red-500">Row #</th>
                                                <th className="px-3 py-2 font-bold text-red-500">Error</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-50">
                                            {result.failed.map((f, i) => (
                                                <tr key={i}>
                                                    <td className="px-3 py-2 text-gray-600">{f.index + 1}</td>
                                                    <td className="px-3 py-2 text-red-600">{f.error}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    {result ? (
                        <button onClick={onClose} className="px-6 py-2.5 bg-[#4F46E5] text-white rounded-md font-bold hover:bg-[#4338CA] text-sm">Done</button>
                    ) : (
                        <>
                            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-md font-semibold text-gray-600 hover:bg-white text-sm">Cancel</button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || validRows.length === 0}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#4F46E5] text-white rounded-md font-bold hover:bg-[#4338CA] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiUploadCloud size={16} />
                                {isLoading ? 'Uploading...' : `Upload ${validRows.length} product(s)`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
