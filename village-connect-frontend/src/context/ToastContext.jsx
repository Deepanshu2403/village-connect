import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Info, KeyRound, X } from "lucide-react";

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
  otp: KeyRound,
};

const colors = {
  success: "border-green-200 bg-green-50 text-green-700",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  otp: "border-orange-400 bg-slate-800 text-white",
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", options = {}) => {
    let safeMessage = message;
    if (typeof safeMessage !== "string") {
      safeMessage = "Something went wrong. Please try again.";
    }
    if (safeMessage.startsWith("http") || safeMessage.includes("/api/")) {
      safeMessage = "Action failed. Please try again.";
    }

    const id = Date.now() + Math.random();
    const duration = options.duration || (type === "otp" ? 15000 : type === "error" ? 5000 : 4000);
    setToasts((prev) => [...prev, { id, message: safeMessage, type, ...options }]);
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed right-4 top-20 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || Info;
          const isOtp = toast.type === "otp";
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-2xl border p-4 shadow-md backdrop-blur ${colors[toast.type] || colors.info}`}
              role="status"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{toast.message}</p>
                {isOtp && toast.otp && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigator.clipboard?.writeText(toast.otp).then(() => {
                        addToast("OTP copied", "success");
                      });
                    }}
                    className="mt-2 inline-flex min-h-0 items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy OTP
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="min-h-0 rounded-lg p-1 hover:bg-white/70"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
