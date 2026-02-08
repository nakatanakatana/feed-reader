import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { MarkdownRenderer } from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("renders basic markdown", () => {
    const content = "# Hello World\nThis is **bold** text.";
    dispose = render(
      () => <MarkdownRenderer content={content} />,
      document.body,
    );

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("renders links correctly", () => {
    const content = "[Example](https://example.com)";
    dispose = render(
      () => <MarkdownRenderer content={content} />,
      document.body,
    );

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("disables raw HTML rendering (XSS protection)", () => {
    const content = '<script>alert("xss")</script>**Safe**';
    const container = document.createElement("div");
    document.body.appendChild(container);
    dispose = render(() => <MarkdownRenderer content={content} />, container);

    // script tag should be escaped/not rendered as an element INSIDE the container
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("handles empty content", () => {
    dispose = render(() => <MarkdownRenderer content="" />, document.body);
    expect(document.body.innerHTML).toMatchSnapshot();
  });
});
