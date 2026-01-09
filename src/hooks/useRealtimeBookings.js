'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { config } from '../config'

// Poll interval in milliseconds
const POLL_INTERVAL = 30000 // 30 seconds

export function useRealtimeBookings(enabled = true) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [newBookingCount, setNewBookingCount] = useState(0)
  const previousIdsRef = useRef(new Set())
  const intervalRef = useRef(null)

  const fetchBookings = useCallback(async (isManual = false) => {
    if (isManual) {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/bookings?order=created_at.desc`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }

      const data = await response.json()

      // Check for new bookings (only after initial load)
      if (previousIdsRef.current.size > 0) {
        const currentIds = new Set(data.map(b => b.id))
        let newCount = 0

        for (const id of currentIds) {
          if (!previousIdsRef.current.has(id)) {
            newCount++
          }
        }

        if (newCount > 0) {
          setNewBookingCount(prev => prev + newCount)
          // Play notification sound if available
          playNotificationSound()
        }
      }

      // Update previous IDs
      previousIdsRef.current = new Set(data.map(b => b.id))

      setBookings(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear new booking notification
  const clearNewBookingAlert = useCallback(() => {
    setNewBookingCount(0)
  }, [])

  // Manual refresh
  const refresh = useCallback(() => {
    clearNewBookingAlert()
    return fetchBookings(true)
  }, [fetchBookings, clearNewBookingAlert])

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create a simple beep using Web Audio API
      if (typeof window !== 'undefined' && window.AudioContext) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)

        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gainNode.gain.value = 0.1

        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.15)
      }
    } catch (e) {
      // Ignore audio errors
    }
  }

  // Start/stop polling
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial fetch
    fetchBookings(true)

    // Set up polling
    intervalRef.current = setInterval(() => {
      fetchBookings(false)
    }, POLL_INTERVAL)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, fetchBookings])

  // Also refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        fetchBookings(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, fetchBookings])

  return {
    bookings,
    loading,
    error,
    lastUpdated,
    newBookingCount,
    refresh,
    clearNewBookingAlert,
  }
}

export default useRealtimeBookings
