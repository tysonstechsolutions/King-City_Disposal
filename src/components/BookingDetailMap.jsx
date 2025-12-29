'use client'

import { useEffect, useRef, useState } from 'react'
import { config } from '../config'
import { Loader2, MapPin, AlertCircle } from 'lucide-react'

const GOOGLE_MAPS_KEY = config.googleMaps?.apiKey || "AIzaSyAAU2wsDoDPH4n9BNk_pWlxBla3irr_AtM"

export default function BookingDetailMap({ lat, lng, address, placementNotes }) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    let checkInterval = null

    console.log('[Map] Starting with props:', { lat, lng, address })

    // Helper to geocode address
    const geocodeAddress = (addr) => {
      return new Promise((resolve, reject) => {
        if (!window.google?.maps?.Geocoder) {
          reject(new Error('Geocoder not available'))
          return
        }
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ address: addr }, (results, geoStatus) => {
          console.log('[Map] Geocode result:', geoStatus, results?.length)
          if (geoStatus === 'OK' && results[0]) {
            resolve({
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng()
            })
          } else {
            reject(new Error(`Geocode failed: ${geoStatus}`))
          }
        })
      })
    }

    // Create the map
    const createMap = async () => {
      if (!isMounted || !mapContainerRef.current) {
        console.log('[Map] Not mounted or no container')
        return
      }

      // Already have a map?
      if (mapInstanceRef.current) {
        console.log('[Map] Map already exists')
        return
      }

      let mapLat, mapLng
      let hasPlacementCoords = false

      // Check if we have valid coordinates
      const hasValidCoords = lat !== null && lat !== undefined && lng !== null && lng !== undefined &&
                             !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))

      if (hasValidCoords) {
        console.log('[Map] Using provided coordinates:', lat, lng)
        mapLat = parseFloat(lat)
        mapLng = parseFloat(lng)
        hasPlacementCoords = true
      } else if (address) {
        console.log('[Map] No coordinates, geocoding address:', address)
        try {
          const coords = await geocodeAddress(address)
          mapLat = coords.lat
          mapLng = coords.lng
          console.log('[Map] Geocoded to:', mapLat, mapLng)
        } catch (err) {
          console.error('[Map] Geocoding failed:', err)
          if (isMounted) {
            setErrorMessage(`Could not locate address on map: ${err.message}`)
            setStatus('error')
          }
          return
        }
      } else {
        console.log('[Map] No address or coordinates provided')
        if (isMounted) {
          setErrorMessage('No address provided')
          setStatus('error')
        }
        return
      }

      // Create the map
      try {
        console.log('[Map] Creating map at:', mapLat, mapLng)
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: mapLat, lng: mapLng },
          zoom: 19,
          mapTypeId: 'satellite',
          tilt: 0,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
        })

        mapInstanceRef.current = map

        // Add marker
        const marker = new window.google.maps.Marker({
          position: { lat: mapLat, lng: mapLng },
          map,
          icon: hasPlacementCoords ? {
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 8,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          } : undefined,
          title: hasPlacementCoords ? 'Dumpster Placement' : address,
        })
        markerRef.current = marker

        // Add info window for placement
        if (hasPlacementCoords || placementNotes) {
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; color: #000; max-width: 200px;">
                <strong>${hasPlacementCoords ? 'Dumpster Placement' : 'Delivery Location'}</strong>
                ${placementNotes ? `<br/><span style="color: #666; font-size: 12px;">${placementNotes}</span>` : ''}
              </div>
            `,
          })
          marker.addListener('click', () => infoWindow.open(map, marker))
          infoWindow.open(map, marker)
        }

        if (isMounted) {
          setStatus('ready')
        }
        console.log('[Map] Map created successfully')
      } catch (err) {
        console.error('[Map] Error creating map:', err)
        if (isMounted) {
          setErrorMessage(`Map error: ${err.message}`)
          setStatus('error')
        }
      }
    }

    // Load Google Maps API if needed
    const loadMapsAndCreate = () => {
      if (window.google?.maps?.Map) {
        console.log('[Map] Google Maps already available')
        createMap()
      } else {
        console.log('[Map] Waiting for Google Maps...')
        // Check if script exists
        let script = document.querySelector('script[src*="maps.googleapis.com"]')
        if (!script) {
          console.log('[Map] Adding Google Maps script')
          script = document.createElement('script')
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geocoding`
          script.async = true
          document.head.appendChild(script)
        }

        // Wait for it to load
        let attempts = 0
        checkInterval = setInterval(() => {
          attempts++
          if (window.google?.maps?.Map) {
            console.log('[Map] Google Maps loaded after', attempts * 100, 'ms')
            clearInterval(checkInterval)
            createMap()
          } else if (attempts > 100) {
            console.log('[Map] Timeout waiting for Google Maps')
            clearInterval(checkInterval)
            if (isMounted) {
              setErrorMessage('Google Maps failed to load. Please refresh the page.')
              setStatus('error')
            }
          }
        }, 100)
      }
    }

    loadMapsAndCreate()

    // Cleanup
    return () => {
      isMounted = false
      if (checkInterval) clearInterval(checkInterval)
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapInstanceRef.current = null
    }
  }, [lat, lng, address, placementNotes])

  return (
    <div className="w-full h-[300px] md:h-[400px] bg-dark-700 relative overflow-hidden">
      {/* Map container - React won't touch children after initial render */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
        style={{ minHeight: '300px' }}
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-700 z-10">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin mb-3" />
          <p className="text-dark-400 text-sm">Loading map...</p>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-700 z-10 p-4">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-white font-medium mb-1">Could not load map</p>
          <p className="text-dark-400 text-sm text-center">{errorMessage}</p>
          {address && (
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
            >
              <MapPin className="w-4 h-4" />
              View on Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  )
}
