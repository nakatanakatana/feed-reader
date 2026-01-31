import { createStore } from "solid-js/store";

interface FetchingState {
  fetchingFeedIds: Set<string>;
  errors: Record<string, string>;
}

const [state, setState] = createStore<FetchingState>({
  fetchingFeedIds: new Set(),
  errors: {},
});

export const fetchingState = {
  get isFetching() {
    return (id: string) => state.fetchingFeedIds.has(id);
  },
  get error() {
    return (id: string) => state.errors[id];
  },
  startFetching(ids: string[]) {
    setState("fetchingFeedIds", (prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        next.add(id);
      }
      return next;
    });
    // Clear errors when starting new fetch
    setState("errors", (prev) => {
      const next = { ...prev };
      for (const id of ids) {
        delete next[id];
      }
      return next;
    });
  },
  finishFetching(
    ids: string[],
    results?: { feedId: string; errorMessage?: string }[],
  ) {
    setState("fetchingFeedIds", (prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        next.delete(id);
      }
      return next;
    });

    if (results) {
      setState("errors", (prev) => {
        const next = { ...prev };
        for (const res of results) {
          if (res.errorMessage) {
            next[res.feedId] = res.errorMessage;
          } else {
            delete next[res.feedId];
          }
        }
        return next;
      });
    }
  },
};
