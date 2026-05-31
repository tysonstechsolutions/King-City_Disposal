'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { config } from '../../config'
import { track, getAttribution, captureAttribution } from '../../lib/analytics'
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
  AlertCircle,
  Shield,
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

const GOOGLE_MAPS_KEY = config.googleMaps?.apiKey || ""

// Wrapper component to handle Suspense boundary for useSearchParams
export default function BookingPage() {
  return (
    <Suspense fallback={<BookingPageLoading />}>
      <BookingPageContent />
    </Suspense>
  )
}

function BookingPageLoading() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

function BookingPageContent() {
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
    rentalDuration: '10-day',
    address: '',
    placementLat: null,
    placementLng: null,
    placementNotes: '',
    deliveryDate: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    smsConsent: false,
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

  // Availability state
  const [availability, setAvailability] = useState({}) // { '20yd': { total: 3, booked: 1, available: 2 }, ... }
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // Refs
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const polygonRef = useRef(null)
  const dumpsterCenterRef = useRef({ lat: 0, lng: 0 })
  const rotationRef = useRef(0)
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

  // Calculate pickup date based on the customer's actual rental duration
  // (not the hardcoded 10-day default — that lied to anyone choosing 5-day
  // or 14-day rentals).
  const getPickupDate = () => {
    if (!formData.deliveryDate) return null
    const delivery = new Date(formData.deliveryDate + 'T12:00:00')
    const durationMatch = (formData.rentalDuration || '').match(/(\d+)-day/i)
    const days = durationMatch ? parseInt(durationMatch[1], 10) : 10
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

  // Fetch availability when date changes
  const fetchAvailability = async (date) => {
    if (!date) return
    setLoadingAvailability(true)
    try {
      const response = await fetch(`/api/availability?date=${date}`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data)
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  // Check availability when date changes
  useEffect(() => {
    if (formData.deliveryDate) {
      fetchAvailability(formData.deliveryDate)
    }
  }, [formData.deliveryDate])

  // Get availability info for a size
  const getAvailabilityForSize = (size) => {
    return availability[size] || { total: 0, booked: 0, available: 0 }
  }

  // Check if size is sold out
  const isSoldOut = (size) => {
    if (!formData.deliveryDate || Object.keys(availability).length === 0) return false
    const avail = getAvailabilityForSize(size)
    return avail.available === 0
  }

  // Check if size is low availability (1-2 left)
  const isLowAvailability = (size) => {
    if (!formData.deliveryDate || Object.keys(availability).length === 0) return false
    const avail = getAvailabilityForSize(size)
    return avail.available > 0 && avail.available <= 2
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
          strokeColor: '#3d8b64',
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
      draggable: false, // Disabled for mobile - use pan instead
      clickable: false,
      geodesic: true,
      fillColor: '#3d8b64',
      fillOpacity: 0.5,
      strokeColor: '#3d8b64',
      strokeWeight: 3,
      strokeOpacity: 1,
    })

    polygonRef.current = polygon

    setFormData(prev => ({
      ...prev,
      placementLat: centerLat,
      placementLng: centerLng
    }))

    // Update polygon position when map is panned (mobile-friendly)
    map.addListener('center_changed', () => {
      if (!polygonRef.current) return
      const newCenter = map.getCenter()
      const newLat = newCenter.lat()
      const newLng = newCenter.lng()

      dumpsterCenterRef.current = { lat: newLat, lng: newLng }

      const newCoords = calculatePolygonCoords(newLat, newLng, rotationRef.current)
      polygonRef.current.setPath(newCoords)

      setFormData(prev => ({
        ...prev,
        placementLat: newLat,
        placementLng: newLng
      }))
    })

    setDumpsterPlaced(true)
    setRotation(0)
    rotationRef.current = 0
  }

  // Update polygon when rotation changes
  useEffect(() => {
    if (polygonRef.current && dumpsterPlaced) {
      const { lat, lng } = dumpsterCenterRef.current
      const newCoords = calculatePolygonCoords(lat, lng, rotation)
      polygonRef.current.setPath(newCoords)
      rotationRef.current = rotation
    }
  }, [rotation, dumpsterPlaced])

  const rotateLeft = () => setRotation(prev => {
    const newRotation = (prev - 15 + 360) % 360
    rotationRef.current = newRotation
    return newRotation
  })
  const rotateRight = () => setRotation(prev => {
    const newRotation = (prev + 15) % 360
    rotationRef.current = newRotation
    return newRotation
  })

  // Validate current step
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Also check that selected size is available if date is set
        if (formData.deliveryDate && formData.dumpsterSize) {
          if (isSoldOut(formData.dumpsterSize)) return false
        }
        return formData.projectType && formData.dumpsterSize
      case 2:
        // Name, email, address, and dumpster placement required
        return formData.customerName && formData.customerEmail && formData.address && dumpsterPlaced
      case 3:
        // Check availability for selected date and size
        if (formData.deliveryDate && formData.dumpsterSize) {
          if (isSoldOut(formData.dumpsterSize)) return false
        }
        return formData.deliveryDate
      case 4:
        return formData.customerPhone && formData.smsConsent
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
      const attribution = (typeof window !== 'undefined') ? getAttribution() : {}

      // Fire conversion event before redirecting to Stripe — by the time the
      // user lands back on payment-success the GA session may have rotated,
      // so capture the funnel step here too.
      track('booking_submitted', {
        value: totalPrice,
        currency: 'USD',
        dumpster_size: formData.dumpsterSize,
        rental_duration: formData.rentalDuration,
      })

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
          // Attribution: which ad/campaign/page brought the customer here.
          // The booking API persists these so the owner can attribute revenue.
          attribution,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Online bookings always require payment
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl
        } else {
          // This should never happen - payment is required
          setSubmitError('Payment checkout unavailable. Please call us at ' + config.phone)
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Book Your Dumpster
          </h1>
          <p className="text-dark-400">Quick & easy - takes about 2 minutes</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label={`Booking step ${currentStep} of ${STEPS.length}`}>
          {/* Mobile-visible step counter — step name labels below are
              hidden on small screens, so this gives the user clear
              "where am I" context on phones (where most book). */}
          <div className="sm:hidden flex items-center justify-between mb-3 text-sm">
            <span className="text-primary font-semibold">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-dark-300">
              {STEPS.find(s => s.id === currentStep)?.name}
            </span>
          </div>
          <div className="flex justify-between relative">
            {/* Progress line background */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-dark-700" />
            {/* Progress line fill */}
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300"
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
                        ? 'bg-primary text-white ring-4 ring-primary/30'
                        : isCompleted
                        ? 'bg-primary text-white'
                        : 'bg-dark-700 text-dark-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs hidden sm:block ${isActive ? 'text-white font-medium' : 'text-dark-500'}`}>
                    {step.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 mb-6 shadow-sm">

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
                        onClick={() => {
                          // Auto-select recommended dumpster size when project type is selected
                          const recommended = project.recommendedSize
                          setFormData(prev => ({
                            ...prev,
                            projectType: project.id,
                            // Only auto-select if no size selected yet, or if changing project type
                            dumpsterSize: recommended || prev.dumpsterSize
                          }))
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-primary' : 'text-dark-400'}`} />
                        <p className="font-medium text-white text-sm">{project.label}</p>
                        <p className="text-xs text-dark-400">{project.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Choose your dumpster size</h2>
                {formData.deliveryDate && loadingAvailability && (
                  <div className="flex items-center gap-2 text-dark-400 text-sm mb-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking availability...
                  </div>
                )}
                <div className="space-y-3">
                  {config.dumpsters.map((dumpster) => {
                    const isSelected = formData.dumpsterSize === dumpster.id
                    const isRecommended = recommendedSize === dumpster.id
                    const price = dumpster.pricing[formData.rentalDuration]
                    const soldOut = isSoldOut(dumpster.id)
                    const lowStock = isLowAvailability(dumpster.id)
                    const avail = getAvailabilityForSize(dumpster.id)

                    return (
                      <button
                        key={dumpster.id}
                        onClick={() => {
                          if (!soldOut) {
                            setFormData(prev => ({ ...prev, dumpsterSize: dumpster.id }))
                          }
                        }}
                        disabled={soldOut}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          soldOut
                            ? 'border-dark-600 bg-dark-700 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-primary bg-primary/10'
                            : isRecommended
                            ? 'border-green-500/50 bg-green-500/10 hover:border-green-500'
                            : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Truck className={`w-10 h-10 ${soldOut ? 'text-dark-500' : isSelected ? 'text-primary' : 'text-dark-400'}`} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-semibold ${soldOut ? 'text-dark-500' : 'text-white'}`}>{dumpster.name}</p>
                                {isRecommended && formData.projectType && !soldOut && (
                                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                    Recommended
                                  </span>
                                )}
                                {soldOut && formData.deliveryDate && (
                                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                                    Sold out for this date
                                  </span>
                                )}
                                {lowStock && !soldOut && formData.deliveryDate && (
                                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                                    Only {avail.available} left!
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm ${soldOut ? 'text-dark-500' : 'text-dark-400'}`}>
                                {dumpster.dimensions?.display || `${dumpster.dimensions?.length}ft × ${dumpster.dimensions?.width}ft`} &bull; {dumpster.weightIncluded} included
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${soldOut ? 'text-dark-500' : 'text-primary'}`}>${price}</p>
                            <p className="text-xs text-dark-400">10-day rental</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Step 2: Address & Contact */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Local company notice */}
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">You're booking directly with us</p>
                  <p className="text-dark-300 text-xs">We're a local family-owned company in Southern IL - not a broker or middleman.</p>
                </div>
              </div>

              {/* Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2 font-medium">Your Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="John Smith"
                      className="w-full pl-10 px-4 py-3 border border-dark-600 bg-dark-700 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2 font-medium">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="john@example.com"
                      className="w-full pl-10 px-4 py-3 border border-dark-600 bg-dark-700 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
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
                    className="w-full pl-12 px-4 py-3 border border-dark-600 bg-dark-700 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-dark-400 mt-2">Start typing and select from suggestions</p>
              </div>

              {/* Map Container - shows after address validated */}
              {(addressValidated || formData.address.length > 15) && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Where should we place the dumpster?</h3>
                    <p className="text-sm text-dark-400 mb-3">
                      Tap the button below to drop the dumpster on the map, then drag the map to position it exactly where you want it.
                    </p>
                  </div>

                  <div className="bg-dark-700 rounded-xl overflow-hidden border border-dark-600">
                    <div className="relative" style={{ height: '280px' }}>
                      <div ref={mapContainerRef} className="h-full w-full bg-dark-600" />

                      {!mapLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-700">
                          <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                          <p className="text-white font-medium">Loading satellite view...</p>
                          <button
                            onClick={() => loadMap(formData.address)}
                            className="mt-3 text-primary hover:underline text-sm"
                          >
                            Click to load map
                          </button>
                        </div>
                      )}

                      {mapLoaded && !dumpsterPlaced && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <button
                            onClick={placeDumpster}
                            className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-xl font-bold flex flex-col items-center gap-1 shadow-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="w-5 h-5" />
                              Drop Dumpster on Map
                            </div>
                            <span className="text-xs font-normal text-white/70">Then drag the map to reposition</span>
                          </button>
                        </div>
                      )}

                      {dumpsterPlaced && (
                        <div className="absolute bottom-3 right-3 flex gap-2">
                          <button
                            onClick={rotateLeft}
                            className="w-10 h-10 bg-dark-800/90 hover:bg-dark-800 text-white rounded-full flex items-center justify-center shadow-lg border border-dark-600"
                          >
                            <RotateCcw className="w-5 h-5 text-primary" />
                          </button>
                          <button
                            onClick={rotateRight}
                            className="w-10 h-10 bg-dark-800/90 hover:bg-dark-800 text-white rounded-full flex items-center justify-center shadow-lg border border-dark-600"
                          >
                            <RotateCw className="w-5 h-5 text-primary" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-dark-800 border-t border-dark-600 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-3 bg-primary/50 border-2 border-primary rounded-sm"></div>
                        <span className="text-sm text-dark-300">22ft × 8ft dumpster</span>
                      </div>
                      {dumpsterPlaced && <span className="text-primary text-sm font-medium">Pan map to position</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Placement notes (optional)</label>
                    <input
                      type="text"
                      value={formData.placementNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, placementNotes: e.target.value }))}
                      placeholder="e.g., Left side of driveway, near garage"
                      className="w-full px-4 py-3 border border-dark-600 bg-dark-700 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
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
                  Pick a delivery date below. We deliver between 8am-12pm. Your 10-day rental starts on delivery day.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {getAvailableDates().map((date) => {
                  const isSelected = formData.deliveryDate === date.value
                  const d = new Date(date.value + 'T12:00:00')
                  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
                  const month = d.toLocaleDateString('en-US', { month: 'short' })
                  const day = d.getDate()
                  return (
                    <button
                      key={date.value}
                      onClick={() => setFormData(prev => ({ ...prev, deliveryDate: date.value }))}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                      }`}
                    >
                      <p className={`text-xs font-medium uppercase ${isSelected ? 'text-primary' : 'text-dark-400'}`}>{weekday}</p>
                      <p className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-dark-200'}`}>{day}</p>
                      <p className={`text-xs ${isSelected ? 'text-primary' : 'text-dark-400'}`}>{month}</p>
                    </button>
                  )
                })}
              </div>

              {formData.deliveryDate && (
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="text-xs text-dark-400 uppercase font-medium mb-1">Delivery</p>
                        <p className="text-white font-semibold text-lg">
                          {new Date(formData.deliveryDate + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-dark-400 mt-0.5">8am - 12pm</p>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <ArrowRight className="w-5 h-5 text-primary" />
                        <p className="text-xs text-primary font-medium mt-1">10 days</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-xs text-dark-400 uppercase font-medium mb-1">Pickup</p>
                        <p className="text-white font-semibold text-lg">{getPickupDate()}</p>
                        <p className="text-xs text-dark-400 mt-0.5">Extensions available</p>
                      </div>
                    </div>
                  </div>

                  {/* Availability warning */}
                  {loadingAvailability && (
                    <div className="flex items-center gap-2 text-dark-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking availability for your selected size...
                    </div>
                  )}

                  {!loadingAvailability && isSoldOut(formData.dumpsterSize) && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-medium">
                          {selectedDumpster?.name || 'This size'} is sold out for this date
                        </p>
                        <p className="text-red-400/80 text-sm mt-1">
                          Please go back and choose a different size, or select another delivery date.
                        </p>
                      </div>
                    </div>
                  )}

                  {!loadingAvailability && isLowAvailability(formData.dumpsterSize) && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-400 font-medium">
                          Only {getAvailabilityForSize(formData.dumpsterSize).available} left for this date!
                        </p>
                        <p className="text-amber-400/80 text-sm mt-1">
                          Book now to secure your {selectedDumpster?.name || 'dumpster'}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Phone Number */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Your phone number</h2>
                <p className="text-dark-400 text-sm mb-4">
                  We'll text you delivery updates and confirmation.
                </p>
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-2 font-medium">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="(618) 555-1234"
                    className="w-full pl-10 px-4 py-3 border border-dark-600 bg-dark-700 text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors text-lg"
                  />
                </div>
              </div>

              {/* SMS Consent Checkbox - Required for Twilio A2P 10DLC compliance */}
              <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.smsConsent || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, smsConsent: e.target.checked }))}
                    className="mt-1 w-5 h-5 rounded border-dark-500 bg-dark-600 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="text-sm">
                    <span className="text-white font-medium">I agree to receive text messages from {config.businessName}</span>
                    <p className="text-dark-400 mt-1">
                      By checking this box, you consent to receive SMS messages from King City Disposal including booking confirmations, delivery updates, pickup reminders, and invoice notifications. Message frequency varies. Message and data rates may apply.
                    </p>
                    <p className="text-dark-400 mt-2">
                      Reply STOP to opt out at any time. Reply HELP for assistance. View our <a href="/sms-terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SMS Terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.
                    </p>
                  </div>
                </label>
              </div>

              {/* Show who they are */}
              <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                <p className="text-dark-400 text-sm">Booking for:</p>
                <p className="text-white font-medium">{formData.customerName}</p>
                <p className="text-dark-300 text-sm">{formData.customerEmail}</p>
              </div>
            </div>
          )}

          {/* Step 5: Review & Book */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Review your order</h2>

              {/* Order Summary */}
              <div className="bg-dark-700 rounded-xl p-4 space-y-3 border border-dark-600">
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
                  <span className="text-white">10 Days</span>
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
                          className="flex items-center justify-between bg-dark-700 rounded-lg p-3 border border-dark-600"
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
              <div className="bg-dark-700 rounded-xl overflow-hidden border border-dark-600">
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
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
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
                    <p className="text-primary font-bold text-2xl mt-2">
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

        {/* Spacer for fixed bottom nav */}
        <div className="h-24"></div>
      </div>

      {/* Fixed Navigation Buttons - Always visible at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-dark-900 border-t border-dark-700 p-4 z-50">
        <div className="max-w-2xl mx-auto flex gap-4">
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 sm:flex-initial bg-dark-700 hover:bg-dark-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors border border-dark-600"
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
                  ? 'bg-primary hover:bg-primary/90 text-white'
                  : 'bg-dark-700 text-dark-500 cursor-not-allowed'
              }`}
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
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
      </div>
    </div>
  )
}
