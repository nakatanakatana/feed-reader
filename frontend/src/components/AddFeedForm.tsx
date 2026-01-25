import { createSignal, For } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { addFeed } from "../lib/db";
import { useTags } from "../lib/tag-query";

export function AddFeedForm() {
  const [url, setUrl] = createSignal("");
  const [selectedTagIds, setSelectedTagIds] = createSignal<string[]>([]);
  const [isPending, setIsPending] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  const tagsQuery = useTags();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      await addFeed(url(), selectedTagIds());
      setUrl("");
      setSelectedTagIds([]);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsPending(false);
    }
  };

  const toggleTag = (id: string) => {
    if (selectedTagIds().includes(id)) {
      setSelectedTagIds(selectedTagIds().filter((t) => t !== id));
    } else {
      setSelectedTagIds([...selectedTagIds(), id]);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      class={flex({
        gap: "4",
        alignItems: "flex-start",
        flexDirection: "column",
        width: "full",
        bg: "white",
        p: "4",
        rounded: "md",
        shadow: "sm",
        border: "1px solid",
        borderColor: "gray.200",
      })}
    >
      <div class={flex({ gap: "2", width: "full" })}>
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

      <div class={flex({ gap: "2", flexWrap: "wrap", alignItems: "center" })}>
        <span class={css({ fontSize: "sm", color: "gray.600" })}>Tags:</span>
        <For each={tagsQuery.data?.tags}>
          {(tag) => (
            <button
              type="button"
              onClick={() => toggleTag(tag.id)}
              class={css({
                px: "3",
                py: "1",
                rounded: "full",
                fontSize: "xs",
                cursor: "pointer",
                transition: "all 0.2s",
                border: "1px solid",
                ...(selectedTagIds().includes(tag.id)
                  ? {
                      bg: "blue.100",
                      borderColor: "blue.500",
                      color: "blue.700",
                    }
                  : {
                      bg: "gray.50",
                      borderColor: "gray.300",
                      color: "gray.600",
                    }),
              })}
            >
              {tag.name}
            </button>
          )}
        </For>
      </div>

      {error() && (
        <p class={css({ color: "red.500", fontSize: "sm", width: "full" })}>
          Error: {error()?.message}
        </p>
      )}
    </form>
  );
}
