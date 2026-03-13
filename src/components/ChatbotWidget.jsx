'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { config } from '../config'
import {
  Truck,
  X,
  MapPin,
  Calendar,
  Send,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Home,
  Hammer,
  Building2,
  HardHat,
  Package,
  Phone,
  Plus,
  RotateCcw,
  RotateCw,
  Mic,
  MicOff,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const STEPS = {
  WELCOME: 'welcome',
  PROJECT_TYPE: 'project_type',
  SIZE_CONFIRM: 'size_confirm',
  ADDRESS: 'address',
  MAP_PLACEMENT: 'map_placement',
  DATE_DURATION: 'date_duration',
  CONTACT: 'contact',
  SUMMARY: 'summary',
  COMPLETE: 'complete'
}

const projectIcons = {
  cleanout: Home,
  renovation: Hammer,
  roofing: HardHat,
  construction: Building2,
  other: Package
}

const GOOGLE_MAPS_KEY = config.googleMaps?.apiKey

export default function ChatbotWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)
  const [step, setStep] = useState(STEPS.WELCOME)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [dumpsterPlaced, setDumpsterPlaced] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [placementDescription, setPlacementDescription] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [showProhibited, setShowProhibited] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactCity, setContactCity] = useState('')
  const [contactZip, setContactZip] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [bookingData, setBookingData] = useState({
    projectType: '',
    address: '',
    city: '',
    zip: '',
    placementLat: null,
    placementLng: null,
    placementNotes: '',
    skipMap: false, // User chose to describe placement instead of using map
    size: '',
    duration: '10-day',
    deliveryDate: '',
    deliveryDateRaw: '', // YYYY-MM-DD format for API
    name: '',
    phone: '',
    email: '',
    surcharges: {},
  })

  // Availability state
  const [availability, setAvailability] = useState({})
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  const messagesEndRef = useRef(null)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const polygonRef = useRef(null)
  const dumpsterCenterRef = useRef({ lat: 0, lng: 0 })
  const rotationRef = useRef(0)
  const recognitionRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, step, bookingData])

  // Auto-open chatbot after 2 seconds on homepage
  useEffect(() => {
    const isAdminPage = pathname?.startsWith('/admin') || pathname?.startsWith('/driver')
    const isBookingPage = pathname === '/book'

    // Don't auto-open on admin pages or booking page (user is already in booking flow)
    if (!hasAutoOpened && !isOpen && !isAdminPage && !isBookingPage) {
      const openTimer = setTimeout(() => {
        setIsOpen(true)
        setHasAutoOpened(true)
      }, 2000)
      return () => clearTimeout(openTimer)
    }
  }, [hasAutoOpened, isOpen, pathname])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInputValue(prev => prev + (prev ? ' ' : '') + transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
    }
  }, [])

  // Load map function wrapped in useCallback
  const loadMap = useCallback(async () => {
    if (!window.google?.maps) {
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=geometry,geocoding`
        script.async = true
        document.head.appendChild(script)
      }

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
    geocoder.geocode({ address: bookingData.address }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) return

      const location = results[0].geometry.location

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: location,
        zoom: 20,
        mapTypeId: 'hybrid',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      })
      mapRef.current = map

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
  }, [bookingData.address])

  // Load Google Maps when entering map step
  useEffect(() => {
    if (step === STEPS.MAP_PLACEMENT && bookingData.address) {
      loadMap()
    }

    return () => {
      if (step !== STEPS.MAP_PLACEMENT) {
        setMapLoaded(false)
        setDumpsterPlaced(false)
        setRotation(0)
        if (polygonRef.current) {
          polygonRef.current.setMap(null)
          polygonRef.current = null
        }
        mapRef.current = null
      }
    }
  }, [step, bookingData.address, loadMap])

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
      fillColor: '#22c55e',
      fillOpacity: 0.5,
      strokeColor: '#22c55e',
      strokeWeight: 3,
      strokeOpacity: 1,
    })

    polygonRef.current = polygon

    setBookingData(prev => ({
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

      setBookingData(prev => ({
        ...prev,
        placementLat: newLat,
        placementLng: newLng
      }))
    })

    setDumpsterPlaced(true)
    setRotation(0)
    rotationRef.current = 0
  }

  useEffect(() => {
    if (polygonRef.current && dumpsterPlaced) {
      const { lat, lng } = dumpsterCenterRef.current
      const newCoords = calculatePolygonCoords(lat, lng, rotation)
      polygonRef.current.setPath(newCoords)
      rotationRef.current = rotation
    }
  }, [rotation, dumpsterPlaced])

  const rotateLeft = () => setRotation(prev => {
    const newRotation = (prev - 20 + 360) % 360
    rotationRef.current = newRotation
    return newRotation
  })
  const rotateRight = () => setRotation(prev => {
    const newRotation = (prev + 20) % 360
    rotationRef.current = newRotation
    return newRotation
  })

  const addBotMessage = async (text, delay = 500) => {
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, delay))
    setIsTyping(false)
    setMessages(prev => [...prev, { type: 'bot', text }])
  }

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', text }])
  }

  // Use refs for booking data to avoid stale state in async callbacks
  const bookingDataRef = useRef(bookingData)
  useEffect(() => {
    bookingDataRef.current = bookingData
  }, [bookingData])

  // Initial message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage("Hey! Need a dumpster? Tell me about your project and I'll recommend the right size.", 300)
      setStep(STEPS.PROJECT_TYPE)
    }
  }, [isOpen, messages.length])

  // Step 1: Handle project type selection
  const handleProjectType = async (projectType) => {
    const project = config.projectTypes.find(p => p.id === projectType)
    setBookingData(prev => ({ ...prev, projectType }))
    addUserMessage(`${project.emoji} ${project.label}`)

    const recommendedSize = project.recommendedSize
    if (recommendedSize) {
      const dumpster = config.dumpsters.find(d => d.id === recommendedSize)
      setBookingData(prev => ({ ...prev, size: recommendedSize }))
      await addBotMessage(`For a ${project.label.toLowerCase()} project, I recommend the ${dumpster.name}.\n\n${dumpster.dimensions?.display || ''} - ${dumpster.weightIncluded} included\n\nStarting at $${dumpster.pricing['10-day']} for 10 days.\n\nDoes that work, or want a different size?`, 700)
    } else {
      await addBotMessage(`Got it! Which dumpster size do you need?`, 500)
    }
    setStep(STEPS.SIZE_CONFIRM)
  }

  // Step 2: Handle size confirmation/selection
  const handleSizeSelect = async (sizeId) => {
    const dumpster = config.dumpsters.find(d => d.id === sizeId)
    setBookingData(prev => ({ ...prev, size: sizeId }))
    addUserMessage(dumpster.name)

    await addBotMessage(`Perfect! The ${dumpster.name} it is.\n\nWhat's the delivery address?`, 600)
    setStep(STEPS.ADDRESS)
  }

  const handleSizeConfirm = async () => {
    const dumpster = config.dumpsters.find(d => d.id === bookingData.size)
    addUserMessage(`Yes, ${dumpster.name} works!`)

    await addBotMessage(`Great choice!\n\nWhat's the delivery address?`, 500)
    setStep(STEPS.ADDRESS)
  }

  // Step 3: Handle address and map placement
  const handlePlacementConfirm = async () => {
    const notes = placementDescription.trim() || (bookingData.skipMap ? 'Call to confirm placement' : 'See map placement')
    setBookingData(prev => ({ ...prev, placementNotes: notes }))

    if (bookingData.skipMap) {
      addUserMessage(`Placement: ${notes}`)
    } else {
      addUserMessage(`Placement confirmed`)
    }

    await addBotMessage(`Got it!\n\nWhen do you need it delivered?`, 600)
    setStep(STEPS.DATE_DURATION)
  }

  // Step 4: Handle date and duration
  const handleDateDuration = async (date, duration) => {
    setBookingData(prev => ({ ...prev, deliveryDate: date, duration }))
    const dumpster = config.dumpsters.find(d => d.id === bookingData.size)
    const price = dumpster.pricing[duration]

    addUserMessage(`${date}, 10 days`)

    await addBotMessage(`That'll be $${price} for the 10-day rental.\n\nLast step - your contact info:`, 600)
    setStep(STEPS.CONTACT)
  }

  // Step 5: Handle contact info
  const handleContactSubmit = async (name, phone, email, city, zip) => {
    setBookingData(prev => ({ ...prev, name, phone, email, city, zip }))
    addUserMessage(`${name}, ${phone}${email ? `, ${email}` : ''}${city ? `, ${city}` : ''}${zip ? ` ${zip}` : ''}`)

    await addBotMessage(`Thanks ${name}! Let me show you a summary...`, 500)
    setStep(STEPS.SUMMARY)
  }

  // Form-based contact submit
  const handleContactFormSubmit = async (e) => {
    if (e) e.preventDefault()
    const name = contactName.trim()
    const phone = contactPhone.trim().replace(/\D/g, '')
    const email = contactEmail.trim()
    const city = contactCity.trim()
    const zip = contactZip.trim()

    if (!name || phone.length < 10) {
      await addBotMessage("Please enter your full name and a valid phone number.")
      return
    }

    setContactName('')
    setContactPhone('')
    setContactEmail('')
    setContactCity('')
    setContactZip('')
    await handleContactSubmit(name, phone, email, city, zip)
  }

  // Final: Confirm booking
  const handleConfirm = async () => {
    addUserMessage('Confirm booking')
    setIsTyping(true)

    // Use ref to get latest booking data to avoid stale closure
    const currentBookingData = bookingDataRef.current
    const dumpster = config.dumpsters.find(d => d.id === currentBookingData.size)
    let surchargeTotal = 0
    Object.entries(currentBookingData.surcharges).forEach(([item, count]) => {
      const surcharge = config.surchargeItems.find(s => s.item === item)
      if (surcharge?.fee && count > 0) {
        surchargeTotal += surcharge.fee * count
      }
    })
    const basePrice = dumpster?.pricing[currentBookingData.duration] || 0
    const totalPrice = basePrice + surchargeTotal

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: currentBookingData.name,
          customerPhone: currentBookingData.phone,
          customerEmail: currentBookingData.email || null,
          address: currentBookingData.address,
          city: currentBookingData.city,
          zip: currentBookingData.zip,
          placementLat: currentBookingData.placementLat,
          placementLng: currentBookingData.placementLng,
          placementNotes: currentBookingData.placementNotes,
          dumpsterSize: currentBookingData.size,
          rentalDuration: currentBookingData.duration,
          deliveryDate: currentBookingData.deliveryDate,
          priceCents: totalPrice * 100,
          projectType: currentBookingData.projectType,
          surcharges: currentBookingData.surcharges,
        }),
      })

      const result = await response.json()
      setIsTyping(false)

      if (response.ok && result.success) {
        if (result.checkoutUrl) {
          await addBotMessage(`Booking saved! Redirecting you to payment...\n\nTotal: $${totalPrice}`)
          // Short delay so user can see the message
          setTimeout(() => {
            window.location.href = result.checkoutUrl
          }, 1500)
        } else {
          await addBotMessage(`Booking confirmed!\n\n${config.businessName} will call or text you at ${currentBookingData.phone} to confirm your ${dumpster?.name || currentBookingData.size} delivery on ${currentBookingData.deliveryDate}.\n\nTotal: $${totalPrice}\n\nQuestions? Call ${config.phone}`)
        }
      } else {
        console.error('Booking API error:', response.status, result)
        const errorMsg = result.error || result.message || `Server error (${response.status})`
        await addBotMessage(`Something went wrong: ${errorMsg}\n\nCall us at ${config.phone} and we'll get you set up.`)
      }
    } catch (error) {
      console.error('Booking error:', error)
      setIsTyping(false)
      await addBotMessage(`Couldn't submit online.\n\nCall us at ${config.phone} - we'll book it for you!`)
    }

    setStep(STEPS.COMPLETE)
  }

  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      if (date.getDay() !== 0) {
        dates.push({
          label: date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          value: date.toISOString().split('T')[0] // YYYY-MM-DD
        })
      }
    }
    return dates.slice(0, 6)
  }

  // Fetch availability for a date
  const fetchAvailability = async (dateRaw) => {
    if (!dateRaw) return
    setLoadingAvailability(true)
    try {
      const response = await fetch(`/api/availability?date=${dateRaw}`)
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

  // Check if size is sold out
  const isSizeAvailable = (size) => {
    if (Object.keys(availability).length === 0) return true
    const avail = availability[size]
    return avail ? avail.available > 0 : true
  }

  // Get availability info
  const getAvailabilityInfo = (size) => {
    return availability[size] || { total: 0, booked: 0, available: 0 }
  }

  const getPlaceholder = () => {
    switch (step) {
      case STEPS.ADDRESS:
        return "Enter delivery address..."
      case STEPS.CONTACT:
        return "Your name and phone (e.g. John Smith, 618-555-1234)"
      default:
        return "Type a message..."
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.warn('Speech recognition start failed:', e.message)
        setIsListening(false)
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const value = inputValue.trim()
    setInputValue('')

    if (step === STEPS.ADDRESS) {
      setBookingData(prev => ({ ...prev, address: value }))
      addUserMessage(value)
      await addBotMessage(`Got it: ${value}\n\nNow let's mark exactly where to place the dumpster. Tap the button to drop it on the map, then drag the map to position it.`, 600)
      setStep(STEPS.MAP_PLACEMENT)
    } else if (step === STEPS.CONTACT) {
      let name = value
      let phone = ''
      let email = ''

      // Extract email if present
      const emailMatch = value.match(/[\w.+-]+@[\w-]+\.[\w.]+/)
      if (emailMatch) {
        email = emailMatch[0]
        name = name.replace(emailMatch[0], '').trim()
      }

      const phoneMatch = name.match(/[\d\-\(\)\s]{10,}/)
      if (phoneMatch) {
        phone = phoneMatch[0].replace(/\D/g, '')
        name = name.replace(phoneMatch[0], '').replace(/[,\n]/g, '').trim()
      }

      if (name && phone) {
        await handleContactSubmit(name, phone, email)
      } else {
        addUserMessage(value)
        await addBotMessage("Please include both your name and phone number.\n\nExample: John Smith, 618-555-1234", 400)
      }
    }
  }

  const selectedDumpster = config.dumpsters.find(d => d.id === bookingData.size)

  // Calculate surcharge total for summary
  const getSurchargeTotal = () => {
    let total = 0
    Object.entries(bookingData.surcharges).forEach(([item, count]) => {
      const surcharge = config.surchargeItems.find(s => s.item === item)
      if (surcharge?.fee && count > 0) {
        total += surcharge.fee * count
      }
    })
    return total
  }

  // Use smaller size on non-homepage
  const isHomepage = pathname === '/'
  const chatSize = isHomepage
    ? 'md:w-[600px] h-[calc(100vh-80px)] max-h-[900px]'
    : 'md:w-[360px] h-[450px] max-h-[450px]'

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className={`fixed bottom-4 right-4 left-4 md:left-auto ${chatSize} bg-neutral-900 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-neutral-700`}>

          {/* Header */}
          <div className="bg-primary p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-dark-900/20 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">{config.businessName}</h3>
                <p className="text-primary-100 text-sm">Quick booking assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-2 hover:bg-dark-900/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Maintenance Mode */}
          {config.bookingMaintenance ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Online Booking Unavailable</h3>
              <p className="text-dark-300 mb-6 max-w-sm">
                {config.bookingMaintenanceMessage}
              </p>
              <a
                href={`tel:${config.phoneRaw}`}
                className="btn-primary py-3 px-6 flex items-center gap-2 text-lg"
              >
                <Phone className="w-5 h-5" />
                Call {config.phone}
              </a>
              <p className="text-dark-500 text-sm mt-4">
                We're available Mon-Sat, 7am-6pm
              </p>
            </div>
          ) : (
          <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.type === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-dark-700 text-white rounded-bl-md'
                }`}>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-dark-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Project Type Selection */}
            {!isTyping && step === STEPS.PROJECT_TYPE && messages.length > 0 && (
              <div className="space-y-3">
                <p className="text-dark-400 text-sm">What kind of project?</p>
                <div className="grid grid-cols-2 gap-2">
                  {config.projectTypes.map((project) => {
                    const Icon = projectIcons[project.id]
                    return (
                      <button
                        key={project.id}
                        onClick={() => handleProjectType(project.id)}
                        className="bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-3 flex items-center gap-3 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white text-sm">{project.label}</p>
                          <p className="text-xs text-dark-400 truncate">{project.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Size Confirmation */}
            {!isTyping && step === STEPS.SIZE_CONFIRM && (
              <div className="space-y-3">
                {bookingData.size && (
                  <button
                    onClick={handleSizeConfirm}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Yes, that works!
                  </button>
                )}
                <p className="text-dark-400 text-sm text-center">Or pick a different size:</p>
                <div className="space-y-2">
                  {config.dumpsters.map((dumpster) => {
                    const project = config.projectTypes.find(p => p.id === bookingData.projectType)
                    const isRecommended = project?.recommendedSize === dumpster.id
                    const isSelected = bookingData.size === dumpster.id
                    return (
                      <button
                        key={dumpster.id}
                        onClick={() => handleSizeSelect(dumpster.id)}
                        className={`w-full rounded-xl p-4 flex items-center justify-between transition-colors text-left ${
                          isSelected
                            ? 'bg-primary/20 border-2 border-primary-500'
                            : isRecommended
                            ? 'bg-green-500/10 border border-green-500/50 hover:border-green-500'
                            : 'bg-dark-700 hover:bg-dark-600 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Truck className={`w-8 h-8 flex-shrink-0 ${isSelected ? 'text-primary-400' : 'text-dark-400'}`} />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-white">{dumpster.name}</p>
                              {isRecommended && !isSelected && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-dark-400">{dumpster.weightIncluded} included</p>
                          </div>
                        </div>
                        <span className="text-primary-400 font-bold">${dumpster.pricing['10-day']}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Map Placement */}
            {!isTyping && step === STEPS.MAP_PLACEMENT && (
              <div className="space-y-3">
                {!bookingData.skipMap ? (
                  <>
                    <div className="bg-dark-700 rounded-xl overflow-hidden">
                      <div className="relative" style={{ height: '220px' }}>
                        <div
                          ref={mapContainerRef}
                          className="h-full w-full bg-dark-600"
                        />

                        {!mapLoaded && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-dark-600">
                            <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mb-3 animate-pulse">
                              <MapPin className="w-7 h-7 text-primary-400" />
                            </div>
                            <p className="text-white font-medium">Loading satellite view...</p>
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
                              <span className="text-xs font-normal text-white/70">Then drag to reposition</span>
                            </button>
                          </div>
                        )}

                        {dumpsterPlaced && (
                          <div className="absolute bottom-3 right-3 flex gap-2">
                            <button
                              onClick={rotateLeft}
                              className="w-11 h-11 bg-dark-800/90 hover:bg-dark-700 text-white rounded-full flex items-center justify-center shadow-lg"
                            >
                              <RotateCcw className="w-5 h-5 text-primary-400" />
                            </button>
                            <button
                              onClick={rotateRight}
                              className="w-11 h-11 bg-dark-800/90 hover:bg-dark-700 text-white rounded-full flex items-center justify-center shadow-lg"
                            >
                              <RotateCw className="w-5 h-5 text-primary-400" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-dark-800 border-t border-dark-600 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-3 bg-primary/60 border-2 border-primary-500 rounded-sm"></div>
                          <span className="text-sm text-dark-300">{selectedDumpster?.dimensions?.display || '22ft × 8ft'}</span>
                        </div>
                        {dumpsterPlaced && <span className="text-primary-400 text-sm font-medium">Pan map to move</span>}
                      </div>
                    </div>

                    {/* House not shown option */}
                    <button
                      onClick={() => setBookingData(prev => ({ ...prev, skipMap: true }))}
                      className="w-full text-center text-sm text-dark-400 hover:text-primary-400 py-2 transition-colors"
                    >
                      House not showing? Click here to describe placement instead
                    </button>

                    <input
                      type="text"
                      value={placementDescription}
                      onChange={(e) => setPlacementDescription(e.target.value)}
                      placeholder="Placement notes (optional)..."
                      className="input-field w-full"
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setMessages(prev => prev.slice(0, -2))
                          setBookingData(prev => ({ ...prev, address: '', skipMap: false }))
                          setPlacementDescription('')
                          setStep(STEPS.ADDRESS)
                        }}
                        className="flex-1 bg-dark-700 hover:bg-dark-600 text-white rounded-xl py-3 flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        onClick={handlePlacementConfirm}
                        disabled={!dumpsterPlaced}
                        className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-semibold ${
                          dumpsterPlaced ? 'btn-primary' : 'bg-dark-600 text-dark-400 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-5 h-5" />
                        Confirm Placement
                      </button>
                    </div>
                  </>
                ) : (
                  /* Skip Map - Manual Description Mode */
                  <div className="space-y-4">
                    <div className="bg-dark-700 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Describe Dumpster Placement</p>
                          <p className="text-dark-400 text-sm">Tell us exactly where you'd like it placed</p>
                        </div>
                      </div>
                      <textarea
                        value={placementDescription}
                        onChange={(e) => setPlacementDescription(e.target.value)}
                        placeholder="Example: In the driveway on the left side, near the garage door. Or: On the street in front of the house..."
                        className="input-field w-full h-24 resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-200 text-sm">
                        We'll call to confirm exact placement before delivery
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setBookingData(prev => ({ ...prev, skipMap: false }))}
                        className="flex-1 bg-dark-700 hover:bg-dark-600 text-white rounded-xl py-3 flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Map
                      </button>
                      <button
                        onClick={handlePlacementConfirm}
                        disabled={!placementDescription.trim()}
                        className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-semibold ${
                          placementDescription.trim() ? 'btn-primary' : 'bg-dark-600 text-dark-400 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-5 h-5" />
                        Continue
                      </button>
                    </div>

                    <div className="text-center">
                      <p className="text-dark-400 text-sm mb-2">Or prefer to talk to someone?</p>
                      <a
                        href={`tel:${config.phoneRaw}`}
                        className="inline-flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary-400 px-4 py-2 rounded-xl transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        Call {config.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Date & Duration */}
            {!isTyping && step === STEPS.DATE_DURATION && (
              <div className="space-y-4">
                <div>
                  <p className="text-dark-400 text-sm mb-2">Pick a delivery date (10-day rental):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {getAvailableDates().map((date) => {
                      const isSelected = bookingData.deliveryDateRaw === date.value
                      const delivery = new Date(date.value + 'T12:00:00')
                      const pickup = new Date(delivery)
                      pickup.setDate(pickup.getDate() + 10)
                      const deliveryStr = delivery.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      const pickupStr = pickup.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      return (
                        <button
                          key={date.value}
                          onClick={() => {
                            setBookingData(prev => ({
                              ...prev,
                              deliveryDate: date.label,
                              deliveryDateRaw: date.value
                            }))
                            fetchAvailability(date.value)
                          }}
                          className={`rounded-xl p-3 text-left transition-colors ${
                            isSelected
                              ? 'bg-primary/20 border-2 border-primary-500'
                              : 'bg-dark-700 hover:bg-dark-600 border-2 border-transparent'
                          }`}
                        >
                          <p className={`text-xs font-medium ${isSelected ? 'text-primary-400' : 'text-dark-400'}`}>{deliveryStr}</p>
                          <p className="text-dark-500 text-xs mt-0.5">to {pickupStr}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Availability warning */}
                {bookingData.deliveryDateRaw && loadingAvailability && (
                  <div className="flex items-center gap-2 text-dark-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking availability...
                  </div>
                )}
                {bookingData.deliveryDateRaw && !loadingAvailability && !isSizeAvailable(bookingData.size) && (
                  <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium text-sm">
                        {selectedDumpster?.shortName || bookingData.size} sold out for {bookingData.deliveryDate}
                      </p>
                      <p className="text-dark-300 text-xs mt-1">Please select a different date or size</p>
                    </div>
                  </div>
                )}
                {bookingData.deliveryDateRaw && !loadingAvailability && isSizeAvailable(bookingData.size) && getAvailabilityInfo(bookingData.size).available === 1 && (
                  <div className="bg-orange-500/20 border border-orange-500 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-orange-400 font-medium text-sm">
                      Only 1 {selectedDumpster?.shortName || bookingData.size} left for {bookingData.deliveryDate}!
                    </p>
                  </div>
                )}

                {bookingData.deliveryDateRaw && (
                  <button
                    onClick={() => handleDateDuration(bookingData.deliveryDate, bookingData.duration)}
                    disabled={loadingAvailability || !isSizeAvailable(bookingData.size)}
                    className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl font-semibold ${
                      loadingAvailability || !isSizeAvailable(bookingData.size)
                        ? 'bg-dark-600 text-dark-400 cursor-not-allowed'
                        : 'btn-primary'
                    }`}
                  >
                    {loadingAvailability ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Checking...
                      </>
                    ) : !isSizeAvailable(bookingData.size) ? (
                      <>
                        <AlertCircle className="w-5 h-5" />
                        Not Available
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Step 5: Contact Form */}
            {!isTyping && step === STEPS.CONTACT && (
              <div className="mt-4">
                <form onSubmit={handleContactFormSubmit} className="bg-dark-700 rounded-xl p-4 space-y-3">
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Your full name"
                    className="input-field w-full"
                    autoFocus
                  />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Phone number"
                    className="input-field w-full"
                  />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email (for invoices & updates)"
                    className="input-field w-full"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={contactCity}
                      onChange={(e) => setContactCity(e.target.value)}
                      placeholder="City"
                      className="input-field flex-[2]"
                    />
                    <input
                      type="text"
                      value={contactZip}
                      onChange={(e) => setContactZip(e.target.value)}
                      placeholder="ZIP"
                      className="input-field flex-1"
                      maxLength={5}
                    />
                  </div>
                  {/* SMS Consent - Required for Twilio A2P 10DLC */}
                  <label className="flex items-start gap-2 cursor-pointer bg-dark-600 rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={smsConsent}
                      onChange={(e) => setSmsConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-dark-300">
                      I agree to receive SMS from {config.businessName} for booking updates, delivery notifications, and invoices. Msg & data rates apply. Reply STOP to opt out. <a href="/sms-terms" target="_blank" className="text-primary hover:underline">SMS Terms</a>
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={!smsConsent}
                    className={`w-full py-3 flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ${smsConsent ? 'btn-primary' : 'bg-dark-600 text-dark-400 cursor-not-allowed'}`}
                  >
                    <ArrowRight className="w-5 h-5" />
                    Continue
                  </button>
                </form>
              </div>
            )}

            {/* Step 6: Summary with Surcharges & Prohibited Items */}
            {!isTyping && step === STEPS.SUMMARY && (
              <div className="space-y-4">
                <div className="bg-dark-700 rounded-xl p-4">
                  <h4 className="font-semibold text-white text-lg mb-3">Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Address</span>
                      <span className="text-white text-right max-w-[55%]">{bookingData.address}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Dumpster</span>
                      <span className="text-white">{selectedDumpster?.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Duration</span>
                      <span className="text-white">10 Days</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Delivery</span>
                      <span className="text-white">{bookingData.deliveryDate}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Contact</span>
                      <span className="text-white text-right">{bookingData.name}<br /><span className="text-dark-300">{bookingData.phone}</span>{bookingData.email && <><br /><span className="text-dark-300">{bookingData.email}</span></>}</span>
                    </div>
                  </div>
                </div>

                {/* Surcharges */}
                <div>
                  <p className="text-white font-medium mb-2">Any of these items? (Optional fees)</p>
                  <div className="space-y-2">
                    {config.surchargeItems.filter(s => s.fee).map((surcharge) => {
                      const count = bookingData.surcharges[surcharge.item] || 0
                      return (
                        <div key={surcharge.item} className="flex items-center justify-between bg-dark-700 rounded-lg p-3">
                          <div>
                            <p className="text-white text-sm">{surcharge.item}</p>
                            <p className="text-xs text-dark-400">${surcharge.fee} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setBookingData(prev => ({
                                ...prev,
                                surcharges: { ...prev.surcharges, [surcharge.item]: Math.max(0, count - 1) }
                              }))}
                              className="w-7 h-7 bg-dark-600 hover:bg-dark-500 rounded-full flex items-center justify-center text-white text-sm"
                            >-</button>
                            <span className="text-white w-4 text-center text-sm">{count}</span>
                            <button
                              onClick={() => setBookingData(prev => ({
                                ...prev,
                                surcharges: { ...prev.surcharges, [surcharge.item]: count + 1 }
                              }))}
                              className="w-7 h-7 bg-dark-600 hover:bg-dark-500 rounded-full flex items-center justify-center text-white text-sm"
                            >+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Prohibited Items Collapsible */}
                <div className="bg-dark-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowProhibited(!showProhibited)}
                    className="w-full p-3 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-white text-sm font-medium">What can't go in?</span>
                    </div>
                    {showProhibited ? <ChevronUp className="w-4 h-4 text-dark-400" /> : <ChevronDown className="w-4 h-4 text-dark-400" />}
                  </button>
                  {showProhibited && (
                    <div className="px-3 pb-3 border-t border-dark-600">
                      <ul className="text-xs text-dark-300 space-y-1 mt-2">
                        {config.prohibitedItems.slice(0, 6).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-red-400">✕</span>
                            <span>{item.item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="bg-primary/10 border border-primary-500/30 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-lg">Total</span>
                    <span className="text-primary-400 font-bold text-2xl">
                      ${(selectedDumpster?.pricing[bookingData.duration] || 0) + getSurchargeTotal()}
                    </span>
                  </div>
                  {getSurchargeTotal() > 0 && (
                    <p className="text-dark-400 text-xs mt-1">
                      Includes ${getSurchargeTotal()} in surcharges
                    </p>
                  )}
                </div>

                <button
                  onClick={handleConfirm}
                  className="w-full btn-accent flex items-center justify-center gap-2 py-4"
                >
                  Confirm Booking
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {step !== STEPS.COMPLETE && step !== STEPS.MAP_PLACEMENT && step !== STEPS.PROJECT_TYPE && step !== STEPS.SIZE_CONFIRM && step !== STEPS.DATE_DURATION && step !== STEPS.SUMMARY && step !== STEPS.CONTACT && (
            <div className="p-4 border-t border-dark-700 flex-shrink-0 bg-dark-800">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="input-field flex-1"
                />
                {recognitionRef.current && (
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`p-3 rounded-xl transition-colors ${
                      isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-dark-600 hover:bg-dark-500 text-dark-300'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary text-white p-3 rounded-xl"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>

              {isListening && (
                <p className="text-center text-sm text-primary-400 mt-2 animate-pulse">
                  Listening...
                </p>
              )}

              <div className="flex items-center justify-center mt-3">
                <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline text-sm flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Call {config.phone}
                </a>
              </div>
            </div>
          )}

          {/* Minimal footer for other steps */}
          {(step === STEPS.MAP_PLACEMENT || step === STEPS.PROJECT_TYPE || step === STEPS.SIZE_CONFIRM || step === STEPS.DATE_DURATION || step === STEPS.SUMMARY || step === STEPS.CONTACT) && (
            <div className="p-3 border-t border-dark-700 flex-shrink-0 bg-dark-800">
              <p className="text-center text-sm text-dark-400">
                Need help? <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {config.phone}
                </a>
              </p>
            </div>
          )}
          </>
          )}
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            if (!hasAutoOpened) setHasAutoOpened(true)
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary/90 rounded-full shadow-lg flex items-center justify-center z-50 transition-colors duration-200"
        >
          <MessageCircle className="w-8 h-8 text-white" />
        </button>
      )}
    </div>
  )
}
