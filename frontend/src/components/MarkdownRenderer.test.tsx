import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
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

  it("enables raw HTML rendering", () => {
    const content = '<div id="test">Raw HTML</div>**Safe**';
    const container = document.createElement("div");
    document.body.appendChild(container);
    dispose = render(() => <MarkdownRenderer content={content} />, container);

    expect(container.querySelector("#test")).not.toBeNull();
    expect(container.innerHTML).toContain("Raw HTML");
  });

  it("handles empty content", () => {
    dispose = render(() => <MarkdownRenderer content="" />, document.body);
    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("renders code blocks", () => {
    const content = "```javascript\nconst x = 1;\n```";
    dispose = render(
      () => <MarkdownRenderer content={content} />,
      document.body,
    );

    expect(document.body.querySelector("pre")).not.toBeNull();
    expect(document.body.querySelector("code")).not.toBeNull();
    expect(document.body.innerHTML).toContain("const x = 1;");
  });
});
