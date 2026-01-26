import { useNavigate } from "@tanstack/solid-router";
import { ItemDetailModal } from "./ItemDetailModal";
import { useItems } from "../lib/item-query";

interface ItemDetailRouteViewProps {
  itemId: string;
  feedId?: string;
  tagId?: string;
  basePath: string;
  baseParams?: Record<string, string>;
}

export function ItemDetailRouteView(props: ItemDetailRouteViewProps) {
  const navigate = useNavigate();

  const itemsQuery = useItems({
    feedId: props.feedId,
    tagId: props.tagId,
  });

  const allItems = () =>
    itemsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const currentIndex = () => allItems().findIndex((i) => i.id === props.itemId);
  const prevItem = () =>
    currentIndex() > 0 ? allItems()[currentIndex() - 1] : undefined;
  const nextItem = () =>
    currentIndex() >= 0 && currentIndex() < allItems().length - 1
      ? allItems()[currentIndex() + 1]
      : undefined;

  const handleClose = () => {
    navigate({
      to: props.basePath as any,
      params: props.baseParams,
      search: (prev) => ({ ...prev }),
    });
  };

  const handlePrev = () => {
    const item = prevItem();
    if (item) {
      navigate({
        to: `${props.basePath}/items/$itemId` as any,
        params: { ...props.baseParams, itemId: item.id },
        search: (prev) => ({ ...prev }),
      });
    }
  };

  const handleNext = () => {
    const item = nextItem();
    if (item) {
      navigate({
        to: `${props.basePath}/items/$itemId` as any,
        params: { ...props.baseParams, itemId: item.id },
        search: (prev) => ({ ...prev }),
      });
    }
  };

  return (
    <ItemDetailModal
      itemId={props.itemId}
      onClose={handleClose}
      prevItemId={prevItem()?.id}
      nextItemId={nextItem()?.id}
      onPrev={handlePrev}
      onNext={handleNext}
    />
  );
}
