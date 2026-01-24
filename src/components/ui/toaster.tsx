"use client"

import { useToast } from "@/hooks/use-toast"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

const variantStyles = {
  default: "border-border bg-background text-foreground",
  destructive: "border-red-200 bg-red-50 text-red-900",
  success: "border-green-200 bg-green-50 text-green-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
}

const variantIcons = {
  default: null,
  destructive: AlertCircle,
  success: CheckCircle,
  info: Info,
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const variant = toast.variant || "default"
        const Icon = variantIcons[variant as keyof typeof variantIcons]

        return (
          <div
            key={toast.id}
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            className={`
              relative rounded-lg border p-4 pr-10 shadow-lg transition-all animate-in slide-in-from-right-full
              ${variantStyles[variant as keyof typeof variantStyles] || variantStyles.default}
            `}
          >
            <div className="flex gap-3">
              {Icon && (
                <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="flex-1">
                {toast.title && (
                  <div className="font-semibold">{toast.title}</div>
                )}
                {toast.description && (
                  <div className="text-sm opacity-90 mt-1">{toast.description}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="absolute right-2 top-2 rounded-sm p-1 opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
