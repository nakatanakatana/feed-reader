import {
  client,
  type ClientInstance,
  type RequestConfig,
  ResponseError,
} from "./.kubb/client";
import { redirectOnUnauthorized } from "./auth-redirect";
import { ApiError } from "./json-client";

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

const setupClientInterceptors = (
  clientInstance: ClientInstance = client,
  onUnauthorized: () => void = redirectOnUnauthorized,
) => {
  clientInstance.interceptors.request.use(async (request) => {
    if (typeof window === "undefined" && request.url.startsWith("/")) {
      return {
        ...request,
        url: `http://localhost${request.url}`,
      };
    }
    return request;
  });

  clientInstance.interceptors.response.use(async (response) => {
    if (response.status === 401) {
      onUnauthorized();
      throw new ApiError("unauthorized", "Unauthorized", 401);
    }
    return response;
  });

  clientInstance.interceptors.error.use(async (error) => {
    if (error instanceof ResponseError && error.status === 401) {
      onUnauthorized();
      throw new ApiError("unauthorized", "Unauthorized", 401);
    }
    if (error instanceof ResponseError) {
      const payload = getApiErrorPayload(error.data);
      throw new ApiError(
        payload?.code ?? "unknown",
        payload?.message ?? "Request failed",
        error.status,
      );
    }
    throw error;
  });
};

setupClientInterceptors(client);

export { ApiError, client, ResponseError, setupClientInterceptors };
export type { ClientInstance, RequestConfig };

export const defaultApiBaseUrl = "/api/v2";
export const defaultOnUnauthorized = redirectOnUnauthorized;

export default client;
