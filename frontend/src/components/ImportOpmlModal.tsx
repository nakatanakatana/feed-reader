import { createSignal, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack, center } from "../../styled-system/patterns";
import { createPromiseClient } from "@connectrpc/connect";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { useTransport } from "../lib/transport-context";
import { queryClient } from "../lib/query";

interface ImportOpmlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportResult {
  total: number;
  success: number;
  skipped: number;
  failedFeeds: string[];
}

export function ImportOpmlModal(props: ImportOpmlModalProps) {
  const transport = useTransport();
  const client = createPromiseClient(FeedService, transport);

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
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      const res = await client.importOpml({ opmlContent: content });
      setResult({
        total: res.total,
        success: res.success,
        skipped: res.skipped,
        failedFeeds: res.failedFeeds,
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

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget && !isPending()) {
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Backdrop click to close */}
      <div
        onClick={handleBackdropClick}
        class={center({
          position: "fixed",
          top: 0,
          left: 0,
          width: "screen",
          height: "screen",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          padding: "4",
        })}
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          class={stack({
            backgroundColor: "white",
            width: "full",
            maxWidth: "md",
            borderRadius: "lg",
            boxShadow: "xl",
            overflow: "hidden",
            position: "relative",
            textAlign: "left",
          })}
        >
          {/* Header */}
          <div
            class={flex({
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4",
              borderBottom: "1px solid",
              borderColor: "gray.100",
            })}
          >
            <h2 class={css({ fontSize: "lg", fontWeight: "bold" })}>
              Import OPML
            </h2>
            <button
              type="button"
              onClick={props.onClose}
              disabled={isPending()}
              class={css({
                padding: "2",
                cursor: "pointer",
                color: "gray.500",
                _hover: { color: "gray.700" },
                _disabled: { opacity: 0.5, cursor: "not-allowed" },
              })}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div class={stack({ padding: "6", gap: "4" })}>
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
              <div class={center({ padding: "8", gap: "3", flexDirection: "column" })}>
                <div class={css({
                  width: "8",
                  height: "8",
                  border: "4px solid",
                  borderColor: "blue.100",
                  borderTopColor: "blue.600",
                  borderRadius: "full",
                  animation: "spin 1s linear infinite",
                })} />
                <p class={css({ color: "gray.600" })}>Processing OPML file...</p>
              </div>
            </Show>

            <Show when={error()}>
              <p class={css({ color: "red.500", fontSize: "sm" })}>
                Error: {error()}
              </p>
            </Show>

            <Show when={result()}>
              {(res) => (
                <div class={stack({ gap: "2" })}>
                  <p class={css({ fontWeight: "medium", color: "green.600" })}>
                    Import Completed!
                  </p>
                  <ul class={stack({ gap: "1", fontSize: "sm", color: "gray.700" })}>
                    <li>Total feeds found: {res().total}</li>
                    <li>Successfully imported: {res().success}</li>
                    <li>Skipped (already exists): {res().skipped}</li>
                  </ul>
                  <Show when={res().failedFeeds.length > 0}>
                    <div class={stack({ gap: "1", marginTop: "2" })}>
                      <p class={css({ fontSize: "sm", fontWeight: "medium", color: "red.500" })}>
                        Failed to import:
                      </p>
                      <ul class={css({ fontSize: "xs", color: "red.400", maxHeight: "20", overflowY: "auto" })}>
                        {res().failedFeeds.map((url) => (
                          <li>{url}</li>
                        ))}
                      </ul>
                    </div>
                  </Show>
                  <button
                    type="button"
                    onClick={props.onClose}
                    class={css({
                      marginTop: "4",
                      padding: "2",
                      backgroundColor: "blue.600",
                      color: "white",
                      borderRadius: "md",
                      cursor: "pointer",
                      _hover: { backgroundColor: "blue.700" },
                    })}
                  >
                    Done
                  </button>
                </div>
              )}
            </Show>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Show>
  );
}
