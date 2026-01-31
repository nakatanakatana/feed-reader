import { css } from "../../../styled-system/css";
import { center, stack } from "../../../styled-system/patterns";

interface LoadingStateProps {
  label: string;
}

export function LoadingState(props: LoadingStateProps) {
  return (
    <div class={center({ padding: "10" })}>
      <div class={stack({ gap: "3", alignItems: "center" })}>
        <div
          class={css({
            width: "8",
            height: "8",
            border: "4px solid",
            borderColor: "blue.100",
            borderTopColor: "blue.600",
            borderRadius: "full",
            animation: "spin 1s linear infinite",
          })}
        />
        <div class={css({ color: "gray.600", fontSize: "sm" })}>
          {props.label}
        </div>
      </div>
    </div>
  );
}
