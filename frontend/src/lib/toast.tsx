import {
  type Accessor,
  createContext,
  createSignal,
  For,
  type JSX,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import { Portal } from "solid-js/web";

import { css } from "../../styled-system/css";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  expiresAt: number;
}

const [globalToasts, setGlobalToasts] = createSignal<Toast[]>([]);

let toastIdCounter = 0;
function generateToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${toastIdCounter++}`;
}

export const toast = {
  show: (message: string, type: Toast["type"] = "info") => {
    const id = generateToastId();
    const expiresAt = Date.now() + 5000;
    setGlobalToasts((prev) => [...prev, { id, message, type, expiresAt }]);
    return id;
  },
  dismiss: (id: string) => {
    setGlobalToasts((prev) => prev.filter((t) => t.id !== id));
  },
  clear: () => {
    setGlobalToasts([]);
  },
  toasts: globalToasts,
};

interface ToastContextValue {
  show: (message: string, type?: Toast["type"]) => string;
  toasts: Accessor<Toast[]>;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue>();

function ToastItem(props: { toast: Toast; onDismiss: (id: string) => void }) {
  let timer: number | undefined;

  onMount(() => {
    const remaining = Math.max(0, props.toast.expiresAt - Date.now());
    timer = window.setTimeout(() => {
      props.onDismiss(props.toast.id);
    }, remaining);
  });

  onCleanup(() => {
    if (timer) window.clearTimeout(timer);
  });

  return (
    <div
      role={props.toast.type === "error" ? "alert" : "status"}
      aria-live={props.toast.type === "error" ? "assertive" : "polite"}
      class={css({
        padding: "4",
        borderRadius: "md",
        color: "white",
        fontSize: "sm",
        fontWeight: "medium",
        boxShadow: "lg",
        animation: "slideIn 0.2s ease-out",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "4",
        minWidth: "300px",
      })}
      style={{
        "background-color":
          props.toast.type === "success"
            ? "#10B981"
            : props.toast.type === "error"
              ? "#EF4444"
              : "#3B82F6",
      }}
    >
      <span>{props.toast.message}</span>
      <button
        type="button"
        onClick={() => props.onDismiss(props.toast.id)}
        aria-label="Dismiss notification"
        class={css({
          background: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          opacity: 0.8,
          _hover: { opacity: 1 },
          padding: "1",
          marginLeft: "2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider(props: { children: JSX.Element }) {
  return (
    <ToastContext.Provider
      value={{
        show: toast.show,
        toasts: toast.toasts,
        dismiss: toast.dismiss,
        clear: toast.clear,
      }}
    >
      {props.children}
      <Portal>
        <div
          class={css({
            position: "fixed",
            bottom: "4",
            right: "4",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "2",
          })}
        >
          <For each={toast.toasts()}>
            {(t) => <ToastItem toast={t} onDismiss={toast.dismiss} />}
          </For>
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
