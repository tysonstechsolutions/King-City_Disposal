'use client'

import { useState, useEffect } from 'react'
import { config } from '../config'
import { Loader2, MapPin, AlertCircle, ExternalLink } from 'lucide-react'

const GOOGLE_MAPS_KEY = config.googleMaps?.apiKey || "AIzaSyAAU2wsDoDPH4n9BNk_pWlxBla3irr_AtM"

// Convert feet to lat/lng offset
// 1 degree latitude ≈ 364,173 feet
// 1 degree longitude ≈ 364,173 * cos(latitude) feet
const feetToLatOffset = (feet) => feet / 364173
const feetToLngOffset = (feet, lat) => feet / (364173 * Math.cos(lat * Math.PI / 180))

// Use Google Static Maps API for reliable satellite imagery
export default function BookingDetailMap({ lat, lng, address, placementNotes, dumpsterSize }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [geocodedCoords, setGeocodedCoords] = useState(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Get dumpster dimensions from config
  const dumpster = config.dumpsters.find(d => d.id === dumpsterSize)
  const dumpsterLength = dumpster?.dimensions?.length || 22 // feet, default to 20yd
  const dumpsterWidth = dumpster?.dimensions?.width || 8   // feet

  // Check if we have valid coordinates
  const hasValidCoords = lat !== null && lat !== undefined &&
                         lng !== null && lng !== undefined &&
                         !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))

  const mapLat = hasValidCoords ? parseFloat(lat) : geocodedCoords?.lat
  const mapLng = hasValidCoords ? parseFloat(lng) : geocodedCoords?.lng

  // Geocode address if no coordinates provided
  useEffect(() => {
    if (!hasValidCoords && address && !geocodedCoords && !isGeocoding) {
      setIsGeocoding(true)

      // Use Google Geocoding API
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'OK' && data.results[0]) {
            const location = data.results[0].geometry.location
            setGeocodedCoords({ lat: location.lat, lng: location.lng })
          } else {
            console.error('[Map] Geocoding failed:', data.status)
          }
        })
        .catch(err => {
          console.error('[Map] Geocoding error:', err)
        })
        .finally(() => {
          setIsGeocoding(false)
        })
    }
  }, [hasValidCoords, address, geocodedCoords, isGeocoding])

  // Build rectangle path for dumpster footprint
  const getDumpsterRectanglePath = () => {
    if (!mapLat || !mapLng) return ''

    // Calculate half-dimensions in lat/lng
    const halfLengthLat = feetToLatOffset(dumpsterLength / 2)
    const halfWidthLng = feetToLngOffset(dumpsterWidth / 2, mapLat)

    // Rectangle corners (clockwise from top-left)
    const corners = [
      { lat: mapLat + halfLengthLat, lng: mapLng - halfWidthLng }, // top-left
      { lat: mapLat + halfLengthLat, lng: mapLng + halfWidthLng }, // top-right
      { lat: mapLat - halfLengthLat, lng: mapLng + halfWidthLng }, // bottom-right
      { lat: mapLat - halfLengthLat, lng: mapLng - halfWidthLng }, // bottom-left
      { lat: mapLat + halfLengthLat, lng: mapLng - halfWidthLng }, // close the path
    ]

    // Format: fillcolor:RRGGBBAA|color:RRGGBB|weight:N|lat,lng|lat,lng|...
    const pathPoints = corners.map(c => `${c.lat.toFixed(7)},${c.lng.toFixed(7)}`).join('|')
    return `fillcolor:0x22c55eAA|color:0xFFFFFF|weight:3|${pathPoints}`
  }

  // Build Google Static Maps URL
  const getStaticMapUrl = () => {
    if (!mapLat || !mapLng) return null

    const params = new URLSearchParams({
      center: `${mapLat},${mapLng}`,
      zoom: '20', // Zoom in more to see dumpster clearly
      size: '640x400',
      scale: '2', // High DPI
      maptype: 'satellite',
      key: GOOGLE_MAPS_KEY,
    })

    // Add dumpster rectangle path if we have placement coordinates
    if (hasValidCoords) {
      params.append('path', getDumpsterRectanglePath())
    } else {
      // Fallback to marker if just geocoded address
      params.append('markers', `color:green|${mapLat},${mapLng}`)
    }

    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
  }

  // Google Maps link for external viewing
  const getGoogleMapsLink = () => {
    if (mapLat && mapLng) {
      return `https://www.google.com/maps?q=${mapLat},${mapLng}`
    }
    if (address) {
      return `https://www.google.com/maps/search/${encodeURIComponent(address)}`
    }
    return null
  }

  const staticMapUrl = getStaticMapUrl()
  const googleMapsLink = getGoogleMapsLink()
  const isLoading = isGeocoding || (!imageLoaded && staticMapUrl && !imageError)

  return (
    <div className="w-full h-[300px] md:h-[400px] bg-dark-700 relative overflow-hidden">
      {/* Static Map Image */}
      {staticMapUrl && !imageError && (
        <img
          src={staticMapUrl}
          alt={`Satellite view of ${address || 'delivery location'}`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {/* Dumpster size label */}
      {imageLoaded && hasValidCoords && dumpster && (
        <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
          {dumpster.shortName || dumpster.name}
          <span className="ml-1.5 opacity-80">({dumpsterLength}' × {dumpsterWidth}')</span>
        </div>
      )}

      {/* Click to open in Google Maps */}
      {imageLoaded && googleMapsLink && (
        <a
          href={googleMapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 bg-dark-900/80 hover:bg-dark-900 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors backdrop-blur-sm"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Google Maps
        </a>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-700 z-10">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin mb-3" />
          <p className="text-dark-400 text-sm">
            {isGeocoding ? 'Finding location...' : 'Loading satellite view...'}
          </p>
        </div>
      )}

      {/* Error state or no location */}
      {(imageError || (!staticMapUrl && !isGeocoding)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-700 z-10 p-4">
          <AlertCircle className="w-10 h-10 text-yellow-400 mb-3" />
          <p className="text-white font-medium mb-1">
            {!address && !hasValidCoords ? 'No location provided' : 'Could not load satellite view'}
          </p>
          <p className="text-dark-400 text-sm text-center mb-4">
            {address || 'Address not available'}
          </p>
          {googleMapsLink && (
            <a
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1.5 bg-dark-600 px-4 py-2 rounded-lg"
            >
              <MapPin className="w-4 h-4" />
              View on Google Maps
            </a>
          )}
        </div>
      )}

      {/* Placement notes badge */}
      {imageLoaded && placementNotes && (
        <div className="absolute top-3 left-3 bg-dark-900/80 text-white text-xs px-3 py-2 rounded-lg max-w-[200px] backdrop-blur-sm">
          <span className="text-primary-400 font-medium">Placement: </span>
          {placementNotes}
        </div>
      )}
    </div>
  )
}
