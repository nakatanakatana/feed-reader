import { createRoot } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { itemsDateFilter, itemsShowReadFilter } from "./default";
import { setLastFetched, setLastReadFetched } from "./item-sync-state";
import type { DateFilterValue } from "./item-utils";
import { queryClient } from "./query";

function createItemStore() {
  const [state, setState] = createStore({
    showRead: itemsShowReadFilter,
    since: itemsDateFilter as DateFilterValue,
    transientRemovedIds: {} as Record<string, boolean>,
  });

  const resetCacheAndSync = () => {
    setLastFetched(null);
    queryClient.setQueryData(["items"], undefined);
    queryClient.invalidateQueries({ queryKey: ["items"] });
  };

  const setShowRead = (showRead: boolean) => {
    if (state.showRead === showRead) return;
    setState("showRead", showRead);
    resetCacheAndSync();
  };

  const setDateFilter = (since: DateFilterValue) => {
    if (state.since === since) return;
    setState("since", since);
    resetCacheAndSync();
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
