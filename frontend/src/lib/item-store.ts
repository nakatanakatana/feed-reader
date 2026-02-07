import { createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { DateFilterValue } from "./item-utils";
import { itemsDateFilter, itemsShowReadFilter } from "./default";

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
