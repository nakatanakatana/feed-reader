import { createSignal } from "solid-js";
import { createFileRoute } from "@tanstack/solid-router";
import { ItemList } from "../components/ItemList";
import { ItemDetailModal } from "../components/ItemDetailModal";
import { css } from "../../styled-system/css";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [selectedItemId, setSelectedItemId] = createSignal<string | undefined>();

  return (
    <div class="p-2">
      <h2 class="text-xl font-bold mb-4">All Items</h2>
      <button
        type="button"
        onClick={() => setSelectedItemId("123")}
        class={css({
          padding: "2",
          backgroundColor: "blue.500",
          color: "white",
          borderRadius: "md",
          cursor: "pointer",
          marginBottom: "4",
        })}
      >
        Test Modal
      </button>
      <ItemList />
      <ItemDetailModal
        itemId={selectedItemId()}
        onClose={() => setSelectedItemId(undefined)}
      />
    </div>
  );
}
