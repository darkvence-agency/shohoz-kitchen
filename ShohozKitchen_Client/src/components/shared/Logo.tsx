import React from 'react';

/**
 * The Shohoz Kitchen logo:  a brand-coloured disc holding a lidded pot with steam,
 * next to a two-tone "Shohoz Kitchen" wordmark.
 *
 * Drawn as inline SVG rather than loaded as an image so it stays crisp at every
 * size, picks up the site font, and can recolour itself for dark backgrounds.
 * The same artwork is available as static files for favicons / OG images:
 * `/logo.svg` (full lockup) and `/logo-mark.svg` (disc only).
 */

const BRAND = 'var(--color-primary)';
const INK = '#202020';

/** The disc + pot, on its own 48×48 grid. */
const Mark = () => (
    <>
        <circle cx="24" cy="24" r="24" fill={BRAND} />
        {/* steam — two thin curls */}
        <g fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity=".95">
            <path d="M20.2 16.1c-1.5-1.1-1.5-2.6 0-3.7s1.5-2.6 0-3.7" />
            <path d="M27.8 16.1c-1.5-1.1-1.5-2.6 0-3.7s1.5-2.6 0-3.7" />
        </g>
        {/* knob */}
        <rect x="22.4" y="17.6" width="3.2" height="2.2" rx="1.1" fill="#ffffff" />
        {/* lid — overhangs the body, so it reads as lid + handles in one shape */}
        <rect x="12" y="20.4" width="24" height="3.2" rx="1.6" fill="#ffffff" />
        {/* body — tapered, softly rounded base */}
        <path d="M14.8 24.7h18.4l-1.35 9.1a3.4 3.4 0 0 1-3.36 2.9h-9a3.4 3.4 0 0 1-3.36-2.9z" fill="#ffffff" />
    </>
);

/** Lockup geometry — mark is 48 wide, wordmark starts at 56, total 232. */
const LOCKUP_W = 232;

interface LogoProps {
    /** Logo height in px. */
    size?: number;
    /** On a dark background — the wordmark switches to white. */
    light?: boolean;
    /** Explicit white rounded chip behind the logo. */
    boxed?: boolean;
    /** Kept for API compatibility. */
    showTagline?: boolean;
    /** Render just the disc, without the wordmark. */
    iconOnly?: boolean;
    className?: string;
}

const Logo: React.FC<LogoProps> = ({
    size = 40,
    light = false,
    boxed = false,
    iconOnly = false,
    className,
}) => {
    const wordFill = light ? '#ffffff' : INK;
    const kitchenFill = light ? '#ffffff' : BRAND;

    const svg = iconOnly ? (
        <svg
            viewBox="0 0 48 48"
            height={size}
            width={size}
            role="img"
            aria-label="Shohoz Kitchen"
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
        >
            <Mark />
        </svg>
    ) : (
        <svg
            viewBox={`0 0 ${LOCKUP_W} 48`}
            height={size}
            width={size * (LOCKUP_W / 48)}
            role="img"
            aria-label="Shohoz Kitchen"
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
        >
            <Mark />
            <text
                x="56"
                y="31.5"
                fontFamily="Poppins, 'Segoe UI', Arial, Helvetica, sans-serif"
                fontSize="23"
                fontWeight={700}
                letterSpacing="-0.4"
            >
                <tspan fill={wordFill}>Shohoz</tspan>
                <tspan fill={kitchenFill}> Kitchen</tspan>
            </text>
        </svg>
    );

    if (boxed) {
        return (
            <span
                className={className}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: '#fff',
                    borderRadius: 10,
                    padding: '6px 10px',
                }}
            >
                {svg}
            </span>
        );
    }

    return (
        <span className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {svg}
        </span>
    );
};

/** Compact brand mark — the disc only, for tight spaces. */
export const LogoMark: React.FC<{ size?: number; light?: boolean; className?: string }> = (props) => (
    <Logo {...props} iconOnly />
);

export default Logo;
