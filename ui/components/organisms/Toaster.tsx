"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./Toaster.module.css";

type Toast = {
  id: number;
  message: string;
  tone: "success" | "error";
  action?: { label: string; run: () => void };
  leaving?: boolean;
};

type ToastInput = Omit<Toast, "id" | "leaving"> & { duration?: number };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    // Mark first so the exit transition plays, then drop it.
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 180);
  }, []);

  const show = useCallback(
    ({ duration = 5000, ...toast }: ToastInput) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { ...toast, id }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol className={styles.viewport} aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CircleCheck : CircleAlert;
          return (
            <li key={toast.id} className={cn(styles.toast, toast.leaving && styles.leaving)}>
              <Icon size={16} aria-hidden className={styles[toast.tone]} />
              <span className={styles.message}>{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    toast.action!.run();
                    dismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
                <X size={14} aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
    </ToastContext.Provider>
  );
}
