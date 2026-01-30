import MarkdownIt from "markdown-it";
import { createMemo } from "solid-js";

interface MarkdownRendererProps {
  content: string;
}

const md = new MarkdownIt({
  html: false, // Disable raw HTML for security
  linkify: true, // Automatically convert URL-like text to links
});

export const MarkdownRenderer = (props: MarkdownRendererProps) => {
  const renderedContent = createMemo(() => {
    if (!props.content) return "";
    return md.render(props.content);
  });

  return (
    // eslint-disable-next-line solid/no-innerhtml
    <div innerHTML={renderedContent()} />
  );
};
