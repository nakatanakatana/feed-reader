import { registerSW } from "virtual:pwa-register";

export function initPWA() {
  registerSW({ immediate: true });
}
