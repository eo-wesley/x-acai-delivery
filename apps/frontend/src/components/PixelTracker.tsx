'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useTenant, getApiBase } from '../hooks/useTenant';

/**
 * PixelTracker — Componente para injeção automática de pixels de marketing.
 * Facebook Pixel, Google Analytics (G4) e TikTok Pixel.
 */
export default function PixelTracker() {
    const { slug, ready } = useTenant();
    const pathname = usePathname();
    const [config, setConfig] = useState<{
        facebook_pixel_id?: string;
        google_analytics_id?: string;
        tiktok_pixel_id?: string;
    } | null>(null);

    // Ignorar admin e driver
    const isExcluded = pathname?.startsWith('/admin') || pathname?.startsWith('/driver');

    useEffect(() => {
        if (!ready || isExcluded) return;

        const loadConfig = async () => {
            try {
                const API = getApiBase();
                const res = await fetch(`${API}/api/${slug}/store`);
                if (res.ok) {
                    const data = await res.json();
                    setConfig({
                        facebook_pixel_id: data.facebook_pixel_id,
                        google_analytics_id: data.google_analytics_id,
                        tiktok_pixel_id: data.tiktok_pixel_id,
                    });
                }
            } catch (err) {
                console.error('[PixelTracker] Falha ao carregar configuração de pixels', err);
            }
        };

        loadConfig();
    }, [slug, ready, isExcluded]);

    // Track page views on route changes (SPA navigation)
    useEffect(() => {
        if (!config || isExcluded || typeof window === 'undefined') return;

        // Facebook
        if ((window as any).fbq) {
            // Prevent double firing on initial load if script just injected
            // fbq handles dedup reasonably well but we call it anyway
            (window as any).fbq('track', 'PageView');
        }

        // Google Analytics
        if ((window as any).gtag && config.google_analytics_id) {
            (window as any).gtag('config', config.google_analytics_id, {
                page_path: pathname,
            });
        }

        // TikTok
        if ((window as any).ttq) {
            (window as any).ttq.page();
        }
    }, [pathname, config, isExcluded]);

    if (!config || isExcluded) return null;

    return (
        <>
            {/* Facebook Pixel */}
            {config.facebook_pixel_id && (
                <>
                    <Script id="fb-pixel" strategy="afterInteractive">
                        {`
                            !function(f,b,e,v,n,t,s)
                            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                            n.queue=[];t=b.createElement(e);t.async=!0;
                            t.src=v;s=b.getElementsByTagName(e)[0];
                            s.parentNode.insertBefore(t,s)}(window, document,'script',
                            'https://connect.facebook.net/en_US/fbevents.js');
                            fbq('init', '${config.facebook_pixel_id}');
                            fbq('track', 'PageView');
                        `}
                    </Script>
                    <noscript>
                        <img
                            height="1"
                            width="1"
                            style={{ display: 'none' }}
                            src={`https://www.facebook.com/tr?id=${config.facebook_pixel_id}&ev=PageView&noscript=1`}
                        />
                    </noscript>
                </>
            )}

            {/* Google Analytics (G4) */}
            {config.google_analytics_id && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${config.google_analytics_id}`}
                        strategy="afterInteractive"
                    />
                    <Script id="google-analytics" strategy="afterInteractive">
                        {`
                            window.dataLayer = window.dataLayer || [];
                            function gtag(){dataLayer.push(arguments);}
                            gtag('js', new Date());
                            gtag('config', '${config.google_analytics_id}');
                        `}
                    </Script>
                </>
            )}

            {/* TikTok Pixel */}
            {config.tiktok_pixel_id && (
                <Script id="tiktok-pixel" strategy="afterInteractive">
                    {`
                        !function (w, d, t) {
                            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","detach","update","setRealtime","setReferrer","setUtm","setAdsPath"],ttq.setVars=function(e,t){for(var n in t)e[n]=t[n]};ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setVars(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.lib;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=d.createElement("script");a.type="text/javascript",a.async=!0,a.src=r+"?sdkid="+e+"&lib="+t;var i=d.getElementsByTagName("script")[0];i.parentNode.insertBefore(a,i)};
                            ttq.load('${config.tiktok_pixel_id}');
                            ttq.page();
                        }(window, document, 'ttq');
                    `}
                </Script>
            )}
        </>
    );
}
