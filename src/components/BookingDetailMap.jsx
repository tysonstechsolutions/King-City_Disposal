'use client'

import { useEffect, useRef, useState } from 'react'
import { config } from '../config'
import { Loader2 } from 'lucide-react'

const GOOGLE_MAPS_KEY = config.googleMaps?.apiKey || "AIzaSyAAU2wsDoDPH4n9BNk_pWlxBla3irr_AtM"

export default function BookingDetailMap({ lat, lng, address, placementNotes }) {
  const wrapperRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const mapContainerRef = useRef(null)
  const initialized = useRef(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('[BookingDetailMap] Component mounted')
    console.log('[BookingDetailMap] Props:', { lat, lng, address, placementNotes })
    console.log('[BookingDetailMap] API Key from config:', config.googleMaps?.apiKey ? 'EXISTS' : 'MISSING')
    console.log('[BookingDetailMap] Using API Key:', GOOGLE_MAPS_KEY ? `${GOOGLE_MAPS_KEY.slice(0, 10)}...` : 'NONE')

    // Prevent double-initialization
    if (initialized.current) {
      console.log('[BookingDetailMap] Already initialized, skipping')
      return
    }

    if (!wrapperRef.current) {
      console.log('[BookingDetailMap] ERROR: wrapperRef is null')
      return
    }

    initialized.current = true
    console.log('[BookingDetailMap] Initializing...')

    // Create map container completely outside React
    const mapContainer = document.createElement('div')
    mapContainer.style.width = '100%'
    mapContainer.style.height = '100%'
    mapContainer.style.position = 'absolute'
    mapContainer.style.top = '0'
    mapContainer.style.left = '0'
    wrapperRef.current.appendChild(mapContainer)
    mapContainerRef.current = mapContainer

    console.log('[BookingDetailMap] Map container created, dimensions:', {
      width: mapContainer.offsetWidth,
      height: mapContainer.offsetHeight,
      parentWidth: wrapperRef.current.offsetWidth,
      parentHeight: wrapperRef.current.offsetHeight
    })

    const initMap = () => {
      console.log('[BookingDetailMap] initMap called')
      if (mapRef.current) {
        console.log('[BookingDetailMap] Map already exists, skipping')
        return
      }

      if (lat && lng) {
        console.log('[BookingDetailMap] Using provided coordinates:', { lat, lng })
        createMap(parseFloat(lat), parseFloat(lng), true)
      } else if (address) {
        console.log('[BookingDetailMap] Geocoding address:', address)
        try {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ address }, (results, status) => {
            console.log('[BookingDetailMap] Geocode result:', { status, resultsCount: results?.length })
            if (status === 'OK' && results[0]) {
              const location = results[0].geometry.location
              createMap(location.lat(), location.lng(), false)
            } else {
              console.log('[BookingDetailMap] Geocode failed:', status)
              setError(`Geocode failed: ${status}`)
              setLoading(false)
            }
          })
        } catch (err) {
          console.error('[BookingDetailMap] Geocoder error:', err)
          setError(`Geocoder error: ${err.message}`)
          setLoading(false)
        }
      } else {
        console.log('[BookingDetailMap] No lat/lng or address provided')
        setError('No location provided')
        setLoading(false)
      }
    }

    const createMap = (mapLat, mapLng, hasPlacement) => {
      console.log('[BookingDetailMap] createMap called:', { mapLat, mapLng, hasPlacement })

      if (mapRef.current || !mapContainerRef.current) {
        console.log('[BookingDetailMap] Cannot create map - already exists or no container')
        return
      }

      const center = { lat: mapLat, lng: mapLng }

      try {
        console.log('[BookingDetailMap] Creating Google Map...')
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center,
          zoom: 20,
          mapTypeId: 'satellite',
          tilt: 0,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
        })

        mapRef.current = map
        console.log('[BookingDetailMap] Map created successfully')

        if (hasPlacement) {
          const marker = new window.google.maps.Marker({
            position: center,
            map,
            icon: {
              path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 8,
              fillColor: '#22c55e',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              rotation: 0,
            },
            title: 'Dumpster Placement',
          })
          markerRef.current = marker
          console.log('[BookingDetailMap] Marker added')

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; color: #000;">
                <strong>Dumpster Placement</strong><br/>
                <span style="color: #666;">${placementNotes || 'No notes'}</span>
              </div>
            `,
          })

          marker.addListener('click', () => infoWindow.open(map, marker))
          infoWindow.open(map, marker)
        } else {
          new window.google.maps.Marker({
            position: center,
            map,
            title: address,
          })
        }

        setLoading(false)
        console.log('[BookingDetailMap] Map setup complete')
      } catch (err) {
        console.error('[BookingDetailMap] Error creating map:', err)
        setError(`Map creation failed: ${err.message}`)
        setLoading(false)
      }
    }

    // Load Google Maps
    console.log('[BookingDetailMap] Checking for Google Maps API...')
    console.log('[BookingDetailMap] window.google exists:', !!window.google)
    console.log('[BookingDetailMap] window.google.maps exists:', !!window.google?.maps)
    console.log('[BookingDetailMap] window.google.maps.Geocoder exists:', !!window.google?.maps?.Geocoder)

    if (window.google?.maps?.Geocoder) {
      console.log('[BookingDetailMap] Google Maps already loaded, initializing map')
      initMap()
    } else {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      console.log('[BookingDetailMap] Existing Google Maps script found:', !!existingScript)

      const waitForMaps = () => {
        console.log('[BookingDetailMap] Waiting for Google Maps to load...')
        let attempts = 0
        const checkInterval = setInterval(() => {
          attempts++
          if (window.google?.maps?.Geocoder) {
            console.log('[BookingDetailMap] Google Maps loaded after', attempts, 'attempts')
            clearInterval(checkInterval)
            initMap()
          } else if (attempts > 100) {
            console.log('[BookingDetailMap] Timeout waiting for Google Maps')
            clearInterval(checkInterval)
            setError('Google Maps failed to load')
            setLoading(false)
          }
        }, 100)
      }

      if (existingScript) {
        console.log('[BookingDetailMap] Using existing script, waiting for load...')
        waitForMaps()
      } else {
        console.log('[BookingDetailMap] Loading Google Maps script...')
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geocoding`
        script.async = true
        script.defer = true
        script.onload = () => {
          console.log('[BookingDetailMap] Script onload fired')
          waitForMaps()
        }
        script.onerror = (err) => {
          console.error('[BookingDetailMap] Script load error:', err)
          setError('Failed to load Google Maps script')
          setLoading(false)
        }
        document.head.appendChild(script)
        console.log('[BookingDetailMap] Script added to head')
      }
    }

    // Cleanup - manually remove everything we created
    return () => {
      console.log('[BookingDetailMap] Cleanup running')
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapRef.current = null
      if (mapContainerRef.current && wrapperRef.current) {
        try {
          wrapperRef.current.removeChild(mapContainerRef.current)
        } catch (e) {
          // Already removed
        }
        mapContainerRef.current = null
      }
      initialized.current = false
    }
  }, [lat, lng, address, placementNotes])

  return (
    <div className="w-full h-[300px] md:h-[400px] bg-dark-700 relative">
      {/*
        This wrapper uses dangerouslySetInnerHTML with empty string to tell React
        "don't touch anything inside here". We then use vanilla JS to add the map.
      */}
      <div
        ref={wrapperRef}
        className="absolute inset-0"
        dangerouslySetInnerHTML={{ __html: '' }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-700 z-10 pointer-events-none">
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-700 z-10">
          <div className="text-center p-4">
            <p className="text-red-400 text-sm mb-2">Map Error</p>
            <p className="text-dark-400 text-xs">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
