# King City Disposal Chatbot - Exact Code

Copy these files exactly to implement the chatbot.

---

## 1. ChatbotWidget.jsx

```jsx
'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [bookingData, setBookingData] = useState({
    projectType: '',
    address: '',
    placementLat: null,
    placementLng: null,
    placementNotes: '',
    skipMap: false,
    size: '',
    duration: '10-day',
    deliveryDate: '',
    deliveryDateRaw: '',
    name: '',
    phone: '',
    surcharges: {},
  })

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
  }, [messages])

  // Auto-open chatbot after 2 seconds
  useEffect(() => {
    const isAdminPage = pathname?.startsWith('/admin') || pathname?.startsWith('/driver')
    const isBookingPage = pathname === '/book'

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
  }, [step, bookingData.address])

  const loadMap = async () => {
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
  }

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
      draggable: false,
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

  // Initial message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage("Hey! Need a dumpster? Tell me about your project and I'll recommend the right size.", 300)
      setStep(STEPS.PROJECT_TYPE)
    }
  }, [isOpen, messages.length])

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

  const handleDateDuration = async (date, duration) => {
    setBookingData(prev => ({ ...prev, deliveryDate: date, duration }))
    const dumpster = config.dumpsters.find(d => d.id === bookingData.size)
    const price = dumpster.pricing[duration]

    addUserMessage(`${date}, 10 days`)

    await addBotMessage(`That'll be $${price} for the 10-day rental.\n\nLast step - what's your name and phone number?`, 600)
    setStep(STEPS.CONTACT)
  }

  const handleContactSubmit = async (name, phone) => {
    setBookingData(prev => ({ ...prev, name, phone }))
    addUserMessage(`${name}, ${phone}`)

    await addBotMessage(`Thanks ${name}! Let me show you a summary...`, 500)
    setStep(STEPS.SUMMARY)
  }

  const handleConfirm = async () => {
    addUserMessage('Confirm booking')
    setIsTyping(true)

    const dumpster = config.dumpsters.find(d => d.id === bookingData.size)
    let surchargeTotal = 0
    Object.entries(bookingData.surcharges).forEach(([item, count]) => {
      const surcharge = config.surchargeItems.find(s => s.item === item)
      if (surcharge?.fee && count > 0) {
        surchargeTotal += surcharge.fee * count
      }
    })
    const basePrice = dumpster?.pricing[bookingData.duration] || 0
    const totalPrice = basePrice + surchargeTotal

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: bookingData.name,
          customerPhone: bookingData.phone,
          customerEmail: null,
          address: bookingData.address,
          placementLat: bookingData.placementLat,
          placementLng: bookingData.placementLng,
          placementNotes: bookingData.placementNotes,
          dumpsterSize: bookingData.size,
          rentalDuration: bookingData.duration,
          deliveryDate: bookingData.deliveryDate,
          priceCents: totalPrice * 100,
          projectType: bookingData.projectType,
          surcharges: bookingData.surcharges,
        }),
      })

      const result = await response.json()
      setIsTyping(false)

      if (result.success) {
        await addBotMessage(`Booking confirmed!\n\n${config.businessName} will call or text you at ${bookingData.phone} to confirm your ${dumpster.name} delivery on ${bookingData.deliveryDate}.\n\nTotal: $${totalPrice}\n\nQuestions? Call ${config.phone}`)
      } else {
        await addBotMessage(`Something went wrong, but don't worry!\n\nCall us at ${config.phone} and we'll get you set up.`)
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
          value: date.toISOString().split('T')[0]
        })
      }
    }
    return dates.slice(0, 6)
  }

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

  const isSizeAvailable = (size) => {
    if (Object.keys(availability).length === 0) return true
    const avail = availability[size]
    return avail ? avail.available > 0 : true
  }

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
      try { recognitionRef.current.start() } catch (e) {}
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
      await addBotMessage(`Got it: ${value}\n\nNow let's mark exactly where to place the dumpster. Tap "Place Dumpster" and drag it to the right spot.`, 600)
      setStep(STEPS.MAP_PLACEMENT)
    } else if (step === STEPS.CONTACT) {
      let name = value
      let phone = ''

      const phoneMatch = value.match(/[\d\-\(\)\s]{10,}/)
      if (phoneMatch) {
        phone = phoneMatch[0].replace(/\D/g, '')
        name = value.replace(phoneMatch[0], '').replace(/[,\n]/g, '').trim()
      }

      if (name && phone) {
        await handleContactSubmit(name, phone)
      } else {
        addUserMessage(value)
        await addBotMessage("Please include both your name and phone number.\n\nExample: John Smith, 618-555-1234", 400)
      }
    }
  }

  const selectedDumpster = config.dumpsters.find(d => d.id === bookingData.size)

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

  const isHomepage = pathname === '/'
  const chatSize = isHomepage
    ? 'md:w-[600px] h-[calc(100vh-80px)] max-h-[900px]'
    : 'md:w-[360px] h-[450px] max-h-[450px]'

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className={`fixed bottom-4 right-4 left-4 md:left-auto ${chatSize} bg-neutral-900 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-neutral-700`}>

          {/* Header */}
          <div className="bg-primary-600 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">{config.businessName}</h3>
                <p className="text-primary-100 text-sm">Quick booking assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.type === 'user'
                    ? 'bg-primary-500 text-white rounded-br-md'
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

            {/* RENDER STEPS HERE - See full component for step rendering code */}
            {/* PROJECT_TYPE, SIZE_CONFIRM, MAP_PLACEMENT, DATE_DURATION, SUMMARY steps */}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - shown for ADDRESS and CONTACT steps */}
          {/* Footer with phone number */}
        </div>
      )}

      {/* Floating button when closed */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            if (!hasAutoOpened) setHasAutoOpened(true)
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 rounded-full shadow-lg flex items-center justify-center z-50 transition-colors duration-200"
        >
          <MessageCircle className="w-8 h-8 text-white" />
        </button>
      )}
    </div>
  )
}
```

---

## 2. config.js

```javascript
export const config = {
  businessName: "King City Disposal",
  tagline: "Dumpster rental made easy",
  phone: "(618) 806-2550",
  phoneRaw: "6188062550",
  email: "info@kingcitydisposal.com",

  address: {
    street: "123 Main St",
    city: "Your City",
    state: "IL",
    zip: "62000",
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xxx.supabase.co",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJ...",
  },

  googleMaps: {
    apiKey: "YOUR_GOOGLE_MAPS_API_KEY",
  },

  notifications: {
    twilio: {
      enabled: true,
    },
  },

  fleet: {
    '20yd': 10,
    '30yd': 15,
  },

  dumpsters: [
    {
      id: "20yd",
      name: "20 Yard Dumpster",
      shortName: "20 Yard",
      description: "Perfect for medium projects like room renovations or garage cleanouts",
      dimensions: {
        length: 22,
        width: 8,
        height: 4,
        display: "22ft × 8ft × 4ft"
      },
      capacity: "20 cubic yards (approx. 6-8 pickup truck loads)",
      bestFor: [
        "Kitchen/bathroom remodel",
        "Estate cleanout",
        "Medium roofing job",
        "Deck removal"
      ],
      recommendedFor: ["cleanout", "renovation"],
      pricing: {
        "10-day": 475,
      },
      weightIncluded: "3 tons",
      weightLimit: 6000,
      overage: 105,
    },
    {
      id: "30yd",
      name: "30 Yard Dumpster",
      shortName: "30 Yard",
      description: "Ideal for large projects and construction jobs",
      dimensions: {
        length: 22,
        width: 8,
        height: 6,
        display: "22ft × 8ft × 6ft"
      },
      capacity: "30 cubic yards (approx. 9-12 pickup truck loads)",
      bestFor: [
        "Large home cleanout",
        "New construction",
        "Major renovation",
        "Commercial projects"
      ],
      recommendedFor: ["construction", "roofing"],
      pricing: {
        "10-day": 550,
      },
      weightIncluded: "4 tons",
      weightLimit: 8000,
      overage: 105,
    },
  ],

  projectTypes: [
    {
      id: "cleanout",
      label: "Cleanout",
      emoji: "🏠",
      description: "Garage, basement, estate",
      recommendedSize: "20yd"
    },
    {
      id: "renovation",
      label: "Renovation",
      emoji: "🔨",
      description: "Kitchen, bathroom, room",
      recommendedSize: "20yd"
    },
    {
      id: "roofing",
      label: "Roofing",
      emoji: "🏗️",
      description: "Shingle tear-off",
      recommendedSize: "30yd"
    },
    {
      id: "construction",
      label: "Construction",
      emoji: "🏢",
      description: "New build, addition",
      recommendedSize: "30yd"
    },
    {
      id: "other",
      label: "Other",
      emoji: "📦",
      description: "Something else",
      recommendedSize: null
    },
  ],

  surchargeItems: [
    { item: "Mattress", fee: 40, unit: "each" },
    { item: "Couch/Sofa", fee: 25, unit: "each" },
    { item: "Refrigerator", fee: 75, unit: "each" },
    { item: "TV/Monitor", fee: 35, unit: "each" },
    { item: "Tires (no rims)", fee: 15, unit: "each" },
  ],

  prohibitedItems: [
    { item: "Hazardous chemicals/paint", reason: "Environmental regulations" },
    { item: "Batteries (car/lithium)", reason: "Fire/explosion risk" },
    { item: "Propane tanks", reason: "Explosion hazard" },
    { item: "Medical waste", reason: "Biohazard regulations" },
    { item: "Asbestos", reason: "Requires special handling" },
    { item: "Wet concrete", reason: "Too heavy, damages truck" },
  ],
};

