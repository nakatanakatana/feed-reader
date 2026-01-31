import { createClient } from "@connectrpc/connect";
import { createSignal, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
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

interface ImportResult {
  total: number;
  success: number;
  skipped: number;
  failedFeeds: string[];
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
          <div class={stack({ gap: "2" })}>
            <p class={css({ fontWeight: "medium", color: "green.600" })}>
              Import Completed!
            </p>
            <ul
              class={stack({
                gap: "1",
                fontSize: "sm",
                color: "gray.700",
              })}
            >
              <li>Total feeds found: {res().total}</li>
              <li>Successfully imported: {res().success}</li>
              <li>Skipped (already exists): {res().skipped}</li>
            </ul>
            <Show when={res().failedFeeds.length > 0}>
              <div class={stack({ gap: "1", marginTop: "2" })}>
                <p
                  class={css({
                    fontSize: "sm",
                    fontWeight: "medium",
                    color: "red.500",
                  })}
                >
                  Failed to import:
                </p>
                <ul
                  class={css({
                    fontSize: "xs",
                    color: "red.400",
                    maxHeight: "20",
                    overflowY: "auto",
                  })}
                >
                  {res().failedFeeds.map((url) => (
                    <li>{url}</li>
                  ))}
                </ul>
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
