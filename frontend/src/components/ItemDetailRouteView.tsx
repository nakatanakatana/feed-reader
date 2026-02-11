import { eq, useLiveQuery } from "@tanstack/solid-db";
import { useNavigate } from "@tanstack/solid-router";
import { createMemo } from "solid-js";
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

  const getLinkProps = (targetItemId: string | undefined) => {
    if (!targetItemId) return undefined;
    const to = "/items/$itemId";
    const params = { itemId: targetItemId };
    const search = { tagId: props.tagId, since: props.since };
    return { to, params, search };
  };

  // Use useLiveQuery with items Collection and respect tag filtering.
  // We fetch all items (including read ones) to maintain stable indices during transitions.
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
    if (itemStore.state.showRead) return all;
    // Filter out read items, but:
    // 1. ALWAYS keep the current item so its index remains stable.
    // 2. If we are at the end-of-list, keep the last item from the original list 
    //    so we can navigate back to it.
    const lastItem = all[all.length - 1];
    return all.filter(
      (i) => !i.isRead || i.id === props.itemId || (isEndOfList() && i.id === lastItem?.id),
    );
  });

  const currentIndex = () =>
    props.itemId ? filteredItems().findIndex((i) => i.id === props.itemId) : -1;
  const prevItem = () =>
    currentIndex() > 0 ? filteredItems()[currentIndex() - 1] : undefined;
  const nextItem = () =>
    currentIndex() >= 0 && currentIndex() < filteredItems().length - 1
      ? filteredItems()[currentIndex() + 1]
      : undefined;

  const isEndOfList = () => props.itemId === "end-of-list";

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
    } else if (currentIndex() === filteredItems().length - 1) {
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
      const lastItem = filteredItems()[filteredItems().length - 1];
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
      prevItemId={isEndOfList() ? filteredItems()[filteredItems().length - 1]?.id : prevItem()?.id}
      nextItemId={!isEndOfList() && currentIndex() === filteredItems().length - 1 ? "end-of-list" : nextItem()?.id}
      onPrev={handlePrev}
      onNext={handleNext}
    />
  );
}
