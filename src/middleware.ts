import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostHeader = request.headers.get('host') || '';
  const xForwardedHost = request.headers.get('x-forwarded-host') || '';
  const hostname = url.hostname || '';

  const isWww =
    hostname.includes('www') ||
    hostHeader.includes('www') ||
    xForwardedHost.includes('www');

  if (isWww && url.pathname === '/') {
    url.pathname = '/about';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
