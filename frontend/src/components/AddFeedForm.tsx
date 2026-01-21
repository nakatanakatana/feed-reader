import { createMutation } from "@tanstack/solid-query";
import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { db } from "../lib/query";
import { Feed } from "../gen/feed/v1/feed_pb";

export function AddFeedForm() {
  const [url, setUrl] = createSignal("");

  const mutation = createMutation(() => ({
    mutationFn: async (url: string) => {
      const tx = db.feeds.insert(new Feed({ url }));
      await tx.isPersisted.promise;
    },
    onSuccess: () => {
      setUrl("");
    },
  }));

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    mutation.mutate(url());
  };

  return (
    <form
      onSubmit={handleSubmit}
      class={flex({ gap: "2", alignItems: "flex-start", flexWrap: "wrap" })}
    >
      <div class={flex({ flex: "1", gap: "2", minWidth: "300px" })}>
        <input
          type="text"
          placeholder="Feed URL"
          value={url()}
          onInput={(e) => setUrl(e.currentTarget.value)}
          disabled={mutation.isPending}
          class={css({
            border: "1px solid",
            borderColor: "gray.300",
            padding: "2",
            borderRadius: "md",
            flex: "1",
            _disabled: { opacity: 0.5 },
          })}
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          class={css({
            backgroundColor: "blue.600",
            color: "white",
            padding: "2",
            paddingInline: "4",
            borderRadius: "md",
            cursor: "pointer",
            fontWeight: "medium",
            _hover: { backgroundColor: "blue.700" },
            _disabled: { backgroundColor: "gray.400", cursor: "not-allowed" },
          })}
        >
          {mutation.isPending ? "Adding..." : "Add Feed"}
        </button>
      </div>
      {mutation.isError && (
        <p class={css({ color: "red.500", fontSize: "sm", width: "full" })}>
          Error: {mutation.error?.message}
        </p>
      )}
    </form>
  );
}
    >
          {mutation.isPending ? "Adding..." : "Add Feed"}
        </button>
      </div>
      {mutation.isError && (
        <p class={css({ color: "red.500", fontSize: "sm", width: "full" })}>
          Error: {mutation.error?.message}
        </p>
      )}
    </form>
  );
}
