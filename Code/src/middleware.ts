import { NextRequest, NextResponse } from 'next/server';

// Routes that are always accessible (no auth needed)
const PUBLIC_PREFIXES = ['/api/auth', '/login', '/admin/login', '/_next', '/favicon', '/admin/assets'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
