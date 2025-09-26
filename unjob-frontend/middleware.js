import { NextResponse } from 'next/server';
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Get the pathname from the request
    const { pathname } = req.nextUrl;
    
    // Handle admin routes first - before any NextAuth token checks
    if (pathname.startsWith("/admin") && pathname !== "/admin-login") {
      const adminCookie = req.cookies.get('admin-token');
      if (!adminCookie) {
        // console.log(`[Middleware] No admin cookie found, redirecting to admin-login`);
        return NextResponse.redirect(new URL('/admin-login', req.url));
      }
    }
    
    // Check if user has completed onboarding
    // Boolean conversion to make sure we have a proper boolean value
    const isCompleted = req.nextauth?.token?.isCompleted === true;
    const userId = req.nextauth?.token?.userId;
    const userRole = req.nextauth?.token?.role;
    
    // Check if the user is on special pages
    const isOnboardingPage = pathname === '/onboarding';
    
    // Debug info for all requests with full token details
    // console.log(`[Middleware] Path: ${pathname}, UserId: ${userId || 'unknown'}, Role: ${userRole}, isCompleted: ${isCompleted}`);
    // console.log('[Middleware] Full Token:', JSON.stringify(req.nextauth?.token || {}));
    
    // Public routes that don't require redirects
    const isPublicPath = pathname === '/' ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname.includes('/images/') ||
      pathname.includes('/company/') ||
      pathname === '/privacy-policy' ||
      pathname === '/terms-of-services' ||
      pathname === '/contact-us' ||
      pathname === '/refund-policy';
    
    // Allow API routes without onboarding check
    if (pathname.startsWith('/api/')) {
      // console.log('[Middleware] API route - allowing through');
      return NextResponse.next();
    }
    
    // Admin routes need cookie-based authentication
    if (pathname.startsWith('/admin')) {
      // console.log('[Middleware] Admin route - checking admin cookie');
      const adminCookie = req.cookies.get('admin-token');
      
      if (!adminCookie && pathname !== '/admin-login') {
        // console.log('[Middleware] No admin token, redirecting to admin login');
        return NextResponse.redirect(new URL('/admin-login', req.url));
      }
      
      // console.log('[Middleware] Admin authenticated - allowing through');
      return NextResponse.next();
    }
    
    // If profile is not completed and not on onboarding page, redirect to onboarding
    if (!isCompleted && !isOnboardingPage && !isPublicPath) {
      // console.log(`[Middleware] Redirecting to onboarding - User ${userId} profile not completed`);
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // If profile is completed and on onboarding page, redirect to dashboard
    if (isCompleted && isOnboardingPage) {
      // console.log(`[Middleware] Redirecting to dashboard - User ${userId} profile already completed`);
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    // For all other cases, continue
    // console.log(`[Middleware] Continuing to ${pathname} - No redirection needed`);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect API routes
        if (req.nextUrl.pathname.startsWith("/api/")) {
          // Allow auth routes
          if (req.nextUrl.pathname.startsWith("/api/auth/")) {
            return true;
          }
          // Allow admin login/logout APIs
          if (
            req.nextUrl.pathname.startsWith("/api/admin/login") ||
            req.nextUrl.pathname.startsWith("/api/admin/logout")
          ) {
            return true
          }
          // Allow admin posts API (uses cookie-based auth)
          if (req.nextUrl.pathname.startsWith("/api/admin/posts")) {
            return true
          }
          // Allow read-only public APIs (same-origin only)
          if (
            req.method === "GET" &&
            (
              req.nextUrl.pathname === "/api/gigs" ||
              req.nextUrl.pathname.startsWith("/api/gigs/") ||
              req.nextUrl.pathname === "/api/dashboard/gigs" ||
              req.nextUrl.pathname.startsWith("/api/profile/") 
              )
          ) {
            const originHeader = req.headers.get("origin")
            const refererHeader = req.headers.get("referer")
            const siteOrigin = req.nextUrl.origin
            const isSameOrigin =
              !originHeader || originHeader === siteOrigin ||
              (refererHeader && refererHeader.startsWith(siteOrigin))
            return isSameOrigin
          }
          // Require authentication for other API routes
          return !!token;
        }

        // Protect dashboard routes
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token
        }

        // Protect onboarding routes
        if (req.nextUrl.pathname === "/onboarding") {
          return !!token;
        }

        // Admin routes: handled in main middleware function
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return true; // Let main middleware handle admin auth
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*", "/onboarding", "/admin/:path*"],
}
