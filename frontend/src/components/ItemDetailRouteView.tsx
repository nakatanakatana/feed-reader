import { eq, useLiveQuery } from "@tanstack/solid-db";
import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createMemo } from "solid-js";
import { feedTag, type Item, items } from "../lib/db";
import { getPrefetchIds, prefetchItems } from "../lib/item-prefetch";
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

  createEffect(() => {
    const idx = currentIndexMemo();
    const all = filteredItems();
    if (idx >= 0 && all && all.length > 0) {
      const ids = getPrefetchIds(idx, all);
      prefetchItems(ids);
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

  const itemsQuery = useLiveQuery((q) => {
    let query = q
      .from({ item: items() })
      .orderBy(({ item }) => item.publishedAt, {
        direction: "asc",
        nulls: "last",
      })
      .orderBy(({ item }) => item.createdAt, "asc");
    if (props.tagId) {
      query = query
        .innerJoin(
          { ft: feedTag },
          // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
          ({ item, ft }: any) => eq(item.feedId, ft.feedId),
        )
        // biome-ignore lint/suspicious/noExplicitAny: TanStack DB where types
        .where(({ ft }: any) => eq(ft.tagId, props.tagId));
    }
    // biome-ignore lint/suspicious/noExplicitAny: TanStack DB select types
    return query.select(({ item }: any) => ({ ...item }));
  });

  const filteredItems = createMemo(() => {
    const all = itemsQuery();
    if (!all) return [];
    return all as Item[];
  });

  const currentIndexMemo = createMemo(() => {
    const items = filteredItems();
    if (!items || items.length === 0 || !props.itemId) return -1;
    return items.findIndex((i) => i.id === props.itemId);
  });

  const prevItem = () => {
    const items = filteredItems();
    const index = currentIndexMemo();
    return items && index > 0 ? items[index - 1] : undefined;
  };

  const nextItem = () => {
    const items = filteredItems();
    const index = currentIndexMemo();
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
          replace: true,
        });
      }
    } else {
      const items = filteredItems();
      const index = currentIndexMemo();
      if (items && items.length > 0 && index === items.length - 1) {
        // Transition to virtual end-of-list state
        const linkProps = getLinkProps("end-of-list");
        if (linkProps) {
          navigate({
            to: linkProps.to,
            // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
            params: linkProps.params as any,
            search: linkProps.search,
            replace: true,
          });
        }
      }
    }
  };

  const handlePrev = () => {
    markCurrentAsRead();
    if (isEndOfList()) {
      const items = filteredItems();
      const lastItem =
        items && items.length > 0 ? items[items.length - 1] : undefined;
      if (lastItem) {
        const linkProps = getLinkProps(lastItem.id);
        if (linkProps) {
          navigate({
            to: linkProps.to,
            // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
            params: linkProps.params as any,
            search: linkProps.search,
            replace: true,
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
          replace: true,
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
    if (
      !isEndOfList() &&
      items &&
      items.length > 0 &&
      currentIndexMemo() === items.length - 1
    ) {
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
          replace: true,
        });
      }}
      prevItemId={prevItemIdMemo()}
      nextItemId={nextItemIdMemo()}
      onPrev={handlePrev}
      onNext={handleNext}
    />
  );
}
