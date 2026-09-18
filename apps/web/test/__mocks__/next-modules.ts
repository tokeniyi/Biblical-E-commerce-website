// Minimal stubs for Next.js framework modules that next-auth eagerly imports.
//
// next-auth (v5 beta and stable) does:
//   import { NextRequest } from "next/server"
//   import { headers } from "next/headers"
//   import { NextResponse } from "next/server"
// Under vitest's native ESM loader and a `next` package with no `exports`
// field, the bare specifiers `next/server`, `next/headers`, `next/navigation`
// fail to resolve (ERR_MODULE_NOT_FOUND). Next only resolves these itself under
// its own bundler, which the vitest Node runner does not use.
//
// The unit tests under apps/web/test never execute request-time Next code, so
// providing no-op implementations is sufficient to let next-auth's config
// module load. Production resolution is unaffected.
class NextRequest {
  nextUrl = { href: "", origin: "", pathname: "" };
  headers = new Headers();
  constructor(_input?: unknown, _init?: any) {}
}

class NextResponse extends Response {
  static next() {
    return new NextResponse(null, { status: 200 });
  }
  static redirect(input: string | URL, init?: ResponseInit) {
    return new NextResponse(null, {
      status: 302,
      headers: { location: String(input) },
      ...init,
    });
  }
  static json(body: unknown, init?: ResponseInit) {
    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json" },
    });
  }
}

function headers() {
  return new Headers();
}

function redirect(_input: string | URL, _init?: any) {
  return new Response(null, { status: 302 });
}

export { NextRequest, NextResponse, headers, redirect };
