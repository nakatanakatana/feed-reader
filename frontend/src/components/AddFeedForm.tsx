import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { addFeed } from "../lib/db";

export function AddFeedForm() {
  const [url, setUrl] = createSignal("");
  const [isPending, setIsPending] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      await addFeed(url());
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsPending(false);
    }
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
          disabled={isPending()}
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
          disabled={isPending()}
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
          {isPending() ? "Adding..." : "Add Feed"}
        </button>
      </div>
      {error() && (
        <p class={css({ color: "red.500", fontSize: "sm", width: "full" })}>
          Error: {error()?.message}
        </p>
      )}
    </form>
  );
}
