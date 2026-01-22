import { Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import type { Item } from "../gen/item/v1/item_pb";
import { useUpdateItemStatus } from "../lib/item-query";

interface ItemRowProps {
  item: Item;
}

export function ItemRow(props: ItemRowProps) {
  const updateStatus = useUpdateItemStatus();

  const handleToggleRead = (e: MouseEvent) => {
    e.stopPropagation();
    updateStatus.mutate({
      ids: [props.item.id],
      isRead: !props.item.isRead,
    });
  };

  return (
    <li
      class={flex({
        justifyContent: "space-between",
        alignItems: "center",
        padding: "3",
        border: "1px solid",
        borderColor: "gray.100",
        borderRadius: "md",
        _hover: { backgroundColor: "gray.50" },
      })}
    >
      <div class={stack({ gap: "1", flex: 1 })}>
        <a
          href={props.item.url}
          target="_blank"
          rel="noopener noreferrer"
          class={css({
            fontWeight: "medium",
            color: props.item.isRead ? "gray.500" : "blue.600",
            textDecoration: props.item.isRead ? "none" : "underline",
            _hover: { color: "blue.800" },
          })}
        >
          {props.item.title || "Untitled Article"}
        </a>
        <div class={flex({ gap: "2", alignItems: "center" })}>
          <span class={css({ fontSize: "xs", color: "gray.500" })}>
            {props.item.publishedAt}
          </span>
          <Show when={props.item.isRead}>
            <span
              class={css({
                fontSize: "xs",
                color: "gray.400",
                backgroundColor: "gray.100",
                paddingInline: "1.5",
                borderRadius: "sm",
              })}
            >
              Read
            </span>
          </Show>
        </div>
      </div>
      <button
        type="button"
        onClick={handleToggleRead}
        disabled={updateStatus.isPending}
        class={css({
          fontSize: "xs",
          padding: "2",
          paddingInline: "3",
          borderRadius: "md",
          cursor: "pointer",
          border: "1px solid",
          borderColor: "gray.200",
          backgroundColor: "white",
          minWidth: "100px",
          display: "flex",
          justifyContent: "center",
          _hover: { backgroundColor: "gray.50" },
          _disabled: { opacity: 0.5, cursor: "not-allowed" },
        })}
      >
        {props.item.isRead ? "Mark as Unread" : "Mark as Read"}
      </button>
    </li>
  );
}
