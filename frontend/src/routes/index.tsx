import { createFileRoute } from "@tanstack/solid-router";
import { ItemList } from "../components/ItemList";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div class="p-2">
      <h2 class="text-xl font-bold mb-4">All Items</h2>
      <ItemList />
    </div>
  );
}
