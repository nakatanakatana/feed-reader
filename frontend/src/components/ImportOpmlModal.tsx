import { createClient } from "@connectrpc/connect";
import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { FeedService } from "../gen/feed/v1/feed_pb";
import { queryClient } from "../lib/query";
import { useTransport } from "../lib/transport-context";
import { ActionButton } from "./ui/ActionButton";
import { LoadingState } from "./ui/LoadingState";
import { Modal } from "./ui/Modal";

interface ImportOpmlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportFailedFeed {
  url: string;
  errorMessage: string;
}

interface ImportResult {
  total: number;
  success: number;
  skipped: number;
  failedFeeds: ImportFailedFeed[];
}

export function ImportOpmlModal(props: ImportOpmlModalProps) {
  const transport = useTransport();
  const client = createClient(FeedService, transport);

  const [isPending, setIsPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [result, setResult] = createSignal<ImportResult | null>(null);

  const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setIsPending(true);
    setError(null);
    setResult(null);

    try {
      const reader = new FileReader();
      const content = await new Promise<Uint8Array>((resolve, reject) => {
        reader.onload = () =>
          // biome-ignore lint/suspicious/noExplicitAny: ArrayBuffer to Uint8Array cast issue in some TS environments
          resolve(new Uint8Array(reader.result as any) as any);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      const res = await client.importOpml({
        // biome-ignore lint/suspicious/noExplicitAny: Protobuf bytes field expects specific Uint8Array subtype
        opmlContent: content as any,
      });
      setResult({
        total: res.total,
        success: res.success,
        skipped: res.skipped,
        failedFeeds: res.failedFeeds.map((f) => ({
          url: f.url,
          errorMessage: f.errorMessage,
        })),
      });

      // Invalidate feeds list query
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import OPML");
    } finally {
      setIsPending(false);
      // Reset input
      input.value = "";
    }
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size="standard"
      title="Import OPML"
      disableBackdropClose={isPending()}
      ariaLabel="Import OPML"
    >
      <Show when={!result() && !isPending()}>
        <p class={css({ color: "gray.600", fontSize: "sm" })}>
          Select an .opml or .xml file to import your feed subscriptions.
        </p>
        <input
          type="file"
          accept=".opml,.xml"
          onChange={handleFileChange}
          class={css({
            width: "full",
            padding: "2",
            border: "1px dashed",
            borderColor: "gray.300",
            borderRadius: "md",
            cursor: "pointer",
          })}
        />
      </Show>

      <Show when={isPending()}>
        <LoadingState label="Processing OPML file..." />
      </Show>

      <Show when={error()}>
        <p class={css({ color: "red.500", fontSize: "sm" })}>
          Error: {error()}
        </p>
      </Show>

      <Show when={result()}>
        {(res) => (
          <div class={stack({ gap: "4" })}>
            <div
              class={css({
                padding: "3",
                backgroundColor: "blue.50",
                borderRadius: "md",
                border: "1px solid",
                borderColor: "blue.100",
              })}
            >
              <p
                class={css({
                  fontWeight: "bold",
                  color: "blue.800",
                  marginBottom: "2",
                })}
              >
                Import Summary
              </p>
              <ul
                class={flex({
                  gap: "4",
                  fontSize: "sm",
                  color: "blue.700",
                  flexWrap: "wrap",
                })}
              >
                <li>Total: {res().total}</li>
                <li>Success: {res().success}</li>
                <li>Skipped: {res().skipped}</li>
                <li>Failed: {res().failedFeeds.length}</li>
              </ul>
            </div>

            <Show when={res().failedFeeds.length > 0}>
              <div class={stack({ gap: "2" })}>
                <p
                  class={css({
                    fontSize: "sm",
                    fontWeight: "bold",
                    color: "red.600",
                  })}
                >
                  Failed Items
                </p>
                <div
                  class={stack({
                    gap: "2",
                    maxHeight: "60",
                    overflowY: "auto",
                    padding: "1",
                  })}
                >
                  <For each={res().failedFeeds}>
                    {(failed) => (
                      <div
                        class={css({
                          padding: "3",
                          border: "1px solid",
                          borderColor: "red.100",
                          borderRadius: "md",
                          backgroundColor: "red.50",
                        })}
                      >
                        <p
                          class={css({
                            fontSize: "xs",
                            fontWeight: "medium",
                            color: "red.800",
                            wordBreak: "break-all",
                          })}
                        >
                          {failed.url}
                        </p>
                        <p
                          class={css({
                            fontSize: "xs",
                            color: "red.600",
                            marginTop: "1",
                          })}
                        >
                          {failed.errorMessage}
                        </p>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <ActionButton variant="primary" onClick={props.onClose}>
              Done
            </ActionButton>
          </div>
        )}
      </Show>
    </Modal>
  );
}
