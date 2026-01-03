import type { Config } from "../config";
import { worker } from "./browser";

export async function initMocks(cfg: Config) {
	if (cfg.useMocks) {
		await worker.start({
			onUnhandledRequest: "bypass",
		});
	}
}
