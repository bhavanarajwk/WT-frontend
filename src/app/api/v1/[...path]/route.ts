import { NextRequest, NextResponse } from "next/server";
import { buildUpstreamAuthHeaders, getBackendBaseUrl } from "@/lib/serverApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const backendUrl = `${getBackendBaseUrl()}/api/v1/${pathSegments.join("/")}${request.nextUrl.search}`;
  const headers = buildUpstreamAuthHeaders(request);

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const upstream = await fetch(backendUrl, init);
  // Buffer body so Node fetch decompresses gzip; piping upstream.body with
  // content-encoding stripped corrupts JSON on the browser.
  const body = await upstream.arrayBuffer();
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
