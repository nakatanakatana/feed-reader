import { expect, test, vi } from "vitest";
import { initPWA } from "./pwa";

// Mock virtual:pwa-register
vi.mock("virtual:pwa-register", () => ({
  registerSW: vi.fn(),
}));

test("Service Worker registration is called", async () => {
  const { registerSW } = await import("virtual:pwa-register");

  initPWA();

  expect(registerSW).toHaveBeenCalledWith({ immediate: true });
});
