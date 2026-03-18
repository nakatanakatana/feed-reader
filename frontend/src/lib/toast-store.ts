import { createSignal } from "solid-js";

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
