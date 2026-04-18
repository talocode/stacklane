import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/signin']

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/_next') || path.includes('.')) {
    return NextResponse.next()
  }

  const hasSession = Boolean(request.cookies.get('sl_session')?.value)
  const isPublic = PUBLIC_PATHS.includes(path)

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*'
}
