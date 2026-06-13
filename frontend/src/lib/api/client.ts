import { createApiClient } from "./json-client";

export const apiClient = createApiClient({ baseUrl: "/api/v2" });
