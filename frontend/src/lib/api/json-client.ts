export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchLike = typeof fetch;

interface ApiClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
  onUnauthorized?: () => void;
}

interface RequestOptions {
  signal?: AbortSignal;
}

const joinUrl = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

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

export const createApiClient = (options: ApiClientOptions) => {
  const fetchImpl = options.fetch ?? fetch;

  const request = async <T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown,
    requestOptions?: RequestOptions,
  ): Promise<T> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    let requestBody: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }

    const response = await fetchImpl(joinUrl(options.baseUrl, path), {
      method,
      headers,
      signal: requestOptions?.signal,
      ...(requestBody !== undefined ? { body: requestBody } : {}),
    });

    if (response.status === 401) {
      options.onUnauthorized?.();
      throw new ApiError("unauthorized", "Unauthorized", 401);
    }

    const json = await parseJson<T>(response);

    if (!response.ok) {
      const error = getApiErrorPayload(json);
      throw new ApiError(
        error?.code ?? "unknown",
        error?.message ?? "Request failed",
        response.status,
      );
    }

    return json;
  };

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>("GET", path, undefined, options),
    post: <T>(path: string, body: unknown, options?: RequestOptions) =>
      request<T>("POST", path, body, options),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>("DELETE", path, undefined, options),
  };
};
