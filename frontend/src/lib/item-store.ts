import { createRoot, createStore } from "solid-js";
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
    setState((draft) => {
      draft.showRead = showRead;
    });
  };

  const setDateFilter = (since: DateFilterValue) => {
    setState((draft) => {
      draft.since = since;
    });
  };

  const addTransientRemovedIds = (ids: string[]) => {
    setState((draft) => {
      for (const id of ids) {
        draft.transientRemovedIds[id] = true;
      }
    });
  };

  const clearTransientRemovedIds = () => {
    setState((draft) => {
      draft.transientRemovedIds = {};
    });
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
