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

  useEffect(() => {
    // Prevent double-initialization
    if (initialized.current || !wrapperRef.current) return
    initialized.current = true

    // Create map container completely outside React
    const mapContainer = document.createElement('div')
    mapContainer.style.width = '100%'
    mapContainer.style.height = '100%'
    mapContainer.style.position = 'absolute'
    mapContainer.style.top = '0'
    mapContainer.style.left = '0'
    wrapperRef.current.appendChild(mapContainer)
    mapContainerRef.current = mapContainer

    const initMap = () => {
      if (mapRef.current) return

      if (lat && lng) {
        createMap(parseFloat(lat), parseFloat(lng), true)
      } else if (address) {
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location
            createMap(location.lat(), location.lng(), false)
          } else {
            setLoading(false)
          }
        })
      } else {
        setLoading(false)
      }
    }

    const createMap = (mapLat, mapLng, hasPlacement) => {
      if (mapRef.current || !mapContainerRef.current) return

      const center = { lat: mapLat, lng: mapLng }

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
    }

    // Load Google Maps
    if (window.google?.maps?.Geocoder) {
      initMap()
    } else {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')

      const waitForMaps = () => {
        const checkInterval = setInterval(() => {
          if (window.google?.maps?.Geocoder) {
            clearInterval(checkInterval)
            initMap()
          }
        }, 100)
        setTimeout(() => {
          clearInterval(checkInterval)
          setLoading(false)
        }, 10000)
      }

      if (existingScript) {
        waitForMaps()
      } else {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geocoding`
        script.async = true
        script.defer = true
        script.onload = waitForMaps
        document.head.appendChild(script)
      }
    }

    // Cleanup - manually remove everything we created
    return () => {
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
  }, []) // Empty deps - only run once

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
    </div>
  )
}
