import type { Config } from "../config";

export async function initMocks(cfg: Config) {
  if (cfg.useMocks) {
    const { worker } = await import("./browser");
    await worker.start({
      onUnhandledRequest: "bypass",
    });
  }
}
