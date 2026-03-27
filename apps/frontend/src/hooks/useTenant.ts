'use client';

import { useEffect, useState } from 'react';

function isValidSlug(value: string | null | undefined): value is string {
    return Boolean(value && value !== 'undefined' && value !== 'null');
}

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    const match = cookies.find(cookie => cookie.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

interface ReadTenantSlugOptions {
    includeAdminFallback?: boolean;
    preferredSlug?: string | null;
}

export function readTenantSlugFromBrowser(options: ReadTenantSlugOptions = {}): string {
    const { includeAdminFallback = false, preferredSlug } = options;

    if (isValidSlug(preferredSlug)) {
        return preferredSlug;
    }

    const cookieSlug = readCookie('tenant_slug');
    if (isValidSlug(cookieSlug)) {
        return cookieSlug;
    }

    if (typeof window === 'undefined') {
        return 'default';
    }

    const urlSlug = new URLSearchParams(window.location.search).get('slug');
    if (isValidSlug(urlSlug)) {
        return urlSlug;
    }

    const storedTenantSlug = window.localStorage.getItem('tenant_slug');
    if (isValidSlug(storedTenantSlug)) {
        return storedTenantSlug;
    }

    if (includeAdminFallback) {
        const adminSlug = window.localStorage.getItem('admin_slug');
        if (isValidSlug(adminSlug)) {
            return adminSlug;
        }
    }

    return 'default';
}

/**
 * useTenant — resolves the current restaurant slug
 *
 * Priority order:
 * 1. Cookie set by Next.js middleware (from Nginx X-Tenant-Slug header, in production)
 * 2. URL query param ?slug=xxx (dev/testing fallback)
 * 3. localStorage `tenant_slug` (persisted customer storefront context)
 * 4. 'default' (fallback for local dev)
 */
export function useTenant() {
    const [slug, setSlug] = useState<string>('default');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const resolvedSlug = readTenantSlugFromBrowser();

        setSlug(resolvedSlug);
        setReady(true);

        try {
            if (resolvedSlug !== 'default') {
                localStorage.setItem('tenant_slug', resolvedSlug);
            }
        } catch {
            // Ignore storage errors in private browsing or restricted contexts.
        }
    }, []);

    return { slug, ready };
}

/**
 * getApiBase — returns the backend API base URL
 */
export function getApiBase(): string {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}
