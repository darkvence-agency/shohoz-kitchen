/**
 * Code 128 barcodes (code set B), drawn as an inline SVG string — no dependencies.
 *
 * Symbol   = Start B (104), one symbol per character (value = char code − 32),
 *            checksum, Stop.
 * Checksum = (104 + Σ position × value) mod 103, positions counted from 1.
 * Each symbol is 6 elements (bar, space, bar, space, bar, space) of width 1–4
 * modules, 11 modules in all; Stop is 7 elements (13 modules, ends on a bar).
 * A quiet zone of at least 10 modules is left on both sides.
 */

/** Element widths for symbol values 0–106 (106 = Stop). */
const PATTERNS: readonly string[] = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0–9
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10–19
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20–29
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30–39
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40–49
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50–59
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60–69
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70–79
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80–89
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90–99
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112',                             // 100–106
];

export const CODE128_PATTERNS = PATTERNS;

const START_B = 104;
const STOP = 106;
export const QUIET_ZONE_MODULES = 10;

/** True when every character can be written in code set B (printable ASCII 32–127). */
export function isCode128BEncodable(value: string): boolean {
    if (!value) return false;
    for (let i = 0; i < value.length; i++) {
        const c = value.charCodeAt(i);
        if (c < 32 || c > 127) return false;
    }
    return true;
}

/**
 * The symbol values for `value`: [Start B, …characters, checksum, Stop].
 * Throws a RangeError for an empty value or a character outside code set B.
 */
export function code128BValues(value: string): number[] {
    if (!isCode128BEncodable(value)) {
        throw new RangeError(`Code 128 B cannot encode ${JSON.stringify(value)}`);
    }
    const values = [START_B];
    let sum = START_B;
    for (let i = 0; i < value.length; i++) {
        const v = value.charCodeAt(i) - 32;
        values.push(v);
        sum += v * (i + 1);
    }
    values.push(sum % 103, STOP);
    return values;
}

/**
 * The barcode as a string of modules, '1' = bar, '0' = space, including the quiet
 * zones on both sides (default 10 modules each).
 */
export function code128BModules(value: string, quietZone = QUIET_ZONE_MODULES): string {
    const quiet = '0'.repeat(Math.max(QUIET_ZONE_MODULES, quietZone));
    let out = quiet;
    for (const v of code128BValues(value)) {
        const widths = PATTERNS[v];
        for (let i = 0; i < widths.length; i++) {
            out += (i % 2 === 0 ? '1' : '0').repeat(Number(widths[i]));
        }
    }
    return out + quiet;
}

/**
 * An inline SVG of the barcode. It is drawn in module units and stretched to the
 * given CSS width/height (`preserveAspectRatio="none"`), so it fills its box;
 * keep the box wide enough for ~0.25 mm or more per module when printing.
 */
export function code128Svg(value: string, opts: { width?: string; height?: string; quietZone?: number; color?: string } = {}): string {
    const modules = code128BModules(value, opts.quietZone);
    const h = 100;
    let rects = '';
    for (let i = 0; i < modules.length;) {
        if (modules[i] !== '1') { i++; continue; }
        let j = i;
        while (j < modules.length && modules[j] === '1') j++;
        rects += `<rect x="${i}" y="0" width="${j - i}" height="${h}"/>`;
        i = j;
    }
    const width = opts.width || '100%';
    const height = opts.height || '100%';
    const color = opts.color || '#000';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules.length} ${h}" width="${width}" height="${height}" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="Barcode"><g fill="${color}">${rects}</g></svg>`;
}
