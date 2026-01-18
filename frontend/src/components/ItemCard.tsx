import { Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import type { Item } from "../gen/feed/v1/feed_pb";

interface ItemCardProps {
  item: Item;
  onClick: (item: Item) => void;
  onMarkRead: (id: string) => void;
}

export function ItemCard(props: ItemCardProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      props.onClick(props.item);
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: Nested buttons
    <div
      role="button"
      tabIndex={0}
      onClick={() => props.onClick(props.item)}
      onKeyDown={handleKeyDown}
      class={stack({
        width: "full",
        textAlign: "left",
        gap: "2",
        padding: "4",
        border: "1px solid",
        borderColor: props.item.isRead ? "gray.200" : "blue.200",
        borderRadius: "md",
        backgroundColor: props.item.isRead ? "white" : "blue.50",
        cursor: "pointer",
        transition: "all 0.2s",
        _hover: { borderColor: "blue.400", shadow: "sm" },
      })}
    >
      <div
        class={flex({
          width: "full",
          justifyContent: "space-between",
          alignItems: "start",
        })}
      >
        <h3
          class={css({
            fontSize: "lg",
            lineHeight: "tight",
            fontWeight: props.item.isRead ? "medium" : "bold",
            color: props.item.isRead ? "gray.700" : "blue.900",
          })}
        >
          {props.item.title}
        </h3>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onMarkRead(props.item.id);
          }}
          disabled={props.item.isRead}
          class={css({
            flexShrink: 0,
            fontSize: "xs",
            color: "blue.600",
            cursor: "pointer",
            _disabled: { color: "gray.400", cursor: "default" },
            _hover: { textDecoration: "underline" },
          })}
        >
          {props.item.isRead ? "Read" : "Mark as read"}
        </button>
      </div>
      <div class={flex({ gap: "4", width: "full" })}>
        <Show when={props.item.imageUrl}>
          <img
            src={props.item.imageUrl}
            alt=""
            class={css({
              width: "24",
              height: "24",
              objectFit: "cover",
              borderRadius: "sm",
              backgroundColor: "gray.100",
            })}
          />
        </Show>
        <div class={stack({ gap: "1", flex: "1" })}>
          <p
            class={css({
              fontSize: "sm",
              color: "gray.600",
              lineClamp: 3,
            })}
          >
            {props.item.description}
          </p>
          <div class={flex({ gap: "2", fontSize: "xs", color: "gray.400" })}>
            <Show when={props.item.author}>
              {(author) => (
                <>
                  <span>{author()}</span>
                  <span>•</span>
                </>
              )}
            </Show>
            <span>
              {props.item.publishedAt
                ? new Date(props.item.publishedAt).toLocaleString()
                : "Unknown date"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
