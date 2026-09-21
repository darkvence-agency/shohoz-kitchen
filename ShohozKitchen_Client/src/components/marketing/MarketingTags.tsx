"use client";

/**
 * Loads Google Tag Manager, GA4, Meta Pixel and TikTok Pixel on the storefront —
 * each only when its ID is set under Digital marketing — and tells them about
 * client-side page changes, which a single-page app does not do on its own.
 *
 * Mounted in the storefront layout only, so admin and dashboard pages are never
 * tracked. IDs are re-checked here even though the server already validated them:
 * they are written into inline scripts, so nothing but an exact ID may get through.
 */
import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { cleanMarketingIds, trackPageView, type MarketingIds } from '@/lib/marketing';

export default function MarketingTags({ ids: raw }: { ids: MarketingIds }) {
    const ids = cleanMarketingIds(raw);
    const { gtmId, ga4Id, metaPixelId, tiktokPixelId } = ids;

    // Each tracker counts the first page when it loads; only later client-side
    // navigations need to be reported here.
    const pathname = usePathname();
    const first = useRef(true);
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        trackPageView(pathname);
    }, [pathname]);

    return (
        <>
            {gtmId && (
                <>
                    <Script id="gtm" strategy="afterInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');
`}</Script>
                    <noscript>
                        <iframe src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
                    </noscript>
                </>
            )}

            {ga4Id && (
                <>
                    <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
                    <Script id="ga4" strategy="afterInteractive">{`
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');
`}</Script>
                </>
            )}

            {metaPixelId && (
                <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${metaPixelId}');fbq('track','PageView');
`}</Script>
            )}

            {tiktokPixelId && (
                <Script id="tiktok-pixel" strategy="afterInteractive">{`
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${tiktokPixelId}');ttq.page();}(window,document,'ttq');
`}</Script>
            )}
        </>
    );
}
