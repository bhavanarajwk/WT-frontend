import { apiClient } from "@/src/api/httpClient";

export type HttpMethod = "GET" | "POST" | "PUT";

export interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: HttpMethod;
    token?: string;
    body?: BodyInit | null;
    contentType?: string;
  } = {}
): Promise<ApiEnvelope<T>> {
  const { method = "GET", token, body, contentType } = options;
  return apiClient.request<ApiEnvelope<T>>(path, {
    method,
    token,
    body: body ?? null,
    contentType,
  });
}
