'use client'

import ErrorBoundary from '../../components/ErrorBoundary'
import { ToastProvider } from '../../components/Toast'

export default function AdminLayout({ children }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ErrorBoundary>
  )
}
