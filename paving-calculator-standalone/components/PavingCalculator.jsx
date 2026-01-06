'use client'

import { useState, useEffect, useRef } from 'react'
import { pavingConfig } from '../config/paving-config'

// ============================================
// PAVING AREA CALCULATOR COMPONENT
// ============================================
//
// A multi-step form for calculating paving/sealcoating/line striping estimates
// Similar to dumpster placement tool - lets customers draw area on satellite map
// Sends SMS to owner with quote details
//
// INTEGRATION:
// 1. Copy this component to your project
// 2. Update config/paving-config.js with your pricing
// 3. Add the API endpoint (api/paving-quote)
// 4. Set environment variables for Twilio SMS
//
// ============================================

const STEPS = [
  { id: 1, name: 'Service' },
  { id: 2, name: 'Area' },
  { id: 3, name: 'Location' },
  { id: 4, name: 'Contact' },
  { id: 5, name: 'Estimate' },
]

export default function PavingCalculator() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [showBenefits, setShowBenefits] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Service
    serviceType: '',
    projectType: '',

    // Step 2: Area measurement
    measurementMethod: 'dimensions',
    length: '',
    width: '',
    squareFootage: '',
    // For line striping
    numStalls: '',
    numHandicapSymbols: '',
    linearFeet: '',

    // Step 3: Location
    address: '',
    condition: 'unknown',
    notes: '',

    // Step 4: Contact
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    preferredContact: 'phone',
  })

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false)
  const [polygonArea, setPolygonArea] = useState(null)

  // Refs
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const drawingManagerRef = useRef(null)
  const polygonRef = useRef(null)
  const autocompleteRef = useRef(null)
  const addressInputRef = useRef(null)

  // Get selected service config
  const getSelectedService = () => {
    return pavingConfig.services?.find(s => s.id === formData.serviceType)
  }

  // Calculate square footage
  const getSquareFootage = () => {
    if (formData.measurementMethod === 'map' && polygonArea) {
      return Math.round(polygonArea)
    }
    if (formData.squareFootage) {
      return parseFloat(formData.squareFootage)
    }
    if (formData.length && formData.width) {
      return parseFloat(formData.length) * parseFloat(formData.width)
    }
    return 0
  }

  // Calculate estimate
  const calculateEstimate = () => {
    const service = getSelectedService()
    if (!service) return null

    let basePrice = 0

    if (formData.serviceType === 'linestriping') {
      const stalls = parseInt(formData.numStalls) || 0
      const symbols = parseInt(formData.numHandicapSymbols) || 0
      const linearFt = parseInt(formData.linearFeet) || 0

      basePrice = (stalls * service.pricePerStall) +
                  (symbols * service.pricePerSymbol) +
                  (linearFt * service.pricePerLinearFt)

      basePrice = Math.max(basePrice, service.minPrice)
    } else {
      const sqft = getSquareFootage()
      if (sqft <= 0) return null

      basePrice = sqft * service.pricePerSqFt
      basePrice = Math.max(basePrice, service.minPrice)
    }

    const condition = pavingConfig.conditions?.find(c => c.id === formData.condition)
    const conditionAdjustment = condition?.adjustment || 0

    const buffer = service.estimateBuffer
    const lowEstimate = Math.round(basePrice * (1 - buffer))
    const highEstimate = Math.round(basePrice * (1 + buffer + conditionAdjustment))

    return { basePrice: Math.round(basePrice), lowEstimate, highEstimate, service }
  }

  // Load Google Maps API
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!window.google?.maps) {
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${pavingConfig.googleMaps?.apiKey}&libraries=places,geometry,drawing`
        script.async = true
        document.head.appendChild(script)
      }
    }
  }, [])

  // Initialize autocomplete when on step 3
  useEffect(() => {
    if (currentStep !== 3 || !addressInputRef.current) return

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
        }
      })
    }

    initAutocomplete()
  }, [currentStep])

  // Initialize map for area drawing
  useEffect(() => {
    if (currentStep !== 2 || formData.measurementMethod !== 'map') return
    if (!mapContainerRef.current) return

    const initMap = async () => {
      if (!window.google?.maps) {
        await new Promise((resolve) => {
          const check = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(check)
              resolve()
            }
          }, 100)
          setTimeout(() => { clearInterval(check); resolve() }, 10000)
        })
      }

      if (!window.google?.maps || !mapContainerRef.current) return

      const center = pavingConfig.serviceAreaCenter || { lat: 38.3170, lng: -88.9031 }

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom: 18,
        mapTypeId: 'hybrid',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      })
      mapRef.current = map

      const drawingManager = new window.google.maps.drawing.DrawingManager({
        drawingMode: window.google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
          position: window.google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
        },
        polygonOptions: {
          fillColor: '#3d8b64',
          fillOpacity: 0.3,
          strokeColor: '#3d8b64',
          strokeWeight: 3,
          clickable: true,
          editable: true,
          draggable: true,
        },
      })

      drawingManager.setMap(map)
      drawingManagerRef.current = drawingManager

      window.google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon) => {
        if (polygonRef.current) {
          polygonRef.current.setMap(null)
        }
        polygonRef.current = polygon

        const area = window.google.maps.geometry.spherical.computeArea(polygon.getPath())
        const sqft = area * 10.7639
        setPolygonArea(sqft)
        setFormData(prev => ({ ...prev, squareFootage: Math.round(sqft).toString() }))

        window.google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
          const newArea = window.google.maps.geometry.spherical.computeArea(polygon.getPath())
          const newSqft = newArea * 10.7639
          setPolygonArea(newSqft)
          setFormData(prev => ({ ...prev, squareFootage: Math.round(newSqft).toString() }))
        })

        window.google.maps.event.addListener(polygon.getPath(), 'insert_at', () => {
          const newArea = window.google.maps.geometry.spherical.computeArea(polygon.getPath())
          const newSqft = newArea * 10.7639
          setPolygonArea(newSqft)
          setFormData(prev => ({ ...prev, squareFootage: Math.round(newSqft).toString() }))
        })

        drawingManager.setDrawingMode(null)
      })

      setMapLoaded(true)
    }

    initMap()

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null)
        polygonRef.current = null
      }
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null)
        drawingManagerRef.current = null
      }
      if (mapRef.current) {
        mapRef.current = null
      }
      setMapLoaded(false)
    }
  }, [currentStep, formData.measurementMethod])

  // Validate current step
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.serviceType && formData.projectType
      case 2:
        if (formData.serviceType === 'linestriping') {
          return (formData.numStalls || formData.linearFeet)
        }
        return getSquareFootage() > 0
      case 3:
        return formData.address && formData.condition
      case 4:
        return formData.customerName && formData.customerPhone
      case 5:
        return true
      default:
        return false
    }
  }

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

  // Submit quote request
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const estimate = calculateEstimate()
      const sqft = getSquareFootage()

      const response = await fetch('/api/paving-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: formData.serviceType,
          projectType: formData.projectType,
          squareFootage: sqft,
          numStalls: formData.numStalls ? parseInt(formData.numStalls) : null,
          numHandicapSymbols: formData.numHandicapSymbols ? parseInt(formData.numHandicapSymbols) : null,
          linearFeet: formData.linearFeet ? parseInt(formData.linearFeet) : null,
          address: formData.address,
          condition: formData.condition,
          notes: formData.notes,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
          preferredContact: formData.preferredContact,
          estimateLow: estimate?.lowEstimate,
          estimateHigh: estimate?.highEstimate,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSubmitSuccess(true)
      } else {
        setSubmitError(result.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      console.error('Quote submission error:', error)
      setSubmitError('Unable to submit request. Please call us at ' + pavingConfig.business.phone)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Clear polygon
  const clearPolygon = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    setPolygonArea(null)
    setFormData(prev => ({ ...prev, squareFootage: '' }))
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON)
    }
  }

  const selectedService = getSelectedService()
  const estimate = calculateEstimate()
  const sqft = getSquareFootage()

  // ============================================
  // SUCCESS SCREEN
  // ============================================
  if (submitSuccess) {
    return (
      <div className="paving-calc min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Request Received!</h1>
            <p className="text-gray-600 mb-6">
              We've received your estimate request and will contact you shortly with a detailed quote.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>We'll review your project details</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>A specialist will contact you within 24 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>We may schedule a site visit for accurate pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>You'll receive a detailed, finalized quote</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
              >
                Get Another Quote
              </button>
              <a
                href={`tel:${pavingConfig.business.phoneRaw}`}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Now
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // MAIN CALCULATOR UI
  // ============================================
  return (
    <div className="paving-calc min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Paving & Sealcoating Calculator
          </h1>
          <p className="text-gray-500">Get an instant estimate for your project</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-300" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-green-600 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((step) => {
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-colors ${
                      isActive
                        ? 'bg-green-600 text-white ring-4 ring-green-200'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <span className={`text-xs hidden sm:block ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {step.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">

          {/* ============================================ */}
          {/* STEP 1: SERVICE SELECTION */}
          {/* ============================================ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">What service do you need?</h2>
                <div className="space-y-3">
                  {pavingConfig.services?.map((service) => {
                    const isSelected = formData.serviceType === service.id
                    return (
                      <button
                        key={service.id}
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: service.id }))}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {service.id === 'sealcoating' && (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            )}
                            {service.id === 'paving' && (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            )}
                            {service.id === 'linestriping' && (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{service.name}</p>
                            <p className="text-sm text-gray-500">{service.description}</p>
                          </div>
                          {isSelected && (
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {formData.serviceType && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">What type of project?</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pavingConfig.projectTypes?.map((project) => {
                      const isSelected = formData.projectType === project.id
                      return (
                        <button
                          key={project.id}
                          onClick={() => setFormData(prev => ({ ...prev, projectType: project.id }))}
                          className={`p-4 rounded-xl border-2 transition-all text-center ${
                            isSelected
                              ? 'border-green-600 bg-green-50'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900">{project.label}</p>
                          {project.avgSqFt && (
                            <p className="text-xs text-gray-500">~{project.avgSqFt.toLocaleString()} sq ft avg</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Service benefits */}
              {selectedService && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <button
                    onClick={() => setShowBenefits(!showBenefits)}
                    className="w-full flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-900">Why choose {selectedService.name}?</span>
                    <svg className={`w-5 h-5 transition-transform ${showBenefits ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showBenefits && (
                    <ul className="mt-3 space-y-2 text-sm text-gray-600">
                      {selectedService.benefits?.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 2: AREA MEASUREMENT */}
          {/* ============================================ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {formData.serviceType === 'linestriping' ? 'Line Striping Details' : 'Measure Your Area'}
              </h2>

              {formData.serviceType === 'linestriping' ? (
                // Line striping inputs
                <div className="space-y-4">
                  <p className="text-gray-500 text-sm">Enter the details of your line striping project</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Parking Stalls</label>
                    <input
                      type="number"
                      value={formData.numStalls}
                      onChange={(e) => setFormData(prev => ({ ...prev, numStalls: e.target.value }))}
                      placeholder="e.g., 50"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ${pavingConfig.services?.find(s => s.id === 'linestriping')?.pricePerStall || 4}/stall
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Handicap Symbols</label>
                    <input
                      type="number"
                      value={formData.numHandicapSymbols}
                      onChange={(e) => setFormData(prev => ({ ...prev, numHandicapSymbols: e.target.value }))}
                      placeholder="e.g., 2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ${pavingConfig.services?.find(s => s.id === 'linestriping')?.pricePerSymbol || 35}/symbol
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Linear Feet</label>
                    <input
                      type="number"
                      value={formData.linearFeet}
                      onChange={(e) => setFormData(prev => ({ ...prev, linearFeet: e.target.value }))}
                      placeholder="e.g., 500"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ${pavingConfig.services?.find(s => s.id === 'linestriping')?.pricePerLinearFt || 0.25}/ft
                    </p>
                  </div>
                </div>
              ) : (
                // Paving/Sealcoating area measurement
                <>
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, measurementMethod: 'dimensions' }))}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        formData.measurementMethod === 'dimensions'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Enter Dimensions
                    </button>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, measurementMethod: 'map' }))}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        formData.measurementMethod === 'map'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Draw on Map
                    </button>
                  </div>

                  {formData.measurementMethod === 'dimensions' ? (
                    <div className="space-y-4">
                      <p className="text-gray-500 text-sm">Enter your driveway or parking lot dimensions</p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Length (feet)</label>
                          <input
                            type="number"
                            value={formData.length}
                            onChange={(e) => setFormData(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="e.g., 50"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Width (feet)</label>
                          <input
                            type="number"
                            value={formData.width}
                            onChange={(e) => setFormData(prev => ({ ...prev, width: e.target.value }))}
                            placeholder="e.g., 20"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="text-center">
                        <span className="text-gray-400">- or -</span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total Square Footage (if known)</label>
                        <input
                          type="number"
                          value={formData.squareFootage}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            squareFootage: e.target.value,
                            length: '',
                            width: ''
                          }))}
                          placeholder="e.g., 1000"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-gray-500 text-sm">Draw the outline of your area on the satellite map</p>

                      <div className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                        <div className="relative" style={{ height: '350px' }}>
                          <div ref={mapContainerRef} className="h-full w-full bg-gray-200" />

                          {!mapLoaded && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200">
                              <svg className="w-10 h-10 text-green-600 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="text-gray-700 font-medium">Loading satellite view...</p>
                            </div>
                          )}
                        </div>

                        <div className="p-3 bg-white border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              {polygonArea ? (
                                <span className="font-medium text-green-600">
                                  Area: {Math.round(polygonArea).toLocaleString()} sq ft
                                </span>
                              ) : (
                                <span>Click points to draw your area outline</span>
                              )}
                            </div>
                            {polygonArea && (
                              <button
                                onClick={clearPolygon}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                Clear & Redraw
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                        <strong>Tip:</strong> Click to place points around your area. Click the first point again to complete the shape.
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Live estimate preview */}
              {(sqft > 0 || formData.serviceType === 'linestriping') && estimate && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Estimated Range</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${estimate.lowEstimate.toLocaleString()} - ${estimate.highEstimate.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {sqft > 0 && (
                        <>
                          <p className="text-sm text-gray-600">Area</p>
                          <p className="text-lg font-medium text-gray-900">{sqft.toLocaleString()} sq ft</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 3: LOCATION & CONDITION */}
          {/* ============================================ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Location</h2>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter your address..."
                    className="w-full pl-12 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Start typing and select from suggestions</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Current Condition</h3>
                <p className="text-sm text-gray-500 mb-3">This helps us provide a more accurate estimate</p>
                <div className="space-y-2">
                  {pavingConfig.conditions?.map((condition) => {
                    const isSelected = formData.condition === condition.id
                    return (
                      <button
                        key={condition.id}
                        onClick={() => setFormData(prev => ({ ...prev, condition: condition.id }))}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
                          isSelected
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-medium text-gray-900">{condition.label}</span>
                        {isSelected && (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special requirements, access issues, or details..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 4: CONTACT INFO */}
          {/* ============================================ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Contact Information</h2>
                <p className="text-gray-500 text-sm mb-4">We'll reach out with your personalized quote</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="(618) 555-1234"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email (optional)</label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, preferredContact: 'phone' }))}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                        formData.preferredContact === 'phone'
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Call
                    </button>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, preferredContact: 'text' }))}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                        formData.preferredContact === 'text'
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Text
                    </button>
                    {formData.customerEmail && (
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, preferredContact: 'email' }))}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                          formData.preferredContact === 'email'
                            ? 'border-green-600 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Email
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 5: REVIEW & ESTIMATE */}
          {/* ============================================ */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Estimate</h2>

              {/* Estimate Display */}
              {estimate && (
                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
                  <div className="text-center mb-4">
                    <p className="text-green-100 text-sm mb-1">Estimated Price Range</p>
                    <p className="text-4xl font-bold">
                      ${estimate.lowEstimate.toLocaleString()} - ${estimate.highEstimate.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex justify-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-green-200">Service</p>
                      <p className="font-medium">{selectedService?.name}</p>
                    </div>
                    {sqft > 0 && (
                      <div className="text-center">
                        <p className="text-green-200">Area</p>
                        <p className="font-medium">{sqft.toLocaleString()} sq ft</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Project Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                <h3 className="font-medium text-gray-900">Project Summary</h3>

                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-500">Service</span>
                  <span className="text-gray-900">{selectedService?.name}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-500">Project Type</span>
                  <span className="text-gray-900">
                    {pavingConfig.projectTypes?.find(p => p.id === formData.projectType)?.label}
                  </span>
                </div>

                {formData.serviceType === 'linestriping' ? (
                  <>
                    {formData.numStalls && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Parking Stalls</span>
                        <span className="text-gray-900">{formData.numStalls}</span>
                      </div>
                    )}
                    {formData.numHandicapSymbols && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Handicap Symbols</span>
                        <span className="text-gray-900">{formData.numHandicapSymbols}</span>
                      </div>
                    )}
                    {formData.linearFeet && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Linear Feet</span>
                        <span className="text-gray-900">{formData.linearFeet}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Area</span>
                    <span className="text-gray-900">{sqft.toLocaleString()} sq ft</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-500">Address</span>
                  <span className="text-gray-900 text-right max-w-[60%]">{formData.address}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-500">Condition</span>
                  <span className="text-gray-900">
                    {pavingConfig.conditions?.find(c => c.id === formData.condition)?.label}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-500">Contact</span>
                  <span className="text-gray-900 text-right">
                    {formData.customerName}<br />
                    <span className="text-gray-600">{formData.customerPhone}</span>
                  </span>
                </div>

                {formData.notes && (
                  <div className="py-2">
                    <span className="text-gray-500 block mb-1">Notes</span>
                    <span className="text-gray-900 text-sm">{formData.notes}</span>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <span className="text-amber-800">{pavingConfig.disclaimer}</span>
              </div>

              {/* What happens next */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>1. We receive your request instantly</li>
                  <li>2. A specialist reviews your project details</li>
                  <li>3. We contact you within 24 hours with a detailed quote</li>
                </ul>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
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
              className="flex-1 sm:flex-initial bg-gray-200 hover:bg-gray-300 text-gray-700 py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}

          {currentStep < 5 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                canProceed()
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Get My Quote
                </>
              )}
            </button>
          )}
        </div>

        {/* Call us */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Questions? Call us at{' '}
            <a href={`tel:${pavingConfig.business.phoneRaw}`} className="text-green-600 hover:underline font-medium">
              {pavingConfig.business.phone}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
