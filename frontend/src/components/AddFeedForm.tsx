import { useLiveQuery } from "@tanstack/solid-db";
import { createSignal, For, JSX, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { feedInsert } from "../lib/db";
import { tagsFeedQuery } from "../lib/tag-db";
import { ActionButton } from "./ui/ActionButton";
import { HorizontalScrollList } from "./ui/HorizontalScrollList";
import { TagChip } from "./ui/TagChip";

interface AddFeedFormProps {
  headerActions?: JSX.Element;
}

export function AddFeedForm(props: AddFeedFormProps) {
  const [url, setUrl] = createSignal("");
  const [selectedTagIds, setSelectedTagIds] = createSignal<string[]>([]);
  const [isPending, setIsPending] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  const tagsQuery = useLiveQuery((q) => {
    return q
      .from({ tag: tagsFeedQuery })
      .orderBy(({ tag }) => tag.feedCount, "desc");
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const tags = tagsQuery().filter((t) => selectedTagIds().includes(t.id));
      // @ts-expect-error
      await feedInsert(url(), tags);

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
    <div class={flex({ flexDirection: "column", gap: "2", width: "full" })}>
      <Show when={props.headerActions}>
        <div class={flex({ justifyContent: "flex-end" })}>
          {props.headerActions}
        </div>
      </Show>
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
        <ActionButton type="submit" variant="primary" disabled={isPending()}>
          {isPending() ? "Adding..." : "Add Feed"}
        </ActionButton>
      </div>

      <div class={flex({ gap: "2", alignItems: "center", width: "full", minWidth: 0 })}>
        <span class={css({ fontSize: "sm", color: "gray.600", whiteSpace: "nowrap" })}>Tags:</span>
        <HorizontalScrollList>
          <For each={tagsQuery()}>
            {(tag) => (
              <TagChip
                selected={selectedTagIds().includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </TagChip>
            )}
          </For>
        </HorizontalScrollList>
      </div>

      {error() && (
        <p class={css({ color: "red.500", fontSize: "sm", width: "full" })}>
          Error: {error()?.message}
        </p>
      )}
    </form>
    </div>
  );
}
