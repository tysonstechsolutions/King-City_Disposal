'use client'

import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home, Phone } from 'lucide-react'
import { config } from '../config'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorId: null }
  }

  static getDerivedStateFromError(error) {
    // Generate a unique error ID for tracking
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`
    return { hasError: true, error, errorId }
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // In production, you could send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Could integrate with Sentry, LogRocket, etc.
      console.error('Error ID:', this.state.errorId)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null })
  }

  render() {
    if (this.state.hasError) {
      // Determine if this is an admin page or public page
      const isAdminContext = this.props.isAdmin || false
      const homeLink = isAdminContext ? '/admin' : '/'
      const homeLabel = isAdminContext ? 'Dashboard' : 'Home'

      return (
        <div
          className="min-h-[400px] flex items-center justify-center p-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-dark-800 rounded-xl p-6 text-center border border-dark-600">
            <div
              className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              aria-hidden="true"
            >
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Something went wrong
            </h2>

            <p className="text-dark-300 mb-4">
              An error occurred while loading this section. Please try again or contact us for help.
            </p>

            {this.state.errorId && (
              <p className="text-dark-500 text-sm mb-4">
                Error ID: <code className="bg-dark-700 px-2 py-0.5 rounded">{this.state.errorId}</code>
              </p>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-dark-700 rounded-lg p-3 mb-4 text-left overflow-auto max-h-32">
                <p className="text-red-400 text-sm font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-dark-400 text-xs mt-2 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-dark-800"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Try Again
              </button>

              <a
                href={homeLink}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-dark-400 focus:ring-offset-2 focus:ring-offset-dark-800"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                {homeLabel}
              </a>
            </div>

            {!isAdminContext && (
              <div className="mt-6 pt-4 border-t border-dark-600">
                <p className="text-dark-400 text-sm mb-2">Need immediate help?</p>
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 rounded px-2 py-1"
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  Call {config.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
