'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTenant, getApiBase } from '../hooks/useTenant';

export default function TrackingScripts() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { slug, ready } = useTenant();
    const [store, setStore] = useState<any>(null);

    // Fetch store info
    useEffect(() => {
        if (!ready) return;
        fetch(`${getApiBase()}/api/${slug}/store`)
            .then(res => res.json())
            .then(data => setStore(data))
            .catch(() => {});
    }, [slug, ready]);

    // Trigger PageView on route change
    useEffect(() => {
        if (!store) return;
        
        const url = pathname + searchParams.toString();
        
        // Push Facebook PageView Event
        if (store.facebook_pixel_id && typeof window !== 'undefined' && (window as any).fbq) {
            (window as any).fbq('track', 'PageView');
        }

        // Push Google Analytics PageView Event
        if (store.google_analytics_id && typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('config', store.google_analytics_id, {
                page_path: url,
            });
        }
        
        // Push TikTok PageView Event
        if (store.tiktok_pixel_id && typeof window !== 'undefined' && (window as any).ttq) {
            (window as any).ttq.page();
        }
    }, [pathname, searchParams, store]);

    if (!store) return null;

    return (
        <>
            {/* Facebook Pixel */}
            {store.facebook_pixel_id && (
                <Script
                    id="fb-pixel"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
                            !function(f,b,e,v,n,t,s)
                            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                            n.queue=[];t=b.createElement(e);t.async=!0;
                            t.src=v;s=b.getElementsByTagName(e)[0];
                            s.parentNode.insertBefore(t,s)}(window, document,'script',
                            'https://connect.facebook.net/en_US/fbevents.js');
                            fbq('init', '${store.facebook_pixel_id}');
                            fbq('track', 'PageView');
                        `,
                    }}
                />
            )}

            {/* Google Analytics gtag.js */}
            {store.google_analytics_id && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${store.google_analytics_id}`}
                        strategy="afterInteractive"
                    />
                    <Script
                        id="google-analytics"
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${store.google_analytics_id}', {
                                    page_path: window.location.pathname,
                                });
                            `,
                        }}
                    />
                </>
            )}

            {/* TikTok Pixel */}
            {store.tiktok_pixel_id && (
                <Script
                    id="tiktok-pixel"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
                            !function (w, d, t) {
                            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                            ttq.load('${store.tiktok_pixel_id}');
                            ttq.page();
                            }(window, document, 'ttq');
                        `,
                    }}
                />
            )}
        </>
    );
}
