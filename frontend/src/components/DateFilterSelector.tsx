import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";

export type DateFilterValue = "all" | "24h" | "7d" | "30d";

interface DateFilterSelectorProps {
  value: DateFilterValue;
  onSelect: (value: DateFilterValue) => void;
}

export function DateFilterSelector(props: DateFilterSelectorProps) {
  return (
    <div class={flex({ gap: "2", alignItems: "center" })}>
      <label
        for="date-filter-select"
        class={css({
          fontSize: "sm",
          color: "gray.600",
          fontWeight: "medium",
        })}
      >
        Date:
      </label>
      <select
        id="date-filter-select"
        value={props.value}
        onChange={(e) => props.onSelect(e.currentTarget.value as DateFilterValue)}
        class={css({
          padding: "1",
          paddingInline: "2",
          fontSize: "sm",
          border: "1px solid",
          borderColor: "gray.300",
          borderRadius: "md",
          backgroundColor: "white",
          cursor: "pointer",
          _focus: {
            outline: "none",
            borderColor: "blue.500",
            boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)",
          },
        })}
      >
        <option value="all">All Time</option>
        <option value="24h">Past 24 Hours</option>
        <option value="7d">Past 7 Days</option>
        <option value="30d">Past 30 Days</option>
      </select>
    </div>
  );
}
