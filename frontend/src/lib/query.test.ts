import { describe, expect, it } from "vitest";
import * as queryLib from "./query";

describe("Query Setup", () => {
	it("should export a configured queryClient", () => {
		expect(queryLib.queryClient).toBeDefined();
	});

	it("should export a configured transport", () => {
		expect(queryLib.transport).toBeDefined();
	});
});
