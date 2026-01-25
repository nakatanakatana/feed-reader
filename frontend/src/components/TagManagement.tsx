import { createSignal, For } from "solid-js";
import { useTags, useCreateTag, useDeleteTag } from "../lib/tag-query";
import { CreateTagRequest, DeleteTagRequest } from "../gen/feed/v1/feed_pb";

export const TagManagement = () => {
  const [newTagName, setNewTagName] = createSignal("");
  const tagsQuery = useTags();
  const createTagMutation = useCreateTag();
  const deleteTagMutation = useDeleteTag();

  const handleCreateTag = (e: Event) => {
    e.preventDefault();
    if (!newTagName()) return;
    createTagMutation.mutate(new CreateTagRequest({ name: newTagName() }), {
      onSuccess: () => setNewTagName(""),
    });
  };

  const handleDeleteTag = (id: string) => {
    if (confirm("Are you sure you want to delete this tag?")) {
      deleteTagMutation.mutate(new DeleteTagRequest({ id }));
    }
  };

  return (
    <div class="p-4 border rounded-md bg-white shadow-sm">
      <h2 class="text-xl font-bold mb-4">Tag Management</h2>
      <form onSubmit={handleCreateTag} class="mb-4 flex gap-2">
        <input
          type="text"
          value={newTagName()}
          onInput={(e) => setNewTagName(e.currentTarget.value)}
          placeholder="New tag name"
          class="flex-1 px-3 py-2 border rounded-md"
        />
        <button
          type="submit"
          disabled={createTagMutation.isPending}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Add Tag
        </button>
      </form>

      <div class="flex flex-wrap gap-2">
        <For each={tagsQuery.data?.tags}>
          {(tag) => (
            <div class="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm border">
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteTag(tag.id)}
                class="text-gray-500 hover:text-red-600 font-bold ml-1"
                aria-label={`Delete ${tag.name}`}
              >
                &times;
              </button>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
