import { eq, useLiveQuery } from "@tanstack/solid-db";
import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createMemo } from "solid-js";
import { feedTag, items } from "../lib/db";
import { itemStore } from "../lib/item-store";
import type { DateFilterValue } from "../lib/item-utils";
import { ItemDetailModal } from "./ItemDetailModal";

interface ItemDetailRouteViewProps {
  itemId: string | undefined;
  tagId?: string;
  since?: DateFilterValue;
}

export function ItemDetailRouteView(props: ItemDetailRouteViewProps) {
  const navigate = useNavigate();

  createEffect(() => {
    if (props.since) {
      itemStore.setDateFilter(props.since);
    }
  });

  const getLinkProps = (targetItemId: string | undefined) => {
    if (!targetItemId) return undefined;
    const to = "/items/$itemId";
    const params = { itemId: targetItemId };
    const search = { tagId: props.tagId, since: props.since };
    return { to, params, search };
  };

  const isEndOfList = () => props.itemId === "end-of-list";

  // Use useLiveQuery with the items Collection and respect tag filtering.
  // items() applies the global showRead filter; items that become read remain
  // in the local collection so indices stay stable during navigation transitions.
  const itemsQuery = useLiveQuery((q) => {
    let query = q.from({ item: items() });
    if (props.tagId) {
      query = query
        .innerJoin({ ft: feedTag }, ({ item, ft }) =>
          eq(item.feedId, ft.feedId),
        )
        .where(({ ft }) => eq(ft.tagId, props.tagId));
    }
    return query.select(({ item }) => ({ ...item }));
  });

  const filteredItems = createMemo(() => {
    const all = itemsQuery();
    if (!all) return [];
    if (itemStore.state.showRead) return all;
    // Filter out read items, but:
    // 1. ALWAYS keep the current item so its index remains stable.
    // 2. If we are at the end-of-list, keep the last item from the original list
    //    so we can navigate back to it.
    const lastItem = all[all.length - 1];
    return all.filter(
      (i) =>
        !i.isRead ||
        i.id === props.itemId ||
        (isEndOfList() && i.id === lastItem?.id),
    );
  });

  const currentIndex = () => {
    const items = filteredItems();
    if (!items) return -1;
    return props.itemId ? items.findIndex((i) => i.id === props.itemId) : -1;
  };

  const prevItem = () => {
    const items = filteredItems();
    const index = currentIndex();
    return items && index > 0 ? items[index - 1] : undefined;
  };

  const nextItem = () => {
    const items = filteredItems();
    const index = currentIndex();
    return items && index >= 0 && index < items.length - 1
      ? items[index + 1]
      : undefined;
  };

  const handleNext = () => {
    markCurrentAsRead();
    if (isEndOfList()) return;

    const next = nextItem();
    if (next) {
      const linkProps = getLinkProps(next.id);
      if (linkProps) {
        navigate({
          to: linkProps.to,
          // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
          params: linkProps.params as any,
          search: linkProps.search,
        });
      }
    } else if (currentIndex() === (filteredItems()?.length ?? 0) - 1) {
      // Transition to virtual end-of-list state
      const linkProps = getLinkProps("end-of-list");
      if (linkProps) {
        navigate({
          to: linkProps.to,
          // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
          params: linkProps.params as any,
          search: linkProps.search,
        });
      }
    }
  };

  const handlePrev = () => {
    markCurrentAsRead();
    if (isEndOfList()) {
      const items = filteredItems();
      const lastItem = items ? items[items.length - 1] : undefined;
      if (lastItem) {
        const linkProps = getLinkProps(lastItem.id);
        if (linkProps) {
          navigate({
            to: linkProps.to,
            // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
            params: linkProps.params as any,
            search: linkProps.search,
          });
        }
      }
      return;
    }

    const prev = prevItem();
    if (prev) {
      const linkProps = getLinkProps(prev.id);
      if (linkProps) {
        navigate({
          to: linkProps.to,
          // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
          params: linkProps.params as any,
          search: linkProps.search,
        });
      }
    }
  };

  const markCurrentAsRead = () => {
    if (!props.itemId || isEndOfList()) return;
    items().update(props.itemId, (draft) => {
      draft.isRead = true;
    });
  };

  const prevItemIdMemo = createMemo(() => {
    if (isEndOfList()) {
      const items = filteredItems();
      return items && items.length > 0
        ? items[items.length - 1]?.id
        : undefined;
    }
    return prevItem()?.id;
  });

  const nextItemIdMemo = createMemo(() => {
    const items = filteredItems();
    if (!isEndOfList() && items && currentIndex() === items.length - 1) {
      return "end-of-list";
    }
    return nextItem()?.id;
  });

  return (
    <ItemDetailModal
      itemId={props.itemId}
      onClose={() => {
        navigate({
          to: "/",
          search: {
            tagId: props.tagId,
            since: props.since,
          },
        });
      }}
      prevItemId={prevItemIdMemo()}
      nextItemId={nextItemIdMemo()}
      onPrev={handlePrev}
      onNext={handleNext}
    />
  );
}
