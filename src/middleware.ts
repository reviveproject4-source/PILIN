import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  if (host.includes('www.pilin.id') && pathname === '/') {
    return NextResponse.rewrite(new URL('/about', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
