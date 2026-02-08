import { createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { itemsDateFilter, itemsShowReadFilter } from "./default";
import type { DateFilterValue } from "./item-utils";

function createItemStore() {
  const [state, setState] = createStore({
    showRead: itemsShowReadFilter,
    since: itemsDateFilter as DateFilterValue,
  });

  const setShowRead = (showRead: boolean) => {
    setState("showRead", showRead);
  };

  const setDateFilter = (since: DateFilterValue) => {
    setState("since", since);
  };

  return { state, setShowRead, setDateFilter };
}

export const itemStore = createRoot(createItemStore);
