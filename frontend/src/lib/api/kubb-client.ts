import { ApiError } from "./json-client";
import { redirectOnUnauthorized } from "./auth-redirect";

export { ApiError };

export type RequestConfig<TData = unknown> = {
  baseURL?: string;
  url?: string;
  method?: "GET" | "PUT" | "PATCH" | "POST" | "DELETE" | "OPTIONS" | "HEAD";
  params?: unknown;
  data?: TData;
  signal?: AbortSignal;
  headers?: Record<string, string> | [string, string][];
};

export type ResponseConfig<TData = unknown> = {
  data: TData;
  status: number;
  statusText: string;
};

export type ResponseErrorConfig<TError = unknown> = TError;

export type ClientOptions = {
  fetch?: typeof fetch;
  onUnauthorized?: () => void;
};

export type Client = <TData, _TError = unknown, TVariables = unknown>(
  config: RequestConfig<TVariables>,
  options?: ClientOptions,
) => Promise<ResponseConfig<TData>>;

export const defaultApiBaseUrl = "/api/v2";
export const defaultOnUnauthorized = redirectOnUnauthorized;

const joinUrl = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  if (path.startsWith(normalizedBase)) {
    return path;
  }
  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) {
    // oxlint-disable-next-line typescript/consistent-type-assertions
    return undefined as T;
  }
  return JSON.parse(text);
};

const getApiErrorPayload = (
  value: unknown,
): { code?: string; message?: string } | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const codeValue = Reflect.get(value, "code");
  const messageValue = Reflect.get(value, "message");
  return {
    code: typeof codeValue === "string" ? codeValue : undefined,
    message: typeof messageValue === "string" ? messageValue : undefined,
  };
};

const normalizeHeaders = (
  headers?: Record<string, string> | [string, string][],
): Record<string, string> => {
  if (!headers) return {};
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const appendQueryParams = (path: string, params: unknown): string => {
  if (!isRecord(params)) return path;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, value === null ? "null" : String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
};

const client = async <TData, _TError = unknown, TVariables = unknown>(
  config: RequestConfig<TVariables>,
  options?: ClientOptions,
): Promise<ResponseConfig<TData>> => {
  const fetchImpl = options?.fetch ?? fetch;
  const onUnauthorized = options?.onUnauthorized ?? defaultOnUnauthorized;
  const baseUrl = config.baseURL ?? defaultApiBaseUrl;
  const path = appendQueryParams(config.url ?? "", config.params);
  const url = joinUrl(baseUrl, path);
  const method = config.method ?? "GET";

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...normalizeHeaders(config.headers),
  };

  let requestBody: string | undefined;
  if (config.data !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(config.data);
  }

  const response = await fetchImpl(url, {
    method,
    headers,
    signal: config.signal,
    ...(requestBody !== undefined ? { body: requestBody } : {}),
  });

  if (response.status === 401) {
    onUnauthorized();
    throw new ApiError("unauthorized", "Unauthorized", 401);
  }

  const data = await parseJson<unknown>(response);

  if (!response.ok) {
    const error = getApiErrorPayload(data);
    throw new ApiError(
      error?.code ?? "unknown",
      error?.message ?? "Request failed",
      response.status,
    );
  }

  return {
    // oxlint-disable-next-line typescript/consistent-type-assertions
    data: data as TData,
    status: response.status,
    statusText: response.statusText,
  };
};

export default client satisfies Client;
