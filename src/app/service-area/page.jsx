'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { config } from '../../config'
import { MapPin, Phone, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'

// Service area center coordinates (Mount Vernon, IL)
const SERVICE_CENTER = { lat: 38.3172, lng: -88.9031 }
const SERVICE_RADIUS_MILES = config.serviceRadius || 30

export default function ServiceAreaPage() {
  const mapRef = useRef(null)
  const mapContainerRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    // Load Google Maps
    const loadMap = () => {
      if (!window.google?.maps || !mapContainerRef.current) {
        return
      }

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: SERVICE_CENTER,
        zoom: 9,
        mapTypeId: 'roadmap',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6a6a7a' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e1a' }] },
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
        disableDefaultUI: true,
        zoomControl: true,
      })

      mapRef.current = map

      // Add service area circle
      new window.google.maps.Circle({
        map: map,
        center: SERVICE_CENTER,
        radius: SERVICE_RADIUS_MILES * 1609.34, // Convert miles to meters
        fillColor: '#3d8b64',
        fillOpacity: 0.15,
        strokeColor: '#3d8b64',
        strokeOpacity: 0.8,
        strokeWeight: 2,
      })

      // Add center marker
      new window.google.maps.Marker({
        position: SERVICE_CENTER,
        map: map,
        title: config.businessName,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3d8b64',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      })

      setMapLoaded(true)
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      loadMap()
    } else {
      // Wait for it to load
      const checkGoogle = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkGoogle)
          loadMap()
        }
      }, 100)

      // Load script if not present
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMaps?.apiKey || ''}&libraries=places`
        script.async = true
        document.head.appendChild(script)
      }

      return () => clearInterval(checkGoogle)
    }
  }, [])
  // Helper to create URL-friendly slug from town name
  const slugify = (town) => {
    return town
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  // Group towns by first letter for easy scanning
  const groupedTowns = config.serviceTowns.reduce((acc, town) => {
    const letter = town[0].toUpperCase()
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(town)
    return acc
  }, {})

  return (
    <>
      {/* Hero */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Service Area
            </h1>
            <p className="text-xl text-white/90">
              We deliver dumpsters throughout Southern Illinois. If you&apos;re within{' '}
              {config.serviceRadius} miles of {config.address.city}, we&apos;ve got you covered.
            </p>
          </div>
        </div>
      </section>

      {/* Map placeholder + service radius */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Map */}
            <div className="bg-dark-900 rounded-xl overflow-hidden h-96 border border-dark-700 relative">
              <div ref={mapContainerRef} className="w-full h-full" />
              {!mapLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-900">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                  <p className="text-dark-400">Loading map...</p>
                </div>
              )}
              {/* Legend */}
              <div className="absolute bottom-3 left-3 bg-dark-900/90 rounded-lg px-3 py-2 border border-dark-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary/30 border-2 border-primary"></div>
                  <span className="text-dark-300 text-sm">{config.serviceRadius}-mile service area</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Delivering to Your Door
              </h2>
              <p className="text-dark-300 mb-6">
                Based in {config.address.city}, Illinois, we serve homeowners, contractors,
                and businesses throughout the region. Same-day and next-day delivery
                available for most locations.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Same-Day Delivery</p>
                    <p className="text-dark-400 text-sm">
                      Order before noon for same-day delivery (availability varies)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">No Mileage Fees</p>
                    <p className="text-dark-400 text-sm">
                      Delivery is included in your rental price — no extra charges
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Flexible Placement</p>
                    <p className="text-dark-400 text-sm">
                      Driveway, street, job site — we&apos;ll put it where you need it
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/10 rounded-xl p-6 border border-primary-200">
                <p className="text-dark-200 mb-4">
                  Not sure if we deliver to your area?
                </p>
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Call {config.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Towns List */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Towns We Serve
            </h2>
            <p className="text-dark-300 max-w-2xl mx-auto">
              From small towns to bigger cities, we deliver dumpsters across Southern Illinois.
              Don&apos;t see your town? Give us a call — we probably cover it!
            </p>
          </div>

          {/* Alphabetical town grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {Object.entries(groupedTowns).sort().map(([letter, towns]) => (
              <div key={letter}>
                <h3 className="text-2xl font-bold text-primary mb-3 border-b border-dark-700 pb-2">
                  {letter}
                </h3>
                <ul className="space-y-1">
                  {towns.sort().map((town) => (
                    <li key={town}>
                      <Link
                        href={`/dumpster-rental/${slugify(town)}-il`}
                        className="text-dark-300 hover:text-primary transition-colors inline-flex items-center gap-1 group"
                      >
                        <MapPin className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {town}, IL
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-dark-400 mb-4">
              Live outside these areas? We may still be able to help!
            </p>
            <a
              href={`tel:${config.phoneRaw}`}
              className="text-primary hover:text-primary-700 font-semibold"
            >
              Call {config.phone} to check availability
            </a>
          </div>
        </div>
      </section>

      {/* Service-specific pages for SEO */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Dumpster Rental by City
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {config.serviceTowns.slice(0, 12).map((town) => (
              <Link
                key={town}
                href={`/dumpster-rental/${slugify(town)}-il`}
                className="bg-dark-900 rounded-xl p-6 border border-dark-700 hover:border-primary transition-all group"
              >
                <h3 className="font-semibold text-white mb-2 group-hover:text-primary transition-colors">
                  Dumpster Rental in {town}, IL
                </h3>
                <p className="text-dark-400 text-sm mb-4">
                  Fast, affordable dumpster rentals delivered to {town} and surrounding areas.
                </p>
                <span className="text-primary group-hover:text-primary-300 text-sm inline-flex items-center gap-1 font-medium">
                  View {town} pricing
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>

          {/* Show all cities link */}
          <div className="text-center mt-8">
            <p className="text-dark-400 mb-2">
              We serve {config.serviceTowns.length}+ towns across Southern Illinois
            </p>
            <Link
              href="#towns"
              className="text-primary hover:text-primary-300 font-medium inline-flex items-center gap-1"
              onClick={(e) => {
                e.preventDefault()
                document.querySelector('.grid.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              View all service areas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get a Dumpster?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Enter your address in our booking tool to confirm we deliver to your location
            and get an instant quote.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Get Your Quote
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`tel:${config.phoneRaw}`}
              className="inline-flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold py-4 px-8 rounded-lg transition-colors border border-primary-500"
            >
              <Phone className="w-5 h-5" />
              {config.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
