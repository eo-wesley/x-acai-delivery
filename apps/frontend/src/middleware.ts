import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — Slug-based Subdomain Routing
 *
 * When running behind Nginx with wildcard subdomain routing,
 * Nginx passes the tenant slug via the `X-Tenant-Slug` header.
 * This middleware reads it and exposes it as a cookie so that
 * client-side code and server components can access it easily.
 *
 * For local development: use ?slug=xxx query param as fallback.
 */
export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Read slug from Nginx header (production) or query param (dev)
    const slugFromHeader = request.headers.get('x-tenant-slug');
    const slugFromQuery = request.nextUrl.searchParams.get('slug');
    const isDemoPath = request.nextUrl.pathname.startsWith('/demo');

    let slug = slugFromHeader || slugFromQuery;

    // Auto-force demo slug if accessing demo route
    if (isDemoPath) {
        slug = 'demo';
    }

    if (slug) {
        // Set cookie so client can read it without additional API call
        response.cookies.set('tenant_slug', slug, {
            httpOnly: false,        // Client JS needs to read this
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24,  // 24 hours
        });

        // Also forward as a header for server components
        response.headers.set('x-tenant-slug', slug);
    }

    return response;
}

export const config = {
    // Apply to all pages except Next.js internals and static files
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
