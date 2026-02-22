import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { ItemRow } from "./ItemRow";

describe("ItemRow Overflow", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("should not cause horizontal overflow on narrow screens with long domains", async () => {
    await page.viewport(375, 667);

    // Use a long string WITHOUT hyphens to prevent wrapping at hyphens
    const longUrl = "https://verylongsubdomainnamethatisquitelongindeedandshouldcauseoverflowwithoutanyspacesorhyphenswhatsoever.com/article";
    
    // Create a mock item with a long URL and dates
    const mockItem = {
      id: "1",
      title: "Test Article",
      url: longUrl,
      // Use explicit dates that will be formatted
      publishedAt: "2026-01-21T10:00:00Z",
      createdAt: "2026-01-20T10:00:00Z",
      description: "Desc",
      isRead: false,
      feedId: "feed-1",
    };

    dispose = render(() => (
      <div style={{ width: "100%", overflow: "hidden" }}>
        <ItemRow item={mockItem} onClick={() => {}} />
      </div>
    ), document.body);

    // Wait for render
    await expect.element(page.getByText("Test Article")).toBeInTheDocument();

    // Find the metadata row via hostname
    const hostname = "verylongsubdomainnamethatisquitelongindeedandshouldcauseoverflowwithoutanyspacesorhyphenswhatsoever.com";
    const hostnameSpan = page.getByText(hostname);
    
    // Structure: 
    // MetadataRow (div) > SourceSpan (span) > HostnameSpan (span)
    // So we need: HostnameSpan -> parent -> parent
    
    // Use locator chaining
    const sourceSpan = hostnameSpan.locator("xpath=..");
    const metadataRow = sourceSpan.locator("xpath=..");
    
    const scrollWidth = await metadataRow.element().scrollWidth;
    const clientWidth = await metadataRow.element().clientWidth;
    const bodyScrollWidth = document.body.scrollWidth;

    console.log(`MetadataRow: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    console.log(`Body: scrollWidth=${bodyScrollWidth}`);
    
    // Expectation for CORRECT behavior:
    // The metadata row should wrap, so its width should not exceed the viewport width significantly.
    // (Allowing for some margin/padding difference, but definitely NOT 904px).
    // The clientWidth should be constrained by the parent (approx 300px).
    // The scrollWidth should be equal to clientWidth if it wraps correctly.
    
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });
});
