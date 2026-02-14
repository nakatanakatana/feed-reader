import { useQuery } from "@tanstack/solid-query";
import { createSignal, For, type JSX, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { listItemFeeds } from "../lib/item-db";
import { formatDate } from "../lib/item-utils";

interface ItemFeedsTooltipProps {
  itemId: string;
  children: JSX.Element;
}

export function ItemFeedsTooltip(props: ItemFeedsTooltipProps) {
  const [isVisible, setIsVisible] = createSignal(false);

  const feedsQuery = useQuery(() => ({
    queryKey: ["itemFeeds", props.itemId],
    queryFn: () => listItemFeeds(props.itemId),
    enabled: isVisible(),
  }));

  return (
    <div
      class={css({ position: "relative", display: "inline-block" })}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocusIn={() => setIsVisible(true)}
      onFocusOut={() => setIsVisible(false)}
    >
      {props.children}
      <Show when={isVisible()}>
        <div
          class={css({
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            mb: "2",
            p: "3",
            bg: "white",
            border: "1px solid",
            borderColor: "gray.200",
            borderRadius: "md",
            boxShadow: "lg",
            zIndex: 100,
            minWidth: "250px",
            fontSize: "xs",
            color: "gray.700",
            pointerEvents: "none",
          })}
        >
          <Show when={feedsQuery.isPending}>
            <div class={css({ textAlign: "center", py: "2" })}>Loading...</div>
          </Show>
          <Show when={feedsQuery.data}>
            {(feeds) => (
              <div class={flex({ flexDirection: "column", gap: "2" })}>
                <For each={feeds()}>
                  {(feed) => (
                    <div
                      class={css({
                        borderBottom: "1px solid",
                        borderColor: "gray.100",
                        pb: "1",
                        _last: { borderBottom: "none", pb: "0" },
                      })}
                    >
                      <div class={css({ fontWeight: "bold", mb: "1" })}>
                        {feed.feedTitle}
                      </div>
                      <div
                        class={flex({ justifyContent: "space-between", gap: "2" })}
                      >
                        <span class={css({ color: "gray.500" })}>Published:</span>
                        <span>{formatDate(feed.publishedAt)}</span>
                      </div>
                      <div
                        class={flex({ justifyContent: "space-between", gap: "2" })}
                      >
                        <span class={css({ color: "gray.500" })}>Received:</span>
                        <span>{formatDate(feed.createdAt)}</span>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            )}
          </Show>
          <Show when={feedsQuery.isError}>
            <div class={css({ color: "red.500", textAlign: "center", py: "2" })}>
              Error loading feed details
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
