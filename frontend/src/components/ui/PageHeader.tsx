import type { JSX } from "solid-js";
import { css } from "../../../styled-system/css";
import { flex, stack } from "../../../styled-system/patterns";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: JSX.Element;
}

export function PageHeader(props: PageHeaderProps) {
  return (
    <div
      class={flex({ justifyContent: "space-between", alignItems: "center" })}
    >
      <div class={stack({ gap: "1" })}>
        <h1 class={css({ fontSize: "2xl", fontWeight: "bold" })}>
          {props.title}
        </h1>
        {props.description ? (
          <p class={css({ fontSize: "sm", color: "gray.600" })}>
            {props.description}
          </p>
        ) : null}
      </div>
      {props.actions}
    </div>
  );
}
