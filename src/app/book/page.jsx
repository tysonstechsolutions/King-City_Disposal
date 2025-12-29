'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { config } from '../../config'
import {
  Truck,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Home,
  Hammer,
  HardHat,
  Building2,
  Package,
  Phone,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Plus,
  RotateCcw,
  RotateCw,
  Check,
  Mail,
  Loader2,
} from 'lucide-react'

const STEPS = [
  { id: 1, name: 'Project & Size', icon: Truck },
  { id: 2, name: 'Location', icon: MapPin },
  { id: 3, name: 'Date', icon: Calendar },
  { id: 4, name: 'Contact', icon: User },
  { id: 5, name: 'Review', icon: CheckCircle },
]

const projectIcons = {
  cleanout: Home,
  renovation: Hammer,
  roofing: HardHat,
  construction: Building2,
  other: Package
}

const GOOGLE_MAPS_KEY = config.googleMaps?.apiKey || "AIzaSyAAU2wsDoDPH4n9BNk_pWlxBla3irr_AtM"

export default function BookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showProhibited, setShowProhibited] = useState(false)
  const [preselectedFromUrl, setPreselectedFromUrl] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    projectType: '',
    dumpsterSize: '',
    rentalDuration: '3-day',
    address: '',
    placementLat: null,
    placementLng: null,
    placementNotes: '',
    deliveryDate: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    surcharges: {},
  })

  // Read URL params on mount to pre-select dumpster size
  useEffect(() => {
    const sizeParam = searchParams.get('size')
    if (sizeParam && !preselectedFromUrl) {
      // Validate that the size exists in config
      const validSize = config.dumpsters.find(d => d.id === sizeParam)
      if (validSize) {
        setFormData(prev => ({ ...prev, dumpsterSize: sizeParam }))
        setPreselectedFromUrl(true)
      }
    }
  }, [searchParams, preselectedFromUrl])

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false)
  const [dumpsterPlaced, setDumpsterPlaced] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [addressValidated, setAddressValidated] = useState(false)

  // Refs
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const polygonRef = useRef(null)
  const dumpsterCenterRef = useRef({ lat: 0, lng: 0 })
  const autocompleteRef = useRef(null)
  const addressInputRef = useRef(null)

  // Get recommended size based on project type
  const getRecommendedSize = () => {
    const project = config.projectTypes.find(p => p.id === formData.projectType)
    return project?.recommendedSize || null
  }

  // Calculate price
  const getPrice = () => {
    const dumpster = config.dumpsters.find(d => d.id === formData.dumpsterSize)
    return dumpster?.pricing[formData.rentalDuration] || 0
  }

  // Calculate surcharge total
  const getSurchargeTotal = () => {
    let total = 0
    Object.entries(formData.surcharges).forEach(([item, count]) => {
      const surcharge = config.surchargeItems.find(s => s.item === item)
      if (surcharge?.fee && count > 0) {
        total += surcharge.fee * count
      }
    })
    return total
  }

  // Calculate pickup date
  const getPickupDate = () => {
    if (!formData.deliveryDate) return null
    const delivery = new Date(formData.deliveryDate + 'T12:00:00')
    const days = formData.rentalDuration === '3-day' ? 3 : 7
    const pickup = new Date(delivery)
    pickup.setDate(pickup.getDate() + days)
    return pickup.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Generate available dates (next 14 days, excluding Sundays)
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 1; i <= 21; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      if (date.getDay() !== 0) { // Skip Sundays
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        })
      }
      if (dates.length >= 14) break
    }
    return dates
  }

  // Load Google Maps API
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!window.google?.maps) {
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry,geocoding`
        script.async = true
        document.head.appendChild(script)
      }
    }
  }, [])

  // Initialize autocomplete when on step 2
  useEffect(() => {
    if (currentStep !== 2 || !addressInputRef.current) return

    const initAutocomplete = () => {
      if (!window.google?.maps?.places) {
        setTimeout(initAutocomplete, 100)
        return
      }

      if (autocompleteRef.current) return

      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      })

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        if (place?.formatted_address) {
          setFormData(prev => ({ ...prev, address: place.formatted_address }))
          setAddressValidated(true)
          // Auto-load map after address is selected
          setTimeout(() => loadMap(place.formatted_address), 100)
        }
      })
    }

    initAutocomplete()
  }, [currentStep])

  // Cleanup map when leaving step 2
  useEffect(() => {
    if (currentStep !== 2) {
      if (polygonRef.current) {
        polygonRef.current.setMap(null)
        polygonRef.current = null
      }
      if (mapRef.current && mapContainerRef.current) {
        mapContainerRef.current.innerHTML = ''
        mapRef.current = null
      }
      setMapLoaded(false)
      // Don't reset dumpsterPlaced if we're past step 2
      if (currentStep < 2) {
        setDumpsterPlaced(false)
        setRotation(0)
      }
    }
  }, [currentStep])

  // Load map for address
  const loadMap = async (address) => {
    if (!window.google?.maps?.Geocoder) {
      // Wait for Google Maps to load
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (window.google?.maps?.Geocoder) {
            clearInterval(check)
            resolve()
          }
        }, 100)
        setTimeout(() => { clearInterval(check); resolve() }, 10000)
      })
    }

    if (!window.google?.maps?.Geocoder || !mapContainerRef.current) return

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) {
        setSubmitError('Could not find address. Please check and try again.')
        return
      }

      const location = results[0].geometry.location

      // Create map
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: location,
        zoom: 20,
        mapTypeId: 'hybrid',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      })
      mapRef.current = map

      // Add address marker
      new window.google.maps.Marker({
        position: location,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ffffff',
          fillOpacity: 1,
          strokeColor: '#22c55e',
          strokeWeight: 3,
        },
        title: 'Delivery Address'
      })

      setMapLoaded(true)
    })
  }

  // Calculate polygon corners
  const calculatePolygonCoords = (centerLat, centerLng, rotationDeg) => {
    const lengthFt = 22
    const widthFt = 8
    const lengthM = lengthFt * 0.3048
    const widthM = widthFt * 0.3048

    const metersPerDegreeLat = 111320
    const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180)
    const halfLengthDeg = (lengthM / 2) / metersPerDegreeLng
    const halfWidthDeg = (widthM / 2) / metersPerDegreeLat

    const corners = [
      { dx: -halfLengthDeg, dy: -halfWidthDeg },
      { dx: halfLengthDeg, dy: -halfWidthDeg },
      { dx: halfLengthDeg, dy: halfWidthDeg },
      { dx: -halfLengthDeg, dy: halfWidthDeg },
    ]

    const radians = (rotationDeg * Math.PI) / 180
    const cosR = Math.cos(radians)
    const sinR = Math.sin(radians)

    return corners.map(corner => {
      const rotatedDx = corner.dx * cosR - corner.dy * sinR
      const rotatedDy = corner.dx * sinR + corner.dy * cosR
      return {
        lat: centerLat + rotatedDy,
        lng: centerLng + rotatedDx
      }
    })
  }

  // Place dumpster on map
  const placeDumpster = () => {
    if (!mapRef.current || !window.google?.maps) return

    const map = mapRef.current
    const center = map.getCenter()
    const centerLat = center.lat()
    const centerLng = center.lng()

    dumpsterCenterRef.current = { lat: centerLat, lng: centerLng }

    const coords = calculatePolygonCoords(centerLat, centerLng, 0)

    const polygon = new window.google.maps.Polygon({
      paths: coords,
      map: map,
      draggable: true,
      geodesic: true,
      fillColor: '#22c55e',
      fillOpacity: 0.5,
      strokeColor: '#22c55e',
      strokeWeight: 3,
      strokeOpacity: 1,
    })

    polygonRef.current = polygon

    setFormData(prev => ({
      ...prev,
      placementLat: centerLat,
      placementLng: centerLng
    }))

    polygon.addListener('dragend', () => {
      const path = polygon.getPath()
      let sumLat = 0, sumLng = 0
      path.forEach(point => {
        sumLat += point.lat()
        sumLng += point.lng()
      })
      const newCenterLat = sumLat / 4
      const newCenterLng = sumLng / 4

      dumpsterCenterRef.current = { lat: newCenterLat, lng: newCenterLng }

      setFormData(prev => ({
        ...prev,
        placementLat: newCenterLat,
        placementLng: newCenterLng
      }))
    })

    setDumpsterPlaced(true)
    setRotation(0)
  }

  // Update polygon when rotation changes
  useEffect(() => {
    if (polygonRef.current && dumpsterPlaced) {
      const { lat, lng } = dumpsterCenterRef.current
      const newCoords = calculatePolygonCoords(lat, lng, rotation)
      polygonRef.current.setPath(newCoords)
    }
  }, [rotation, dumpsterPlaced])

  const rotateLeft = () => setRotation(prev => (prev - 15 + 360) % 360)
  const rotateRight = () => setRotation(prev => (prev + 15) % 360)

  // Validate current step
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.projectType && formData.dumpsterSize
      case 2:
        return formData.address && dumpsterPlaced
      case 3:
        return formData.deliveryDate
      case 4:
        return formData.customerName && formData.customerPhone
      case 5:
        return true
      default:
        return false
    }
  }

  // Handle step navigation
  const nextStep = () => {
    setSubmitError('')
    if (canProceed() && currentStep < 5) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    setSubmitError('')
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const totalPrice = getPrice() + getSurchargeTotal()

      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail || null,
          address: formData.address,
          placementLat: formData.placementLat,
          placementLng: formData.placementLng,
          placementNotes: formData.placementNotes || null,
          dumpsterSize: formData.dumpsterSize,
          rentalDuration: formData.rentalDuration,
          deliveryDate: formData.deliveryDate,
          priceCents: totalPrice * 100,
          projectType: formData.projectType,
          surcharges: formData.surcharges,
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl
        } else {
          router.push(`/payment-success?booking=${result.bookingId}`)
        }
      } else {
        setSubmitError(result.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      console.error('Booking error:', error)
      setSubmitError('Unable to submit booking. Please call us at ' + config.phone)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedDumpster = config.dumpsters.find(d => d.id === formData.dumpsterSize)
  const recommendedSize = getRecommendedSize()

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl text-white mb-2">
            BOOK YOUR <span className="text-gradient">DUMPSTER</span>
          </h1>
          <p className="text-dark-400">Quick & easy - takes about 2 minutes</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between relative">
            {/* Progress line background */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-dark-700" />
            {/* Progress line fill */}
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary-500 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-colors ${
                      isActive
                        ? 'bg-primary-500 text-white ring-4 ring-primary-500/30'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-dark-700 text-dark-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs hidden sm:block ${isActive ? 'text-white' : 'text-dark-400'}`}>
                    {step.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 mb-6">

          {/* Step 1: Project & Size */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">What's your project?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {config.projectTypes.map((project) => {
                    const Icon = projectIcons[project.id]
                    const isSelected = formData.projectType === project.id
                    return (
                      <button
                        key={project.id}
                        onClick={() => setFormData(prev => ({ ...prev, projectType: project.id }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-primary-400' : 'text-dark-400'}`} />
                        <p className="font-medium text-white text-sm">{project.label}</p>
                        <p className="text-xs text-dark-400">{project.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Choose your dumpster size</h2>
                <div className="space-y-3">
                  {config.dumpsters.map((dumpster) => {
                    const isSelected = formData.dumpsterSize === dumpster.id
                    const isRecommended = recommendedSize === dumpster.id
                    const price = dumpster.pricing[formData.rentalDuration]
                    return (
                      <button
                        key={dumpster.id}
                        onClick={() => setFormData(prev => ({ ...prev, dumpsterSize: dumpster.id }))}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500/10'
                            : isRecommended
                            ? 'border-green-500/50 bg-green-500/5 hover:border-green-500'
                            : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Truck className={`w-10 h-10 ${isSelected ? 'text-primary-400' : 'text-dark-400'}`} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-white">{dumpster.name}</p>
                                {isRecommended && formData.projectType && (
                                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-dark-400">
                                {dumpster.dimensions?.display || `${dumpster.dimensions?.length}ft × ${dumpster.dimensions?.width}ft`} &bull; {dumpster.weightIncluded} included
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary-400">${price}</p>
                            <p className="text-xs text-dark-400">{formData.rentalDuration === '3-day' ? '3-day' : '7-day'}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">Rental period</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['3-day', '7-day'].map((duration) => {
                    const isSelected = formData.rentalDuration === duration
                    const label = duration === '3-day' ? '3 Days' : '7 Days'
                    return (
                      <button
                        key={duration}
                        onClick={() => setFormData(prev => ({ ...prev, rentalDuration: duration }))}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                        }`}
                      >
                        <p className="font-bold text-white text-lg">{label}</p>
                        {selectedDumpster && (
                          <p className="text-primary-400 font-semibold">${selectedDumpster.pricing[duration]}</p>
                        )}
                        {duration === '7-day' && (
                          <p className="text-xs text-green-400 mt-1">Most popular</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address & Placement */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Delivery address</h2>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, address: e.target.value }))
                      setAddressValidated(false)
                      setMapLoaded(false)
                      setDumpsterPlaced(false)
                    }}
                    placeholder="Enter your address..."
                    className="input-field w-full pl-12"
                  />
                </div>
                <p className="text-xs text-dark-500 mt-2">Start typing and select from suggestions</p>
              </div>

              {/* Map Container - shows after address validated */}
              {(addressValidated || formData.address.length > 15) && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Where should we place the dumpster?</h3>
                    <p className="text-sm text-dark-400 mb-3">
                      Tap "Place Dumpster" then drag the green rectangle to the exact spot
                    </p>
                  </div>

                  <div className="bg-dark-700 rounded-xl overflow-hidden">
                    <div className="relative" style={{ height: '280px' }}>
                      <div ref={mapContainerRef} className="h-full w-full bg-dark-600" />

                      {!mapLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-600">
                          <Loader2 className="w-10 h-10 text-primary-400 animate-spin mb-3" />
                          <p className="text-white font-medium">Loading satellite view...</p>
                          <button
                            onClick={() => loadMap(formData.address)}
                            className="mt-3 text-primary-400 hover:underline text-sm"
                          >
                            Click to load map
                          </button>
                        </div>
                      )}

                      {mapLoaded && !dumpsterPlaced && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <button
                            onClick={placeDumpster}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"
                          >
                            <Plus className="w-5 h-5" />
                            Place Dumpster Here
                          </button>
                        </div>
                      )}

                      {dumpsterPlaced && (
                        <div className="absolute bottom-3 right-3 flex gap-2">
                          <button
                            onClick={rotateLeft}
                            className="w-10 h-10 bg-dark-800/90 hover:bg-dark-700 text-white rounded-full flex items-center justify-center shadow-lg"
                          >
                            <RotateCcw className="w-5 h-5 text-primary-400" />
                          </button>
                          <button
                            onClick={rotateRight}
                            className="w-10 h-10 bg-dark-800/90 hover:bg-dark-700 text-white rounded-full flex items-center justify-center shadow-lg"
                          >
                            <RotateCw className="w-5 h-5 text-primary-400" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-dark-800 border-t border-dark-600 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-3 bg-primary-500/60 border-2 border-primary-500 rounded-sm"></div>
                        <span className="text-sm text-dark-300">22ft × 8ft dumpster</span>
                      </div>
                      {dumpsterPlaced && <span className="text-primary-400 text-sm">Drag to reposition</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-400 mb-2">Placement notes (optional)</label>
                    <input
                      type="text"
                      value={formData.placementNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, placementNotes: e.target.value }))}
                      placeholder="e.g., Left side of driveway, near garage"
                      className="input-field w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Delivery Date */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">When do you need it?</h2>
                <p className="text-dark-400 text-sm mb-4">
                  Select your delivery date. We deliver between 8am-12pm.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {getAvailableDates().map((date) => {
                  const isSelected = formData.deliveryDate === date.value
                  return (
                    <button
                      key={date.value}
                      onClick={() => setFormData(prev => ({ ...prev, deliveryDate: date.value }))}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                      }`}
                    >
                      <Calendar className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-primary-400' : 'text-dark-400'}`} />
                      <p className="text-sm font-medium text-white">{date.label}</p>
                    </button>
                  )
                })}
              </div>

              {formData.deliveryDate && (
                <div className="bg-dark-700 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-dark-400 text-sm">Delivery</p>
                      <p className="text-white font-medium">
                        {new Date(formData.deliveryDate + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'long', month: 'short', day: 'numeric'
                        })}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-dark-500" />
                    <div className="text-right">
                      <p className="text-dark-400 text-sm">Pickup</p>
                      <p className="text-white font-medium">{getPickupDate()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-dark-400 mt-2 text-center">
                    {formData.rentalDuration === '3-day' ? '3' : '7'}-day rental period
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Contact Info */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Your contact info</h2>
                <p className="text-dark-400 text-sm mb-4">
                  We'll text you delivery updates and confirmation.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-400 mb-2">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="John Smith"
                      className="input-field w-full pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-dark-400 mb-2">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="(618) 555-1234"
                      className="input-field w-full pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-dark-400 mb-2">Email (optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="john@example.com"
                      className="input-field w-full pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Book */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Review your order</h2>

              {/* Order Summary */}
              <div className="bg-dark-700 rounded-xl p-4 space-y-3">
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-dark-400">Address</span>
                  <span className="text-white text-right max-w-[60%]">{formData.address}</span>
                </div>
                {formData.placementNotes && (
                  <div className="flex justify-between py-2 border-b border-dark-600">
                    <span className="text-dark-400">Placement</span>
                    <span className="text-white text-right max-w-[60%]">{formData.placementNotes}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-dark-400">Dumpster</span>
                  <span className="text-white">{selectedDumpster?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-dark-400">Weight Included</span>
                  <span className="text-white">{selectedDumpster?.weightIncluded}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-dark-400">Rental Period</span>
                  <span className="text-white">{formData.rentalDuration === '3-day' ? '3 Days' : '7 Days'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-dark-400">Delivery</span>
                  <span className="text-white">
                    {new Date(formData.deliveryDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-dark-400">Pickup</span>
                  <span className="text-white">{getPickupDate()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-600">
                  <span className="text-dark-400">Contact</span>
                  <span className="text-white text-right">
                    {formData.customerName}<br />
                    <span className="text-dark-300">{formData.customerPhone}</span>
                  </span>
                </div>
              </div>

              {/* Surcharges */}
              {config.surchargeItems.filter(s => s.fee).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Any of these items?</h3>
                  <p className="text-sm text-dark-400 mb-3">Additional fees apply for certain items</p>
                  <div className="space-y-2">
                    {config.surchargeItems.filter(s => s.fee).map((surcharge) => {
                      const count = formData.surcharges[surcharge.item] || 0
                      return (
                        <div
                          key={surcharge.item}
                          className="flex items-center justify-between bg-dark-700 rounded-lg p-3"
                        >
                          <div>
                            <p className="text-white">{surcharge.item}</p>
                            <p className="text-sm text-dark-400">${surcharge.fee} {surcharge.unit}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                surcharges: {
                                  ...prev.surcharges,
                                  [surcharge.item]: Math.max(0, count - 1)
                                }
                              }))}
                              className="w-8 h-8 bg-dark-600 hover:bg-dark-500 rounded-full flex items-center justify-center text-white"
                            >
                              -
                            </button>
                            <span className="text-white w-6 text-center">{count}</span>
                            <button
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                surcharges: {
                                  ...prev.surcharges,
                                  [surcharge.item]: count + 1
                                }
                              }))}
                              className="w-8 h-8 bg-dark-600 hover:bg-dark-500 rounded-full flex items-center justify-center text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Prohibited Items - Collapsible */}
              <div className="bg-dark-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowProhibited(!showProhibited)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-white font-medium">What can't go in?</span>
                  </div>
                  {showProhibited ? (
                    <ChevronUp className="w-5 h-5 text-dark-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-dark-400" />
                  )}
                </button>
                {showProhibited && (
                  <div className="px-4 pb-4 border-t border-dark-600">
                    <ul className="text-sm text-dark-300 space-y-1 mt-3">
                      {config.prohibitedItems.slice(0, 10).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-400">✕</span>
                          <span>{item.item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-dark-400 mt-3">
                      Prohibited items found in dumpster = additional fees. When in doubt, ask first!
                    </p>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-dark-300">Dumpster Rental</p>
                    {getSurchargeTotal() > 0 && (
                      <p className="text-dark-300">Surcharges</p>
                    )}
                    <p className="text-white font-bold text-lg mt-2">Total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">${getPrice()}</p>
                    {getSurchargeTotal() > 0 && (
                      <p className="text-white">${getSurchargeTotal()}</p>
                    )}
                    <p className="text-primary-400 font-bold text-2xl mt-2">
                      ${getPrice() + getSurchargeTotal()}
                    </p>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 sm:flex-initial bg-dark-700 hover:bg-dark-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          )}

          {currentStep < 5 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                canProceed()
                  ? 'btn-primary'
                  : 'bg-dark-600 text-dark-400 cursor-not-allowed'
              }`}
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 btn-accent py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Book Now - ${getPrice() + getSurchargeTotal()}
                </>
              )}
            </button>
          )}
        </div>

        {/* Call us */}
        <div className="text-center mt-6">
          <p className="text-dark-400 text-sm">
            Need help? Call us at{' '}
            <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline">
              {config.phone}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
