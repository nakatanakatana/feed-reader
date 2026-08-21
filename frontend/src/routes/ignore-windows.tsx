import { createMutation, createQuery } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import {
  AddIgnoreWindowModal,
  type IgnoreWindowFormData,
} from "../components/AddIgnoreWindowModal";
import { IgnoreWindowsTable } from "../components/IgnoreWindowsTable";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";
import {
  createIgnoreWindow,
  deleteIgnoreWindow,
  type IgnoreWindow,
  ignoreWindowsQueryOptions,
  updateIgnoreWindow,
} from "../lib/ignore-window-db";
import { isReadOnly } from "../lib/readonly";

export const Route = createFileRoute("/ignore-windows")({
  component: IgnoreWindowsComponent,
});

function IgnoreWindowsComponent() {
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  const [editingWindow, setEditingWindow] = createSignal<IgnoreWindow | null>(
    null,
  );

  const ignoreWindowsQuery = createQuery(() => ignoreWindowsQueryOptions);

  const createMutationFn = createMutation(() => ({
    mutationFn: async (data: IgnoreWindowFormData) => {
      await createIgnoreWindow(data);
    },
  }));

  const updateMutationFn = createMutation(() => ({
    mutationFn: async (params: { id: string; data: IgnoreWindowFormData }) => {
      await updateIgnoreWindow(params.id, params.data);
    },
  }));

  const deleteMutationFn = createMutation(() => ({
    mutationFn: async (id: string) => {
      await deleteIgnoreWindow(id);
    },
  }));

  const handleSave = async (data: IgnoreWindowFormData) => {
    const currentEditing = editingWindow();
    if (currentEditing) {
      await updateMutationFn.mutateAsync({ id: currentEditing.id, data });
    } else {
      await createMutationFn.mutateAsync(data);
    }
    setIsAddModalOpen(false);
    setEditingWindow(null);
  };

  const PlusIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  return (
    <PageLayout>
      <div class={stack({ gap: "4", flex: "1", minHeight: 0 })}>
        <div
          class={flex({
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "3",
            bg: "white",
            p: "4",
            rounded: "md",
            shadow: "sm",
            border: "1px solid",
            borderColor: "gray.200",
          })}
        >
          <div class={stack({ gap: "0.5" })}>
            <h1 class={css({ fontSize: "lg", fontWeight: "bold" })}>
              Ignore Windows
            </h1>
            <p class={css({ fontSize: "sm", color: "gray.500" })}>
              Configure blackout schedules during which automatic feed fetching
              will be skipped.
            </p>
          </div>
          <Show when={!isReadOnly()}>
            <ActionButton
              type="button"
              variant="primary"
              icon={<PlusIcon />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Ignore Window
            </ActionButton>
          </Show>
        </div>

        <div
          class={css({
            flex: "1",
            minHeight: 0,
            overflowY: "auto",
            backgroundColor: "white",
            rounded: "md",
            shadow: "sm",
            border: "1px solid",
            borderColor: "gray.200",
            p: "4",
          })}
        >
          <Show when={ignoreWindowsQuery.isLoading}>
            <p class={css({ color: "gray.500", p: "4" })}>
              Loading ignore windows...
            </p>
          </Show>

          <IgnoreWindowsTable
            ignoreWindows={ignoreWindowsQuery.data ?? []}
            onEdit={
              isReadOnly() ? undefined : (window) => setEditingWindow(window)
            }
            onDelete={
              isReadOnly() ? undefined : (id) => deleteMutationFn.mutate(id)
            }
            isPending={deleteMutationFn.isPending}
          />
        </div>

        <Show when={!isReadOnly()}>
          <AddIgnoreWindowModal
            isOpen={isAddModalOpen() || editingWindow() !== null}
            initialData={editingWindow()}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingWindow(null);
            }}
            onSave={handleSave}
            isPending={createMutationFn.isPending || updateMutationFn.isPending}
          />
        </Show>
      </div>
    </PageLayout>
  );
}