export default config;
```

---

## 3. Booking API - /api/book/route.js

```javascript
import { NextResponse } from 'next/server'
import { config } from '../../../config'

const supabaseUrl = config.supabase.url
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey

async function findOrCreateCustomer({ name, phone, email, address }) {
  if (!name || !phone) return null

  const cleanPhone = phone.replace(/\D/g, '')

  const conditions = []
  if (cleanPhone.length >= 10) {
    conditions.push(`phone.ilike.%${cleanPhone.slice(-10)}%`)
  }
  if (email) {
    conditions.push(`email.ilike.${email}`)
  }

  if (conditions.length > 0) {
    const searchResponse = await fetch(
      `${supabaseUrl}/rest/v1/customers?or=(${conditions.join(',')})&limit=1`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    )

    if (searchResponse.ok) {
      const existing = await searchResponse.json()
      if (existing.length > 0) {
        await fetch(
          `${supabaseUrl}/rest/v1/customers?id=eq.${existing[0].id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': getSupabaseKey(),
              'Authorization': `Bearer ${getSupabaseKey()}`,
            },
            body: JSON.stringify({
              total_jobs: (existing[0].total_jobs || 0) + 1,
              last_job_date: new Date().toISOString().split('T')[0],
            }),
          }
        )
        return existing[0]
      }
    }
  }

  const createResponse = await fetch(
    `${supabaseUrl}/rest/v1/customers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        name,
        phone,
        email: email || null,
        address: address || null,
        total_jobs: 1,
        last_job_date: new Date().toISOString().split('T')[0],
        notes: 'Auto-created from online booking',
      }),
    }
  )

  if (createResponse.ok) {
    const [created] = await createResponse.json()
    return created
  }

  return null
}

