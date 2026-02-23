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
}

interface ToastContextValue {
  show: (message: string, type?: Toast["type"]) => void;
  toasts: Accessor<Toast[]>;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>();

function ToastItem(props: { toast: Toast; onDismiss: (id: string) => void }) {
  let timer: number | undefined;

  onMount(() => {
    timer = window.setTimeout(() => {
      props.onDismiss(props.toast.id);
    }, 3000);
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
  const [toasts, setToasts] = createSignal<Toast[]>([]);

  const show = (message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ show, toasts, dismiss }}>
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
          <For each={toasts()}>
            {(toast) => <ToastItem toast={toast} onDismiss={dismiss} />}
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
