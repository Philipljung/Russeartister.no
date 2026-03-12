"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };
type ToastContextType = { toast: (message: string, type?: ToastType) => void };

const ToastContext = createContext<ToastContextType | null>(null);

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed right-4 top-16 z-[100] flex flex-col gap-2 pointer-events-none"
        style={{ minWidth: 280, maxWidth: 360 }}
      >
        {toasts.map((t) => {
          const Icon =
            t.type === "success" ? CheckCircle : t.type === "error" ? AlertCircle : Info;
          const iconColor =
            t.type === "success" ? "#34c759" : t.type === "error" ? "#ff453a" : "#6366f1";
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-2xl"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                animation: "toast-in 0.2s ease",
              }}
            >
              <Icon size={16} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
              <p className="flex-1 text-sm leading-snug" style={{ color: "#f5f5f7" }}>
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 transition-opacity hover:opacity-60"
                style={{ color: "#3a3a3a" }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
