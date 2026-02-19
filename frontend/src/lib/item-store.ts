import { createRoot } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { itemsDateFilter, itemsShowReadFilter } from "./default";
import type { DateFilterValue } from "./item-utils";

function createItemStore() {
  const [state, setState] = createStore({
    showRead: itemsShowReadFilter,
    showHidden: false,
    since: itemsDateFilter as DateFilterValue,
    transientRemovedIds: {} as Record<string, boolean>,
  });

  const setShowRead = (showRead: boolean) => {
    setState("showRead", showRead);
  };

  const setShowHidden = (showHidden: boolean) => {
    setState("showHidden", showHidden);
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
    setShowHidden,
    setDateFilter,
    addTransientRemovedIds,
    clearTransientRemovedIds,
  };
}

export const itemStore = createRoot(createItemStore);
