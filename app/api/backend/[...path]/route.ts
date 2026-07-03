import { NextRequest } from "next/server";

function buildBackendCandidates() {
  const configured = [
    process.env.BACKEND_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://127.0.0.1:8010",
    "http://localhost:8010",
  ].filter(Boolean) as string[];

  return Array.from(new Set(configured.map((value) => value.replace(/\/+$/, ""))));
}

const backendCandidates = buildBackendCandidates();

export const dynamic = "force-dynamic";

async function proxyRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const targetPath = params.path.join("/");
  const method = request.method.toUpperCase();

  if (
    !targetPath.startsWith("api/") ||
    params.path.some((segment) => segment === ".." || segment.includes("\\"))
  ) {
    return Response.json({ detail: "Backend route is not available." }, { status: 404 });
  }

  if (method !== "OPTIONS" && !request.headers.get("authorization")?.startsWith("Bearer ")) {
    return Response.json({ detail: "Authentication is required for this request." }, { status: 401 });
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  let lastNetworkError: unknown = null;
  let lastServerResponse: Response | null = null;
  let lastServerBaseUrl: string | null = null;

  for (const backendBaseUrl of backendCandidates) {
    const targetUrl = new URL(`${backendBaseUrl}/${targetPath}`);
    targetUrl.search = request.nextUrl.search;

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method,
        headers,
        body,
      });
    } catch (error) {
      lastNetworkError = error;
      continue;
    }

    if (response.status >= 500 && backendCandidates.length > 1) {
      lastServerResponse = response;
      lastServerBaseUrl = backendBaseUrl;
      continue;
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.set("x-wattwise-backend", backendBaseUrl);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }

  if (lastServerResponse && lastServerBaseUrl) {
    const responseHeaders = new Headers(lastServerResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.set("x-wattwise-backend", lastServerBaseUrl);

    return new Response(lastServerResponse.body, {
      status: lastServerResponse.status,
      statusText: lastServerResponse.statusText,
      headers: responseHeaders,
    });
  }

  const message =
    lastNetworkError instanceof Error
      ? lastNetworkError.message
      : "Unable to reach the backend service.";

  return Response.json(
    {
      detail: `Proxy could not reach any backend candidate (${backendCandidates.join(", ")}): ${message}`,
    },
    { status: 502 }
  );
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
