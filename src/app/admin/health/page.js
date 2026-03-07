'use client';

import { useState, useEffect } from 'react';

export default function HealthCheckPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      case 'not_configured': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getServiceIcon = (status) => {
    switch (status) {
      case 'healthy': return '✓';
      case 'degraded': return '⚠';
      case 'unhealthy': return '✗';
      case 'not_configured': return '○';
      default: return '?';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">System Health Monitor</h1>
          <div className="flex gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Auto-refresh (30s)</span>
            </label>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {health && (
          <>
            {/* Overall Status */}
            <div className={`p-6 rounded-lg mb-6 ${getStatusColor(health.overall_status)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {getServiceIcon(health.overall_status)} Overall Status: {health.overall_status.toUpperCase()}
                  </h2>
                  <p className="text-sm opacity-80">
                    Last checked: {new Date(health.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm opacity-80">
                    Response time: {health.response_time_ms}ms
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{health.summary.healthy}/{health.summary.total_services}</div>
                  <div className="text-sm">Services Healthy</div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {health.errors && health.errors.length > 0 && (
              <div className="bg-red-100 border border-red-400 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-red-900 mb-2">🚨 Critical Errors ({health.errors.length})</h3>
                <ul className="list-disc list-inside space-y-1">
                  {health.errors.map((err, i) => (
                    <li key={i} className="text-red-700">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {health.warnings && health.warnings.length > 0 && (
              <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-yellow-900 mb-2">⚠️ Warnings ({health.warnings.length})</h3>
                <ul className="list-disc list-inside space-y-1">
                  {health.warnings.map((warn, i) => (
                    <li key={i} className="text-yellow-700">{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Service Details */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-xl font-bold">Service Details</h3>
              </div>
              <div className="divide-y">
                {Object.entries(health.services).map(([name, service]) => (
                  <div key={name} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(service.status)}`}>
                            {getServiceIcon(service.status)} {service.status.toUpperCase()}
                          </span>
                          <h4 className="font-bold text-lg">
                            {name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </h4>
                        </div>

                        {/* Service-specific details */}
                        <div className="text-sm text-gray-600 space-y-1 ml-2">
                          {service.model && (
                            <div>Model: <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{service.model}</span></div>
                          )}
                          {service.fallback_available && (
                            <div className="text-green-600">✓ Automatic fallback enabled</div>
                          )}
                          {service.bucket_name && (
                            <div>Bucket: <span className="font-mono text-xs">{service.bucket_name}</span></div>
                          )}
                          {service.response_time_ms && (
                            <div>Response time: {service.response_time_ms}ms</div>
                          )}
                          {service.error && (
                            <div className="text-red-600 font-mono text-xs bg-red-50 p-2 rounded mt-2">
                              Error: {service.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 text-3xl font-bold">{health.summary.healthy}</div>
                <div className="text-sm text-gray-600">Healthy</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 text-3xl font-bold">{health.summary.unhealthy}</div>
                <div className="text-sm text-gray-600">Unhealthy</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-gray-600 text-3xl font-bold">{health.summary.not_configured}</div>
                <div className="text-sm text-gray-600">Not Configured</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-600 text-3xl font-bold">{health.summary.total_services}</div>
                <div className="text-sm text-gray-600">Total Services</div>
              </div>
            </div>
          </>
        )}

        {loading && !health && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Checking system health...</p>
          </div>
        )}
      </div>
    </div>
  );
}
