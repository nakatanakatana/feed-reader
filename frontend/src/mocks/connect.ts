import type { ServiceType, MessageType } from "@bufbuild/protobuf";
import { HttpResponse, type HttpHandler, http } from "msw";

export const mockConnectWeb =
  <T extends ServiceType>(service: T) =>
  <U extends keyof T["methods"]>(props: {
    method: U;
    // data: T["methods"][U]["O"] extends MessageType<infer O> ? O : never;
    handler: (
      req: T["methods"][U]["I"] extends MessageType<infer I> ? I : never,
    ) => T["methods"][U]["O"] extends MessageType<infer O> ? O : never;
  }): HttpHandler => {
    return http.all(
      `*/${service.typeName}/${service.methods[props.method]?.name}`,
      async ({ request }) => {
        // biome-ignore lint/suspicious/noExplicitAny: ignore
        const resp = props.handler((await request.json()) as any);
        return HttpResponse.json(resp);
      },
    );
  };
