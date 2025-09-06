"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    title?: string,
    duration?: number
  ) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      title?: string,
      duration: number = 4000
    ) => {
      const id = Date.now().toString() + Math.random().toString(36);
      const newToast: Toast = {
        id,
        type,
        title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  // カスタムイベントをリッスン
  useEffect(() => {
    if (!mounted) return;

    const handleShowToast = (event: CustomEvent) => {
      const { message, type, title } = event.detail;
      showToast(message, type, title);
    };

    window.addEventListener("showToast", handleShowToast as EventListener);
    return () => {
      window.removeEventListener("showToast", handleShowToast as EventListener);
    };
  }, [showToast, mounted]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-amber-200 bg-amber-50";
      case "info":
      default:
        return "border-blue-200 bg-blue-50";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 left-4 right-4 z-[9999] space-y-2 flex flex-col items-center">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`max-w-full shadow-lg rounded-lg border p-4 transform transition-all duration-300 ease-out animate-in slide-in-from-top ${getToastStyles(
                  toast.type
                )}`}
                style={{ width: 'fit-content', minWidth: '200px', maxWidth: 'calc(100vw - 32px)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getToastIcon(toast.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {toast.title && (
                      <h4 className="text-sm font-semibold text-gray-900 mb-1 break-words">
                        {toast.title}
                      </h4>
                    )}
                    <p className="text-sm text-gray-700 break-words">
                      {toast.message}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-200/50"
                    onClick={() => removeToast(toast.id)}
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
