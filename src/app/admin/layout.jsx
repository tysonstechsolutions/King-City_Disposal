'use client'

import ErrorBoundary from '../../components/ErrorBoundary'

export default function AdminLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
