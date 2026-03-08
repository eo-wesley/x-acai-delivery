'use client';

import { useEffect, useState } from 'react';

/**
 * useTenant — resolves the current restaurant slug
 *
 * Priority order:
 * 1. Cookie set by Next.js middleware (from Nginx X-Tenant-Slug header, in production)
 * 2. localStorage (saved when user switches tenant in admin or from URL param)
 * 3. URL query param ?slug=xxx (dev/testing fallback)
 * 4. 'default' (fallback for local dev)
 */
export function useTenant() {
    const [slug, setSlug] = useState<string>('default');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // 1. Try cookie (set by middleware.ts from Nginx X-Tenant-Slug)
        const cookies = document.cookie.split(';').map(c => c.trim());
        const slugCookie = cookies.find(c => c.startsWith('tenant_slug='));
        if (slugCookie) {
            const val = slugCookie.split('=')[1];
            if (val && val !== 'undefined') {
                setSlug(val);
                setReady(true);
                return;
            }
        }

        // 2. Try localStorage (admin panel tenant switch)
        const savedSlug = localStorage.getItem('admin_slug');
        if (savedSlug && savedSlug !== 'undefined') {
            setSlug(savedSlug);
            setReady(true);
            return;
        }

        // 3. Try URL query param ?slug=xxx
        const params = new URLSearchParams(window.location.search);
        const urlSlug = params.get('slug');
        if (urlSlug) {
            setSlug(urlSlug);
            setReady(true);
            return;
        }

        // 4. Fallback to 'default'
        setSlug('default');
        setReady(true);
    }, []);

    return { slug, ready };
}

/**
 * getApiBase — returns the backend API base URL
 */
export function getApiBase(): string {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}
