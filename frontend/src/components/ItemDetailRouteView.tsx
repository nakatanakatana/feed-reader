import { Link, useNavigate } from "@tanstack/solid-router";
import { createEffect, createSignal, on } from "solid-js";
import { css } from "../../styled-system/css";
import { useItems, useUpdateItemStatus } from "../lib/item-query";
import { ItemDetailModal } from "./ItemDetailModal";

interface ItemDetailRouteViewProps {
  itemId: string;
  feedId?: string;
  tagId?: string;
}

export function ItemDetailRouteView(props: ItemDetailRouteViewProps) {
  const navigate = useNavigate();
  const updateStatusMutation = useUpdateItemStatus();
  const [isWaitingForNextPage, setIsWaitingForNextPage] = createSignal(false);

  const itemsQuery = useItems({
    feedId: props.feedId,
    tagId: props.tagId,
  });

  const allItems = () =>
    itemsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  // Auto-navigate when next page is loaded
  createEffect(() => {
    const data = itemsQuery.data;
    if (isWaitingForNextPage() && data) {
      const items = data.pages.flatMap((p) => p.items);
      const index = items.findIndex((i) => i.id === props.itemId);
      if (index !== -1 && index < items.length - 1) {
        setIsWaitingForNextPage(false);
        const targetItem = items[index + 1];
        const linkProps = getLinkProps(targetItem.id);
        navigate({
          to: linkProps.to,
          params: linkProps.params,
          search: linkProps.search,
        });
      }
    }
  });

  const currentIndex = () => allItems().findIndex((i) => i.id === props.itemId);
  const prevItem = () =>
    currentIndex() > 0 ? allItems()[currentIndex() - 1] : undefined;
  const nextItem = () =>
    currentIndex() >= 0 && currentIndex() < allItems().length - 1
      ? allItems()[currentIndex() + 1]
      : undefined;

  const handleNext = () => {
    markCurrentAsRead();
    const next = nextItem();
    if (next) {
      const linkProps = getLinkProps(next.id);
      navigate({
        to: linkProps.to,
        params: linkProps.params,
        search: linkProps.search,
      });
    } else if (itemsQuery.hasNextPage) {
      setIsWaitingForNextPage(true);
      itemsQuery.fetchNextPage();
    }
  };

  const markCurrentAsRead = () => {
    updateStatusMutation.mutate({
      ids: [props.itemId],
      isRead: true,
    });
  };

  const navButtonStyle = css({
    display: "inline-flex",
    alignItems: "center",
    padding: "2",
    paddingInline: "4",
    borderRadius: "md",
    border: "1px solid",
    borderColor: "gray.300",
    backgroundColor: "white",
    cursor: "pointer",
    fontSize: "sm",
    textDecoration: "none",
    color: "inherit",
    _hover: { backgroundColor: "gray.100" },
    _disabled: { opacity: 0.5, cursor: "not-allowed" },
  });

  const getLinkProps = (targetItemId: string | undefined) => {
    const to = props.feedId ? "/feeds/$feedId/items/$itemId" : "/items/$itemId";
    // biome-ignore lint/style/noNonNullAssertion: router param fix
    // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
    const params = { feedId: props.feedId!, itemId: targetItemId } as any;
    // biome-ignore lint/suspicious/noExplicitAny: router search fix
    const search = ((prev: any) => ({ ...prev })) as any;
    return { to, params, search };
  };

  const getCloseLinkProps = () => {
    // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
    const to = (props.feedId ? "/feeds/$feedId" : "/") as any;
    // biome-ignore lint/style/noNonNullAssertion: router param fix
    // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
    const params = { feedId: props.feedId! } as any;
    // biome-ignore lint/suspicious/noExplicitAny: router search fix
    const search = ((prev: any) => ({ ...prev })) as any;
    return { to, params, search };
  };

  return (
    <ItemDetailModal
      itemId={props.itemId}
      onClose={() => {}} // Not strictly used when using Link but kept for props
      prevItemId={prevItem()?.id}
      nextItemId={nextItem()?.id}
      // Override footer buttons with Links
      footerExtras={
        <>
          <div class={css({ display: "flex", gap: "2" })}>
            {prevItem() ? (
              <Link
                {...getLinkProps(prevItem()?.id)}
                onClick={markCurrentAsRead}
                class={navButtonStyle}
              >
                ← Previous
              </Link>
            ) : (
              <button type="button" disabled class={navButtonStyle}>
                ← Previous
              </button>
            )}
            {nextItem() ? (
              <Link
                {...getLinkProps(nextItem()?.id)}
                onClick={handleNext}
                class={navButtonStyle}
              >
                Next →
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!itemsQuery.hasNextPage}
                class={navButtonStyle}
              >
                Next →
              </button>
            )}
          </div>

          <div class={css({ display: "flex", gap: "4", alignItems: "center" })}>
            <button
              type="button"
              onClick={() =>
                updateStatusMutation.mutate({
                  ids: [props.itemId],
                  isRead: !itemsQuery.data?.pages
                    .flatMap((p) => p.items)
                    .find((i) => i.id === props.itemId)?.isRead,
                })
              }
              disabled={updateStatusMutation.isPending}
              class={css({
                padding: "2",
                paddingInline: "4",
                borderRadius: "md",
                backgroundColor: itemsQuery.data?.pages
                  .flatMap((p) => p.items)
                  .find((i) => i.id === props.itemId)?.isRead
                  ? "gray.200"
                  : "blue.50",
                color: itemsQuery.data?.pages
                  .flatMap((p) => p.items)
                  .find((i) => i.id === props.itemId)?.isRead
                  ? "gray.700"
                  : "blue.700",
                cursor: "pointer",
                fontSize: "sm",
                fontWeight: "medium",
                _hover: { opacity: 0.8 },
                _disabled: { opacity: 0.5, cursor: "not-allowed" },
              })}
            >
              {itemsQuery.data?.pages
                .flatMap((p) => p.items)
                .find((i) => i.id === props.itemId)?.isRead
                ? "Mark as Unread"
                : "Mark as Read"}
            </button>

            <Link
              {...getCloseLinkProps()}
              class={css({
                fontSize: "sm",
                color: "gray.500",
                cursor: "pointer",
                _hover: { color: "gray.700" },
              })}
            >
              Close
            </Link>
          </div>
        </>
      }
    />
  );
}