function parseDeliveryDate(dateStr) {
  try {
    const currentYear = new Date().getFullYear()
    const parsed = new Date(`${dateStr} ${currentYear}`)
    if (isNaN(parsed.getTime())) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    }
    return parsed.toISOString().split('T')[0]
  } catch {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    const {
      customerName,
      customerPhone,
      customerEmail,
      address,
      placementLat,
      placementLng,
      placementNotes,
      dumpsterSize,
      rentalDuration,
      deliveryDate,
      priceCents,
      projectType,
    } = body

    if (!customerName || !customerPhone || !address || !dumpsterSize || !rentalDuration || !deliveryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const customer = await findOrCreateCustomer({
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: address,
    })

    const bookingData = {
      customer_id: customer?.id || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      address: address,
      placement_lat: placementLat || null,
      placement_lng: placementLng || null,
      placement_notes: placementNotes || null,
      dumpster_size: dumpsterSize,
      rental_duration: rentalDuration,
      delivery_date: parseDeliveryDate(deliveryDate),
      price_cents: priceCents || 0,
      project_type: projectType || null,
      status: 'pending',
      paid: false,
    }

    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(bookingData),
    })

    if (!dbResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to save booking' },
        { status: 500 }
      )
    }

    const savedBooking = await dbResponse.json()

    // Send SMS notification (optional)
    if (config.notifications.twilio.enabled && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const ownerPhone = process.env.OWNER_PHONE
        if (ownerPhone) {
          const dumpster = config.dumpsters.find(d => d.id === dumpsterSize)
          await sendTwilioSMS({
            to: ownerPhone,
            message: `NEW BOOKING!\n\n${customerName}\n${customerPhone}\n${address}\n\n${dumpster?.name || dumpsterSize}\n${deliveryDate}`,
          })
        }
      } catch (smsError) {
        console.error('SMS failed:', smsError)
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: savedBooking[0]?.id,
      customerId: customer?.id || null,
    })

  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

async function sendTwilioSMS({ to, message }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials not configured')
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: message,
      }),
    }
  )

  return response.json()
}
```

---

## 4. Database Tables (Supabase SQL)

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'IL',
  zip TEXT,
  notes TEXT,
  total_jobs INTEGER DEFAULT 0,
  total_spent_cents INTEGER DEFAULT 0,
  last_job_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  address TEXT NOT NULL,
  placement_lat DOUBLE PRECISION,
  placement_lng DOUBLE PRECISION,
  placement_notes TEXT,
  dumpster_size TEXT NOT NULL,
  rental_duration TEXT DEFAULT '10-day',
  delivery_date DATE NOT NULL,
  pickup_date DATE,
  price_cents INTEGER DEFAULT 0,
  project_type TEXT,
  status TEXT DEFAULT 'pending',
  paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. Tailwind CSS Classes Used

Add these to your `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        dark: {
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
        },
      },
    },
  },
}
```

Add to your global CSS:

```css
.btn-primary {
  @apply bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors;
}

.btn-accent {
  @apply bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-xl transition-colors;
}

.input-field {
  @apply bg-dark-700 border border-dark-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 placeholder:text-dark-400;
}
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Maps
# Put in config.js

# Twilio (optional)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+15551234567
OWNER_PHONE=+15559876543
```

---

## Usage

1. Copy `ChatbotWidget.jsx` to `src/components/`
2. Copy `config.js` to `src/`
3. Copy booking API to `src/app/api/book/route.js`
4. Run SQL in Supabase
5. Add to layout:

```jsx
import ChatbotWidget from '@/components/ChatbotWidget'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ChatbotWidget />
      </body>
    </html>
  )
}
```
