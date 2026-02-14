import type { JSX } from "solid-js";
import { stack } from "../../../styled-system/patterns";

interface PageLayoutProps {
  children: JSX.Element;
}

export function PageLayout(props: PageLayoutProps) {
  return (
    <div
      class={stack({
        padding: { base: "2", md: "4" },
        gap: { base: "2", md: "6" },
        height: "calc(100vh - 56px)",
        minHeight: 0,
        overflow: "hidden",
        backgroundColor: "gray.50",
      })}
    >
      {props.children}
    </div>
  );
}
