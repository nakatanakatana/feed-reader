import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient } from "@tanstack/solid-query";

export const transport = createConnectTransport({
	baseUrl: "/",
});

export const queryClient = new QueryClient();
