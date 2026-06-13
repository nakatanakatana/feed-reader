import { createRoot } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { itemsDateFilter, itemsShowReadFilter } from "./default";
import type { DateFilterValue } from "./item-utils";

interface ItemStoreState {
  showRead: boolean;
  since: DateFilterValue;
  transientRemovedIds: Record<string, boolean>;
}

function createItemStore() {
  const [state, setState] = createStore<ItemStoreState>({
    showRead: itemsShowReadFilter,
    since: itemsDateFilter,
    transientRemovedIds: {},
  });

  const setShowRead = (showRead: boolean) => {
    setState("showRead", showRead);
  };

  const setDateFilter = (since: DateFilterValue) => {
    setState("since", since);
  };

  const addTransientRemovedIds = (ids: string[]) => {
    const updates: Record<string, boolean> = {};
    for (const id of ids) {
      updates[id] = true;
    }
    setState("transientRemovedIds", (prev) => ({ ...prev, ...updates }));
  };

  const clearTransientRemovedIds = () => {
    setState("transientRemovedIds", reconcile({}));
  };

  return {
    state,
    setShowRead,
    setDateFilter,
    addTransientRemovedIds,
    clearTransientRemovedIds,
  };
}

export const itemStore = createRoot(createItemStore);
