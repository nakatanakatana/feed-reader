import { createRoot, createStore } from "solid-js";

interface FetchingState {
  fetchingFeedIds: Set<string>;
  errors: Record<string, string>;
}

export const fetchingState = createRoot(() => {
  const [state, setState] = createStore<FetchingState>({
    fetchingFeedIds: new Set(),
    errors: {},
  });

  return {
    get isFetching() {
      return (id: string) => state.fetchingFeedIds.has(id);
    },
    get error() {
      return (id: string) => state.errors[id];
    },
    startFetching(ids: string[]) {
      setState((draft) => {
        const next = new Set(draft.fetchingFeedIds);
        for (const id of ids) {
          next.add(id);
          delete draft.errors[id];
        }
        draft.fetchingFeedIds = next;
      });
    },
    finishFetching(
      ids: string[],
      results?: { feedId: string; errorMessage?: string }[],
    ) {
      setState((draft) => {
        const next = new Set(draft.fetchingFeedIds);
        for (const id of ids) {
          next.delete(id);
        }
        draft.fetchingFeedIds = next;

        if (results) {
          for (const res of results) {
            if (res.errorMessage) {
              draft.errors[res.feedId] = res.errorMessage;
            } else {
              delete draft.errors[res.feedId];
            }
          }
        }
      });
    },
  };
});
