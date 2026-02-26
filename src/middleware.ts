import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1')

  if (!isLocal && request.nextUrl.pathname.startsWith('/admin')) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
