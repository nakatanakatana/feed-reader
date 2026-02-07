import { useLiveQuery } from "@tanstack/solid-db";
import { useMutation } from "@tanstack/solid-query";
import { useNavigate } from "@tanstack/solid-router";
import { createMemo, createSignal } from "solid-js";
import { items, updateItemStatus } from "../lib/db";
import { type DateFilterValue, getPublishedSince } from "../lib/item-utils";
import { ItemDetailModal } from "./ItemDetailModal";

interface ItemDetailRouteViewProps {
  itemId: string | undefined;
  tagId?: string;
  since?: DateFilterValue;
}

export function ItemDetailRouteView(props: ItemDetailRouteViewProps) {
  const navigate = useNavigate();
  const updateStatusMutation = useMutation(() => ({
    mutationFn: updateItemStatus,
  }));
  const [isWaitingForNextPage, setIsWaitingForNextPage] = createSignal(false);

  const getLinkProps = (targetItemId: string | undefined) => {
    if (!targetItemId) return undefined;
    const to = "/items/$itemId";
    const params = { itemId: targetItemId };
    return { to, params };
  };

  const effectiveSince = () => props.since ?? (props.tagId ? undefined : "30d");

  // Use useLiveQuery with items Collection
  const itemsQuery = useLiveQuery((q) => {
    let query = q.from({ item: items });

    // Filter by date
    const since = effectiveSince();
    if (since && since !== "all") {
      const sinceDate = getPublishedSince(since);
      if (sinceDate) {
        const sinceStr = new Date(
          Number(sinceDate.seconds) * 1000,
        ).toISOString();
        query = query.where(({ item }) => item.createdAt >= sinceStr);
      }
    }

    // Filter by read status (only show unread)
    query = query.where(({ item }) => !item.isRead);

    return query.select(({ item }) => item);
  });

  const allItems = () => itemsQuery();

  const currentIndex = () =>
    props.itemId ? allItems().findIndex((i) => i.id === props.itemId) : -1;
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
      if (linkProps) {
        navigate({
          to: linkProps.to,
          // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
          params: linkProps.params as any,
        });
      }
    }
  };

  const handlePrev = () => {
    markCurrentAsRead();
    const prev = prevItem();
    if (prev) {
      const linkProps = getLinkProps(prev.id);
      if (linkProps) {
        navigate({
          to: linkProps.to,
          // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
          params: linkProps.params as any,
        });
      }
    }
  };

  const markCurrentAsRead = () => {
    if (!props.itemId) return;
    updateStatusMutation.mutate({
      ids: [props.itemId],
      isRead: true,
    });
  };

  return (
    <ItemDetailModal
      itemId={props.itemId}
      onClose={() => {
        navigate({
          to: "/",
        });
      }}
      prevItemId={prevItem()?.id}
      nextItemId={nextItem()?.id}
      onPrev={handlePrev}
      onNext={handleNext}
    />
  );
}
