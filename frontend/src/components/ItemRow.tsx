import { Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import type { Item } from "../lib/db";
import { items } from "../lib/db";
import { formatDate } from "../lib/item-utils";
import { PublishedIcon, ReceivedIcon } from "./ui/Icons";

interface ItemRowProps {
  item: Item;
  onClick: (item: Item) => void;
  selected?: boolean;
  onToggleSelection?: (selected: boolean) => void;
}

export function ItemRow(props: ItemRowProps) {
  const setReadStatus = async (newIsRead: boolean) => {
    try {
      items().update(props.item.id, (draft) => {
        draft.id = props.item.id;
        draft.isRead = newIsRead;
      });
    } catch (e) {
      console.error("Failed to update item status", e);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleCheckboxClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onToggleSelection?.((e.target as HTMLInputElement).checked);
  };

  const handleMouseDown = (e: MouseEvent) => {
    // Middle click is button 1
    if (e.button === 1) {
      // Prevent autoscroll
      e.preventDefault();
      e.stopPropagation();

      if (props.item.url && isValidUrl(props.item.url)) {
        window.open(props.item.url, "_blank", "noopener,noreferrer");

        if (!props.item.isRead) {
          setReadStatus(true);
        }
      }
    }
  };

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    props.onClick(props.item);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      props.onClick(props.item);
    }
  };

  return (
    <div
      class={flex({
        justifyContent: "space-between",
        alignItems: "center",
        border: "1px solid",
        borderColor: "gray.100",
        borderRadius: "md",
        cursor: "pointer",
        width: "full",
        overflow: "hidden",
        _hover: { backgroundColor: "gray.50" },
      })}
    >
      <div class={flex({ alignItems: "center", flex: 1 })}>
        <div class={css({ paddingInline: "3" })}>
          <input
            type="checkbox"
            checked={props.selected}
            onClick={handleCheckboxClick}
            class={css({ cursor: "pointer" })}
          />
        </div>
        <button
          type="button"
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
          class={stack({
            gap: "1",
            flex: 1,
            paddingX: "3",
            paddingY: "1.5",
            textAlign: "left",
            cursor: "pointer",
          })}
        >
          <div
            class={css({
              fontWeight: "medium",
              color: props.item.isRead ? "gray.500" : "blue.600",
              textDecoration: props.item.isRead ? "none" : "underline",
              _hover: { color: "blue.800" },
              lineClamp: 1,
            })}
          >
            {props.item.title || "Untitled Article"}
          </div>
          <Show when={props.item.description}>
            <div
              class={css({
                fontSize: "sm",
                color: "gray.600",
                lineClamp: 1,
                marginTop: "0.5",
              })}
            >
              {props.item.description}
            </div>
          </Show>
          <div
            class={flex({
              gap: { base: "2", xs: "4" },
              alignItems: "center",
              marginTop: "1",
              fontSize: "xs",
              color: "gray.500",
            })}
          >
            <Show when={props.item.publishedAt}>
              {(publishedAt) => (
                <span
                  class={flex({ gap: "1", alignItems: "center" })}
                  title={`Published: ${formatDate(publishedAt())}`}
                >
                  <span
                    class={css({ display: { base: "none", xs: "inline" } })}
                  >
                    Published:
                  </span>
                  <span
                    class={css({ display: { base: "inline", xs: "none" } })}
                    title="Published"
                  >
                    <PublishedIcon />
                    <span
                      class={css({
                        position: "absolute",
                        width: "1px",
                        height: "1px",
                        padding: "0",
                        margin: "-1px",
                        overflow: "hidden",
                        clip: "rect(0, 0, 0, 0)",
                        whiteSpace: "nowrap",
                        borderWidth: "0",
                      })}
                    >
                      Published:
                    </span>
                  </span>
                  {formatDate(publishedAt())}
                </span>
              )}
            </Show>
            <span
              class={flex({ gap: "1", alignItems: "center" })}
              title={`Received: ${formatDate(props.item.createdAt)}`}
            >
              <span class={css({ display: { base: "none", xs: "inline" } })}>
                Received:
              </span>
              <span
                class={css({ display: { base: "inline", xs: "none" } })}
                title="Received"
              >
                <ReceivedIcon />
                <span
                  class={css({
                    position: "absolute",
                    width: "1px",
                    height: "1px",
                    padding: "0",
                    margin: "-1px",
                    overflow: "hidden",
                    clip: "rect(0, 0, 0, 0)",
                    whiteSpace: "nowrap",
                    borderWidth: "0",
                  })}
                >
                  Received:
                </span>
              </span>
              {formatDate(props.item.createdAt)}
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
        </button>
      </div>
    </div>
  );
}
