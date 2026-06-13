import { createApiClient } from "./json-client";
import { redirectOnUnauthorized } from "./auth-redirect";

export const apiClient = createApiClient({
  baseUrl: "/api/v2",
  onUnauthorized: redirectOnUnauthorized,
});
