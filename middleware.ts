import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ADMIN_APP = process.env.ADMIN_APP === 'true';

export function middleware(request: NextRequest) {
  if (!ADMIN_APP) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/admin';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
