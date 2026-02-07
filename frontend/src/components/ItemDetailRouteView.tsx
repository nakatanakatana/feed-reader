import { useLiveQuery } from "@tanstack/solid-db";
import { useMutation } from "@tanstack/solid-query";
import { useNavigate } from "@tanstack/solid-router";
import { items } from "../lib/db";
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
    return { to, params };
  };

  // Use useLiveQuery with items Collection
  const itemsQuery = useLiveQuery((q) => {
    return q.from({ item: items });
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
    items.update(props.itemId, (draft) => {
      draft.isRead = true;
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
