'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

// Toast context
const ToastContext = createContext(null)

// Toast types and their styles
const toastStyles = {
  success: {
    bg: 'bg-green-500/10 border-green-500/30',
    icon: CheckCircle2,
    iconColor: 'text-green-400',
    textColor: 'text-green-300',
  },
  error: {
    bg: 'bg-red-500/10 border-red-500/30',
    icon: AlertCircle,
    iconColor: 'text-red-400',
    textColor: 'text-red-300',
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    textColor: 'text-amber-300',
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: Info,
    iconColor: 'text-blue-400',
    textColor: 'text-blue-300',
  },
}

// Individual toast component
function ToastItem({ id, type = 'info', message, title, duration = 4000, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  const style = toastStyles[type] || toastStyles.info
  const Icon = style.icon

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true))

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => onDismiss(id), 200)
  }

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm
        ${style.bg}
        transform transition-all duration-200 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`font-medium ${style.textColor}`}>{title}</p>
        )}
        <p className={`text-sm ${style.textColor} opacity-90`}>{message}</p>
      </div>
      <button
        onClick={handleDismiss}
        className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${style.iconColor}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Toast container component
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}

// Toast provider component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = 'info', message, title, duration = 4000 }) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message, title, duration }])
    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const toast = {
    success: (message, title) => addToast({ type: 'success', message, title }),
    error: (message, title) => addToast({ type: 'error', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
    info: (message, title) => addToast({ type: 'info', message, title }),
    dismiss: dismissToast,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastProvider
