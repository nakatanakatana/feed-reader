import { Show } from "solid-js";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import type { Item } from "../gen/feed/v1/feed_pb";

interface ItemDetailProps {
  item: Item;
  onClose: () => void;
}

export function ItemDetail(props: ItemDetailProps) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop
    // biome-ignore lint/a11y/noStaticElementInteractions: Backdrop
    <div
      class={css({
        position: "fixed",
        inset: "0",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4",
        zIndex: "100",
      })}
      onClick={props.onClose}
    >
      <div
        role="document"
        class={stack({
          width: "full",
          maxWidth: "3xl",
          maxHeight: "90vh",
          backgroundColor: "white",
          borderRadius: "lg",
          overflow: "hidden", // Prevent outer scrolling
          gap: "0", // Remove gap handled by padding/layout
        })}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div
          class={stack({
            gap: "2",
            padding: "6",
            paddingBottom: "4",
            borderBottom: "1px solid",
            borderColor: "gray.100",
            backgroundColor: "white",
            zIndex: "10",
          })}
        >
          <button
            type="button"
            onClick={props.onClose}
            class={css({
              alignSelf: "flex-end",
              padding: "2",
              cursor: "pointer",
              color: "gray.500",
              _hover: { color: "black" },
            })}
          >
            Close
          </button>
          <h2 class={css({ fontSize: "2xl", fontWeight: "bold" })}>
            <a
              href={props.item.url}
              target="_blank"
              rel="noreferrer"
              class={css({
                _hover: { color: "blue.600", textDecoration: "underline" },
              })}
            >
              {props.item.title}
            </a>
          </h2>
          <div class={css({ fontSize: "sm", color: "gray.500" })}>
            <a
              href={props.item.url}
              target="_blank"
              rel="noreferrer"
              class={css({
                color: "blue.600",
                _hover: { textDecoration: "underline" },
              })}
            >
              Original Article
            </a>
            <Show when={props.item.author}>
              {(author) => <span> • {author()}</span>}
            </Show>
            <Show when={props.item.publishedAt}>
              {(date) => <span> • {new Date(date()).toLocaleString()}</span>}
            </Show>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          class={stack({
            padding: "6",
            paddingTop: "4",
            overflowY: "auto",
            gap: "6",
          })}
        >
          <Show when={props.item.imageUrl}>
            <img
              src={props.item.imageUrl}
              alt=""
              class={css({
                width: "full",
                maxHeight: "xs",
                objectFit: "cover",
                borderRadius: "md",
              })}
            />
          </Show>

          <div
            class={css({
              fontSize: "md",
              lineHeight: "relaxed",
              "& a": { color: "blue.600", textDecoration: "underline" },
              "& img": { maxWidth: "full", height: "auto" },
              "& iframe": { maxWidth: "full", height: "auto" },
            })}
            innerHTML={props.item.content || props.item.description}
          />
        </div>
      </div>
    </div>
  );
}
