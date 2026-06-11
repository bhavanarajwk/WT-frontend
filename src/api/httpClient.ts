import { ApiError, parseApiErrorMessage } from "@/api/error";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ResponseType = "json" | "text" | "blob" | "raw";

export interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export interface QueryParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ApiRequestOptions {
  method?: HttpMethod;
  query?: QueryParams;
  body?: BodyInit | null;
  contentType?: string;
  headers?: HeadersInit;
  token?: string;
  withCredentials?: boolean;
  responseType?: ResponseType;
  skipAuth?: boolean;
}

type RequestInterceptor = (
  url: string,
  init: RequestInit
) => Promise<{ url: string; init: RequestInit }> | { url: string; init: RequestInit };

type ResponseInterceptor = (
  response: Response,
  request: { url: string; init: RequestInit }
) => Promise<Response> | Response;

type ErrorInterceptor = (error: unknown) => Promise<unknown> | unknown;

interface ApiClientConfig {
  baseUrl: string;
}

export function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Browser API base URL. In production always use same-origin /api/v1 (Vercel BFF)
 * so OAuth cookies stay on the frontend domain — never Render directly.
 */
export function resolveClientApiBaseUrl(): string {
  const configured = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  return configured;
}

const DEFAULT_BASE_URL = resolveClientApiBaseUrl();

export class HttpClient {
  private readonly baseUrl: string;
  private authTokenGetter?: () => string | null | undefined;
  private onUnauthorized?: () => void;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
  }

  setAuthTokenGetter(getter: () => string | null | undefined) {
    this.authTokenGetter = getter;
  }

  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler;
  }

  useRequest(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  useResponse(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  useError(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor);
  }

  async request<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const {
      method = "GET",
      query,
      body = null,
      contentType,
      headers: rawHeaders,
      token,
      withCredentials = true,
      responseType = "json",
      skipAuth = false,
    } = options;

    const url = this.buildUrl(path, query);
    const headers = new Headers(rawHeaders);
    const derivedToken = skipAuth
      ? null
      : token?.trim() || this.authTokenGetter?.()?.trim() || null;

    if (contentType) headers.set("Content-Type", contentType);
    if (derivedToken) headers.set("Authorization", `Bearer ${derivedToken}`);

    let request = {
      url,
      init: {
        method,
        headers,
        body,
        credentials: withCredentials ? "include" : "same-origin",
      } as RequestInit,
    };

    for (const interceptor of this.requestInterceptors) {
      request = await interceptor(request.url, request.init);
    }

    try {
      let response = await fetch(request.url, request.init);
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response, request);
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.onUnauthorized?.();
        }

        const payload = await this.tryReadBody(response);
        throw new ApiError(
          parseApiErrorMessage(
            payload,
            `Request failed: ${response.status} ${response.statusText}`
          ),
          response.status,
          payload
        );
      }

      return (await this.readBody<T>(response, responseType)) as T;
    } catch (error) {
      let nextError: unknown = error;
      for (const interceptor of this.errorInterceptors) {
        nextError = await interceptor(nextError);
      }
      throw nextError;
    }
  }

  get<T = unknown>(path: string, options: Omit<ApiRequestOptions, "method"> = {}) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T = unknown>(path: string, options: Omit<ApiRequestOptions, "method"> = {}) {
    return this.request<T>(path, { ...options, method: "POST" });
  }

  put<T = unknown>(path: string, options: Omit<ApiRequestOptions, "method"> = {}) {
    return this.request<T>(path, { ...options, method: "PUT" });
  }

  patch<T = unknown>(path: string, options: Omit<ApiRequestOptions, "method"> = {}) {
    return this.request<T>(path, { ...options, method: "PATCH" });
  }

  delete<T = unknown>(path: string, options: Omit<ApiRequestOptions, "method"> = {}) {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  private buildUrl(path: string, query?: QueryParams) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = this.baseUrl
      ? new URL(`${this.baseUrl}${normalizedPath}`)
      : new URL(
          normalizedPath,
          typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
        );
    if (!query) return url.toString();

    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });

    return url.toString();
  }

  private async readBody<T>(response: Response, responseType: ResponseType): Promise<T | null> {
    if (responseType === "raw") return response as T;
    if (responseType === "blob") return (await response.blob()) as T;
    if (responseType === "text") return (await response.text()) as T;

    const text = await response.text();
    if (!text.trim()) return null;

    if (!this.looksLikeJsonBody(response.headers.get("content-type"), text)) {
      return null;
    }

    return JSON.parse(text) as T;
  }

  private looksLikeJsonBody(contentType: string | null, text: string): boolean {
    const trimmed = text.trimStart();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return true;
    const type = (contentType ?? "").toLowerCase();
    return type.includes("application/json") || type.includes("+json");
  }

  private async tryReadBody(response: Response): Promise<unknown> {
    try {
      const text = await response.text();
      if (!text.trim()) return null;
      if (this.looksLikeJsonBody(response.headers.get("content-type"), text)) {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
      return text;
    } catch {
      return null;
    }
  }
}

export const apiClient = new HttpClient({ baseUrl: DEFAULT_BASE_URL });

apiClient.setUnauthorizedHandler(() => {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
});
