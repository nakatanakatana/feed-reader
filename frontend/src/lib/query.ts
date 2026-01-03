import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient } from "@tanstack/solid-query";

export const transport = createConnectTransport({
  baseUrl: "http://localhost:8080",
});

export const queryClient = new QueryClient();
