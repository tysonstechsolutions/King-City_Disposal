'use client'

import { useState, useEffect, useRef } from 'react'
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
  FileText
} from 'lucide-react'

const STEPS = {
  WELCOME: 'welcome',
  PROJECT_TYPE: 'project_type',
  ADDRESS: 'address',
  SIZE: 'size',
  MAP_PLACEMENT: 'map_placement',
  DURATION: 'duration',
  DATE: 'date',
  PROHIBITED: 'prohibited',
  CONTACT: 'contact',
  CONFIRM: 'confirm',
  COMPLETE: 'complete'
}

const projectIcons = {
  cleanout: Home,
  renovation: Hammer,
  roofing: HardHat,
  construction: Building2,
  other: Package
}

const GOOGLE_MAPS_KEY = "AIzaSyAAU2wsDoDPH4n9BNk_pWlxBla3irr_AtM"

export default function ChatbotWidget() {
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
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [bookingData, setBookingData] = useState({
    projectType: '',
    address: '',
    placementLat: null,
    placementLng: null,
    placementNotes: '',
    size: '',
    duration: '',
    deliveryDate: '',
    name: '',
    phone: '',
  })

  const messagesEndRef = useRef(null)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const polygonRef = useRef(null)
  const dumpsterCenterRef = useRef({ lat: 0, lng: 0 })
  const centerLatRef = useRef(null)
  const centerLngRef = useRef(null)
  const recognitionRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!hasAutoOpened && !isOpen) {
      const openTimer = setTimeout(() => {
        setIsOpen(true)
        setHasAutoOpened(true)
      }, 2000)
      return () => clearTimeout(openTimer)
    }
  }, [hasAutoOpened, isOpen])

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

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // Load Google Maps when entering map step
  useEffect(() => {
    if (step === STEPS.MAP_PLACEMENT && bookingData.address) {
      loadMap()
    }

    return () => {
      // Cleanup when leaving map step
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
    // Load Google Maps script if needed
    if (!window.google?.maps) {
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=geometry,geocoding`
        script.async = true
        document.head.appendChild(script)
      }

      // Wait for it to load (including Geocoder)
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

    // Geocode address
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: bookingData.address }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) return

      const location = results[0].geometry.location
      centerLatRef.current = location.lat()
      centerLngRef.current = location.lng()

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

  // Calculate polygon corners based on center, dimensions, and rotation
  const calculatePolygonCoords = (centerLat, centerLng, rotationDeg) => {
    // Dumpster dimensions: 22ft x 8ft
    const lengthFt = 22
    const widthFt = 8
    const lengthM = lengthFt * 0.3048
    const widthM = widthFt * 0.3048

    // Convert to degrees
    const metersPerDegreeLat = 111320
    const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180)
    const halfLengthDeg = (lengthM / 2) / metersPerDegreeLng
    const halfWidthDeg = (widthM / 2) / metersPerDegreeLat

    // Corner offsets (before rotation)
    const corners = [
      { dx: -halfLengthDeg, dy: -halfWidthDeg },
      { dx: halfLengthDeg, dy: -halfWidthDeg },
      { dx: halfLengthDeg, dy: halfWidthDeg },
      { dx: -halfLengthDeg, dy: halfWidthDeg },
    ]

    // Apply rotation
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

    // Store center position
    dumpsterCenterRef.current = { lat: centerLat, lng: centerLng }

    // Calculate initial polygon coordinates
    const coords = calculatePolygonCoords(centerLat, centerLng, 0)

    // Create draggable polygon for the dumpster
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

    // Set initial position
    setBookingData(prev => ({
      ...prev,
      placementLat: centerLat,
      placementLng: centerLng
    }))

    // Update position when dragged
    polygon.addListener('dragend', () => {
      // Calculate new center from polygon bounds
      const path = polygon.getPath()
      let sumLat = 0, sumLng = 0
      path.forEach(point => {
        sumLat += point.lat()
        sumLng += point.lng()
      })
      const newCenterLat = sumLat / 4
      const newCenterLng = sumLng / 4

      dumpsterCenterRef.current = { lat: newCenterLat, lng: newCenterLng }

      setBookingData(prev => ({
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

  // Rotate functions
  const rotateLeft = () => {
    setRotation(prev => {
      const newRot = (prev - 20) % 360
      return newRot < 0 ? newRot + 360 : newRot
    })
  }

  const rotateRight = () => {
    setRotation(prev => (prev + 20) % 360)
  }

  const addBotMessage = async (text, delay = 500) => {
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, delay))
    setIsTyping(false)
    setMessages(prev => [...prev, { type: 'bot', text }])
  }

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', text }])
  }

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage("Hey! Need a dumpster?\n\nI'll help you find the right size and get scheduled in about 30 seconds.", 300)
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
      await addBotMessage(`${project.label}? The ${dumpster.name} is perfect for that!\n\nWhat's the delivery address?`, 600)
    } else {
      await addBotMessage(`Got it! What's the delivery address?`, 600)
    }
    setStep(STEPS.ADDRESS)
  }

  // Get placeholder text based on current step
  const getPlaceholder = () => {
    switch (step) {
      case STEPS.PROJECT_TYPE:
        return "Or type: cleanout, renovation, roofing, construction..."
      case STEPS.ADDRESS:
        return "Enter delivery address..."
      case STEPS.SIZE:
        return "Or type: 20 yard or 30 yard..."
      case STEPS.DURATION:
        return "Or type: 3 days or 7 days..."
      case STEPS.DATE:
        return "Or type a date like: Monday, Jan 6..."
      case STEPS.CONTACT:
        return "Your name and phone (e.g. John Smith, 618-555-1234)"
      default:
        return "Type a message..."
    }
  }

  // Get voice help text based on current step
  const getVoiceHelpText = () => {
    switch (step) {
      case STEPS.PROJECT_TYPE:
        return "Say: cleanout, renovation, roofing, or construction"
      case STEPS.ADDRESS:
        return "Say your full address including city and state"
      case STEPS.SIZE:
        return "Say: 20 yard or 30 yard"
      case STEPS.DURATION:
        return "Say: 3 days or 7 days"
      case STEPS.DATE:
        return "Say your preferred delivery date"
      case STEPS.CONTACT:
        return "Say your name and phone number"
      default:
        return "Tap to speak"
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      try {
        recognitionRef.current.start()
      } catch (e) {
        // Already started
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

    const value = inputValue.trim().toLowerCase()
    const originalValue = inputValue.trim()
    setInputValue('')

    switch (step) {
      case STEPS.PROJECT_TYPE:
        // Try to match project type from text
        const projectMatch = config.projectTypes.find(p =>
          value.includes(p.id) || value.includes(p.label.toLowerCase())
        )
        if (projectMatch) {
          handleProjectType(projectMatch.id)
        } else {
          addUserMessage(originalValue)
          await addBotMessage("I didn't catch that. Please select a project type above, or type: cleanout, renovation, roofing, or construction.", 400)
        }
        break

      case STEPS.ADDRESS:
        setBookingData(prev => ({ ...prev, address: originalValue }))
        addUserMessage(originalValue)
        await addBotMessage(`Got it: ${originalValue}\n\nNow pick your dumpster size:`, 600)
        setStep(STEPS.SIZE)
        break

      case STEPS.SIZE:
        // Try to match size from text
        if (value.includes('20')) {
          handleSizeSelect('20yd')
        } else if (value.includes('30')) {
          handleSizeSelect('30yd')
        } else {
          addUserMessage(originalValue)
          await addBotMessage("Please select a dumpster size: 20 yard or 30 yard", 400)
        }
        break

      case STEPS.DURATION:
        if (value.includes('3')) {
          handleDurationSelect('3-day')
        } else if (value.includes('7')) {
          handleDurationSelect('7-day')
        } else {
          addUserMessage(originalValue)
          await addBotMessage("Please choose: 3 days or 7 days", 400)
        }
        break

      case STEPS.DATE:
        handleDateSelect(originalValue)
        break

      case STEPS.CONTACT:
        let name = originalValue
        let phone = ''

        const phoneMatch = originalValue.match(/[\d\-\(\)\s]{10,}/)
        if (phoneMatch) {
          phone = phoneMatch[0].replace(/\D/g, '')
          name = originalValue.replace(phoneMatch[0], '').replace(/[,\n]/g, '').trim()
        }

        setBookingData(prev => ({ ...prev, name, phone }))
        addUserMessage(originalValue)
        await addBotMessage(`Perfect, ${name}! Let me confirm your order...`, 600)
        setStep(STEPS.CONFIRM)
        break
    }
  }

  const handleSizeSelect = async (sizeId) => {
    const dumpster = config.dumpsters.find(d => d.id === sizeId)
    setBookingData(prev => ({ ...prev, size: sizeId }))
    addUserMessage(dumpster.name)

    await addBotMessage(`Great choice! The ${dumpster.name} is ${dumpster.dimensions.display}.\n\nTap "Place Dumpster" then drag the green box to show where you want it.`, 800)
    setStep(STEPS.MAP_PLACEMENT)
  }

  const handlePlacementConfirm = async () => {
    const notes = placementDescription.trim() || 'See map placement'
    setBookingData(prev => ({ ...prev, placementNotes: notes }))
    addUserMessage(`Placement confirmed`)

    await addBotMessage(`Got it!\n\nHow long do you need it?`, 600)
    setStep(STEPS.DURATION)
  }

  const handleGoBackToAddress = () => {
    setMessages(prev => prev.slice(0, -2))
    setBookingData(prev => ({ ...prev, address: '', size: '' }))
    setStep(STEPS.ADDRESS)
  }

  const handleDurationSelect = async (duration) => {
    const dumpster = config.dumpsters.find(d => d.id === bookingData.size)
    const price = dumpster.pricing[duration]
    setBookingData(prev => ({ ...prev, duration }))
    addUserMessage(duration === '3-day' ? '3 Days' : '7 Days')

    await addBotMessage(`That'll be $${price} for the ${duration === '3-day' ? '3' : '7'}-day rental.\n\nWhen do you want it delivered?`, 600)
    setStep(STEPS.DATE)
  }

  const handleDateSelect = async (date) => {
    setBookingData(prev => ({ ...prev, deliveryDate: date }))
    addUserMessage(date)

    await addBotMessage(`Quick heads up - these items CANNOT go in:\n\n- Tires, batteries, appliances with Freon\n- Electronics (TVs, computers)\n- Paint, chemicals, oil\n- Yard waste\n\nProhibited items = extra fees.`, 700)
    setStep(STEPS.PROHIBITED)
  }

  const handleProhibitedAck = async () => {
    addUserMessage('Got it!')
    await addBotMessage(`Last step - what's your name and phone number?\n\nExample: John Smith, 618-555-1234`, 600)
    setStep(STEPS.CONTACT)
  }

  const handleConfirm = async () => {
    addUserMessage('Confirm booking')
    setIsTyping(true)

    const dumpster = config.dumpsters.find(d => d.id === bookingData.size)
    const price = dumpster?.pricing[bookingData.duration] || 0

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
          priceCents: price * 100,
          projectType: bookingData.projectType,
        }),
      })

      const result = await response.json()
      setIsTyping(false)

      if (result.success) {
        await addBotMessage(`Booking confirmed!\n\n${config.businessName} will call or text you at ${bookingData.phone} to confirm your ${dumpster.name} delivery on ${bookingData.deliveryDate}.\n\nTotal: $${price}\n\nQuestions? Call ${config.phone}`)
      } else {
        await addBotMessage(`Something went wrong, but don't worry!\n\nCall us at ${config.phone} and we'll get you set up.\n\nReference: ${bookingData.address}`)
      }
    } catch (error) {
      console.error('Booking error:', error)
      setIsTyping(false)
      await addBotMessage(`Couldn't submit online.\n\nCall us at ${config.phone} - we'll book it for you!\n\nReference: ${bookingData.address}`)
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
        dates.push(date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }))
      }
    }
    return dates.slice(0, 6)
  }

  const selectedDumpster = config.dumpsters.find(d => d.id === bookingData.size)

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-[480px] h-[calc(100vh-120px)] max-h-[800px] bg-dark-900 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-dark-700">

          {/* Header */}
          <div className="bg-primary-500 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">{config.businessName}</h3>
                <p className="text-primary-100 text-sm">Online now - replies instantly</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Skip AI Confirmation Modal */}
          {showSkipConfirm && (
            <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center p-4">
              <div className="bg-dark-800 rounded-2xl p-5 max-w-sm w-full shadow-xl border border-dark-600">
                <h4 className="text-white font-bold text-lg mb-2">Skip the AI assistant?</h4>
                <p className="text-dark-300 text-sm mb-4">
                  This chatbot can help you book a dumpster in about 30 seconds! It'll recommend the right size for your project and show you exactly where it'll be placed.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSkipConfirm(false)}
                    className="flex-1 btn-primary py-3"
                  >
                    Use AI (Faster)
                  </button>
                  <a
                    href={`tel:${config.phoneRaw}`}
                    className="flex-1 bg-dark-600 hover:bg-dark-500 text-white py-3 rounded-xl text-center font-medium transition-colors"
                  >
                    Call Instead
                  </a>
                </div>
              </div>
            </div>
          )}

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

            {/* Project Type Selection */}
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
                        <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
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

            {/* Size Selection */}
            {!isTyping && step === STEPS.SIZE && (
              <div className="space-y-2">
                {config.dumpsters.map((dumpster) => {
                  const project = config.projectTypes.find(p => p.id === bookingData.projectType)
                  const isRecommended = project?.recommendedSize === dumpster.id
                  return (
                    <button
                      key={dumpster.id}
                      onClick={() => handleSizeSelect(dumpster.id)}
                      className={`w-full rounded-xl p-4 flex items-center justify-between transition-colors text-left ${
                        isRecommended
                          ? 'bg-primary-500/20 border-2 border-primary-500 hover:bg-primary-500/30'
                          : 'bg-dark-700 hover:bg-dark-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Truck className={`w-9 h-9 flex-shrink-0 ${isRecommended ? 'text-primary-400' : 'text-dark-400'}`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-white">{dumpster.name}</p>
                            {isRecommended && (
                              <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">
                                Best fit
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-dark-400">
                            {dumpster.dimensions.display} - {dumpster.weightIncluded}
                          </p>
                        </div>
                      </div>
                      <span className="text-primary-400 font-bold text-lg">${dumpster.pricing['3-day']}+</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Map Placement */}
            {!isTyping && step === STEPS.MAP_PLACEMENT && (
              <div className="space-y-3">
                <div className="bg-dark-700 rounded-xl overflow-hidden">
                  {/* Map Container */}
                  <div className="relative" style={{ height: '250px' }}>
                    <div
                      ref={mapContainerRef}
                      className="h-full w-full bg-dark-600"
                    />

                    {/* Loading overlay */}
                    {!mapLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-dark-600">
                        <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center mb-3 animate-pulse">
                          <MapPin className="w-7 h-7 text-primary-400" />
                        </div>
                        <p className="text-white font-medium">Loading satellite view...</p>
                        <p className="text-dark-400 text-sm">{bookingData.address}</p>
                      </div>
                    )}

                    {/* Place Dumpster Button Overlay */}
                    {mapLoaded && !dumpsterPlaced && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <button
                          onClick={placeDumpster}
                          className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all"
                        >
                          <Plus className="w-5 h-5" />
                          Place Dumpster Here
                        </button>
                      </div>
                    )}

                    {/* Rotate Buttons Overlay */}
                    {dumpsterPlaced && (
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <button
                          onClick={rotateLeft}
                          className="w-11 h-11 bg-dark-800/90 hover:bg-dark-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                        >
                          <RotateCcw className="w-5 h-5 text-primary-400" />
                        </button>
                        <button
                          onClick={rotateRight}
                          className="w-11 h-11 bg-dark-800/90 hover:bg-dark-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                        >
                          <RotateCw className="w-5 h-5 text-primary-400" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Map legend */}
                  <div className="p-3 bg-dark-800 border-t border-dark-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-3 bg-primary-500/60 border-2 border-primary-500 rounded-sm"></div>
                      <span className="text-sm text-dark-300">{selectedDumpster?.dimensions.display}</span>
                    </div>
                    {dumpsterPlaced && <span className="text-primary-400 text-sm font-medium">Drag to move</span>}
                  </div>
                </div>

                {/* Optional notes */}
                <input
                  type="text"
                  value={placementDescription}
                  onChange={(e) => setPlacementDescription(e.target.value)}
                  placeholder="Add notes (optional)... e.g. 'Left side of driveway'"
                  className="input-field w-full"
                />

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleGoBackToAddress}
                    className="flex-1 bg-dark-700 hover:bg-dark-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handlePlacementConfirm}
                    disabled={!dumpsterPlaced}
                    className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors ${
                      dumpsterPlaced
                        ? 'btn-primary'
                        : 'bg-dark-600 text-dark-400 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-5 h-5" />
                    Confirm Placement
                  </button>
                </div>
              </div>
            )}

            {/* Duration Selection */}
            {!isTyping && step === STEPS.DURATION && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDurationSelect('3-day')}
                  className="bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-5 text-center transition-colors"
                >
                  <p className="font-bold text-white text-xl">3 Days</p>
                  <p className="text-primary-400 font-semibold text-lg mt-1">
                    ${selectedDumpster?.pricing['3-day']}
                  </p>
                </button>
                <button
                  onClick={() => handleDurationSelect('7-day')}
                  className="bg-primary-500/20 border-2 border-primary-500 hover:bg-primary-500/30 rounded-xl p-5 text-center transition-colors"
                >
                  <p className="font-bold text-white text-xl">7 Days</p>
                  <p className="text-primary-400 font-semibold text-lg mt-1">
                    ${selectedDumpster?.pricing['7-day']}
                  </p>
                  <p className="text-sm text-primary-300 mt-1">Most popular</p>
                </button>
              </div>
            )}

            {/* Date Selection */}
            {!isTyping && step === STEPS.DATE && (
              <div className="grid grid-cols-3 gap-2">
                {getAvailableDates().map((date) => (
                  <button
                    key={date}
                    onClick={() => handleDateSelect(date)}
                    className="bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-3 text-center transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-primary-400 mx-auto mb-1" />
                    <p className="text-sm text-white font-medium">{date}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Prohibited Items */}
            {!isTyping && step === STEPS.PROHIBITED && (
              <button
                onClick={handleProhibitedAck}
                className="w-full btn-primary flex items-center justify-center gap-2 py-4"
              >
                <Check className="w-5 h-5" />
                I Understand
              </button>
            )}

            {/* Order Confirmation */}
            {!isTyping && step === STEPS.CONFIRM && (
              <div className="bg-dark-700 rounded-xl p-4">
                <h4 className="font-semibold text-white text-lg mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm mb-4">
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
                    <span className="text-white">{bookingData.duration === '3-day' ? '3 Days' : '7 Days'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-dark-600">
                    <span className="text-dark-400">Delivery</span>
                    <span className="text-white">{bookingData.deliveryDate}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-dark-600">
                    <span className="text-dark-400">Name</span>
                    <span className="text-white">{bookingData.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-dark-600">
                    <span className="text-dark-400">Phone</span>
                    <span className="text-white">{bookingData.phone}</span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-white font-bold text-lg">Total</span>
                    <span className="text-primary-400 font-bold text-xl">
                      ${selectedDumpster?.pricing[bookingData.duration]}
                    </span>
                  </div>
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

          {/* Always-visible Input Area */}
          {step !== STEPS.COMPLETE && step !== STEPS.MAP_PLACEMENT && (
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
                    className={`p-3 rounded-xl transition-colors relative group ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-dark-600 hover:bg-dark-500 text-dark-300'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    {/* Voice help tooltip */}
                    {!isListening && (
                      <span className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-dark-900 text-dark-300 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {getVoiceHelpText()}
                      </span>
                    )}
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white p-3 rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>

              {/* Voice listening indicator */}
              {isListening && (
                <p className="text-center text-sm text-primary-400 mt-2 animate-pulse">
                  Listening... {getVoiceHelpText()}
                </p>
              )}

              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setShowSkipConfirm(true)}
                  className="text-dark-400 hover:text-dark-300 text-sm flex items-center gap-1 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Prefer to call?
                </button>
                <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline text-sm flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {config.phone}
                </a>
              </div>
            </div>
          )}

          {/* Minimal input for map step */}
          {step === STEPS.MAP_PLACEMENT && (
            <div className="p-3 border-t border-dark-700 flex-shrink-0 bg-dark-800">
              <p className="text-center text-sm text-dark-400">
                Need help? <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {config.phone}
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            if (!hasAutoOpened) setHasAutoOpened(true)
          }}
          className="fixed bottom-6 right-6 w-16 h-16 bg-primary-500 hover:bg-primary-600 rounded-full shadow-lg flex items-center justify-center z-50 transition-all duration-300 animate-pulse"
        >
          <MessageCircle className="w-8 h-8 text-white" />
        </button>
      )}
    </div>
  )
}
