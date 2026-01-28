import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createSignal } from "solid-js";
import { useItems, useUpdateItemStatus } from "../lib/item-query";
import { ItemDetailModal } from "./ItemDetailModal";

interface ItemDetailRouteViewProps {
  itemId: string | undefined;
  feedId?: string;
  tagId?: string;
}

export function ItemDetailRouteView(props: ItemDetailRouteViewProps) {
  const navigate = useNavigate();
  const updateStatusMutation = useUpdateItemStatus();
  const [isWaitingForNextPage, setIsWaitingForNextPage] = createSignal(false);

  const getLinkProps = (targetItemId: string | undefined) => {
    if (!targetItemId) return undefined;
    const to = props.feedId ? "/feeds/$feedId/items/$itemId" : "/items/$itemId";
    // biome-ignore lint/style/noNonNullAssertion: router param fix
    const params = { feedId: props.feedId!, itemId: targetItemId };
    const search = (prev: Record<string, unknown>) => ({ ...prev });
    return { to, params, search };
  };

  const getCloseLinkProps = () => {
    const to = props.feedId ? "/feeds/$feedId" : "/";
    // biome-ignore lint/style/noNonNullAssertion: router param fix
    const params = { feedId: props.feedId! };
    const search = (prev: Record<string, unknown>) => ({ ...prev });
    return { to, params, search };
  };

  const itemsQuery = useItems({
    feedId: props.feedId,
    tagId: props.tagId,
  });

  const allItems = () =>
    itemsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  // Auto-navigate when next page is loaded
  createEffect(() => {
    const data = itemsQuery.data;
    if (isWaitingForNextPage() && data && props.itemId) {
      const items = data.pages.flatMap((p) => p.items);
      const index = items.findIndex((i) => i.id === props.itemId);
      if (index !== -1 && index < items.length - 1) {
        setIsWaitingForNextPage(false);
        const targetItem = items[index + 1];
        const linkProps = getLinkProps(targetItem?.id);
        if (linkProps) {
          navigate({
            to: linkProps.to,
            // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
            params: linkProps.params as any,
            // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
            search: linkProps.search as any,
          });
        }
      }
    }
  });

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
          // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
          search: linkProps.search as any,
        });
      }
    } else if (itemsQuery.hasNextPage) {
      setIsWaitingForNextPage(true);
      itemsQuery.fetchNextPage();
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
          // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
          search: linkProps.search as any,
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
        const linkProps = getCloseLinkProps();
        navigate({
          to: linkProps.to,
          // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
          params: linkProps.params as any,
          // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for router types
          search: linkProps.search as any,
        });
      }}
      prevItemId={prevItem()?.id}
      nextItemId={
        nextItem()?.id || (itemsQuery.hasNextPage ? "loading" : undefined)
      }
      onPrev={handlePrev}
      onNext={handleNext}
    />
  );
}
