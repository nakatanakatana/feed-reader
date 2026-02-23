import {
  Accessor,
  createContext,
  createSignal,
  For,
  JSX,
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

export function ToastProvider(props: { children: JSX.Element }) {
  const [toasts, setToasts] = createSignal<Toast[]>([]);

  const show = (message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      dismiss(id);
    }, 3000);
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
            {(toast) => (
              <div
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
                    toast.type === "success"
                      ? "#10B981"
                      : toast.type === "error"
                        ? "#EF4444"
                        : "#3B82F6",
                }}
              >
                <span>{toast.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  class={css({
                    background: "transparent",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    opacity: 0.8,
                    _hover: { opacity: 1 },
                  })}
                >
                  ✕
                </button>
              </div>
            )}
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
