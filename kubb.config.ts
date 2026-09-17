import { defineConfig } from "kubb/config";
import { pluginFetch } from "@kubb/plugin-fetch";
import { pluginMsw } from "@kubb/plugin-msw";
import { pluginTs } from "@kubb/plugin-ts";

export default defineConfig({
  root: ".",
  input: "./api/openapi.yaml",
  output: {
    path: "./frontend/src/lib/api",
    clean: false,
    barrel: false,
  },
  plugins: [
    pluginTs({
      output: {
        path: "./types-generated.ts",
        barrel: false,
      },
    }),
    pluginFetch({
      output: { path: "./generated/client", barrel: false },
      baseURL: "/api/v2",
      returnType: "data",
    }),
    pluginMsw({
      output: { path: "../../mocks/generated", barrel: false },
      handlers: true,
      baseURL: "*/api/v2",
      parser: "data",
    }),
  ],
});
