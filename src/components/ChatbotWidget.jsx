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
  RotateCw
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
  const markerRef = useRef(null)
  const centerLatRef = useRef(null)
  const centerLngRef = useRef(null)

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
        if (markerRef.current) {
          markerRef.current.setMap(null)
          markerRef.current = null
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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=geometry&loading=async`
        script.async = true
        document.head.appendChild(script)
      }
      
      // Wait for it to load
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

  const placeDumpster = () => {
    if (!mapRef.current || !window.google?.maps) return

    const map = mapRef.current
    const center = map.getCenter()

    // Create a draggable marker for the dumpster
    const dumpsterMarker = new window.google.maps.Marker({
      position: center,
      map: map,
      draggable: true,
      icon: {
        path: 'M -15,-8 L 15,-8 L 15,8 L -15,8 Z',
        fillColor: '#22c55e',
        fillOpacity: 0.7,
        strokeColor: '#22c55e',
        strokeWeight: 3,
        scale: 1.5,
        rotation: rotation,
      },
      title: 'Drag to position dumpster'
    })

    markerRef.current = dumpsterMarker

    // Set initial position
    setBookingData(prev => ({
      ...prev,
      placementLat: center.lat(),
      placementLng: center.lng()
    }))

    // Update position when dragged
    dumpsterMarker.addListener('dragend', () => {
      const pos = dumpsterMarker.getPosition()
      setBookingData(prev => ({
        ...prev,
        placementLat: pos.lat(),
        placementLng: pos.lng()
      }))
    })

    setDumpsterPlaced(true)
    setRotation(0) // Reset rotation when placing new dumpster
  }

  // Update marker icon when rotation changes
  useEffect(() => {
    if (markerRef.current && dumpsterPlaced) {
      const currentIcon = markerRef.current.getIcon()
      markerRef.current.setIcon({
        ...currentIcon,
        rotation: rotation
      })
    }
  }, [rotation, dumpsterPlaced])

  // Handle scroll wheel rotation on map
  const handleMapWheel = (e) => {
    if (dumpsterPlaced && markerRef.current) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 15 : -15
      setRotation(prev => {
        const newRotation = (prev + delta) % 360
        return newRotation < 0 ? newRotation + 360 : newRotation
      })
    }
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
      addBotMessage("Hey! 👋 Need a dumpster?\n\nI'll help you find the right size and get scheduled in about 60 seconds.", 300)
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
      await addBotMessage(`${project.label}? The ${dumpster.name} is perfect for that! 👍\n\nWhat's the delivery address?`, 600)
    } else {
      await addBotMessage(`Got it! What's the delivery address?`, 600)
    }
    setStep(STEPS.ADDRESS)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const value = inputValue.trim()
    setInputValue('')

    switch (step) {
      case STEPS.ADDRESS:
        setBookingData(prev => ({ ...prev, address: value }))
        addUserMessage(value)
        await addBotMessage(`📍 ${value}\n\nNow pick your dumpster size:`, 600)
        setStep(STEPS.SIZE)
        break
        
      case STEPS.CONTACT:
        let name = value
        let phone = ''
        
        const phoneMatch = value.match(/[\d\-\(\)\s]{10,}/)
        if (phoneMatch) {
          phone = phoneMatch[0].replace(/\D/g, '')
          name = value.replace(phoneMatch[0], '').replace(/[,\n]/g, '').trim()
        }
        
        setBookingData(prev => ({ ...prev, name, phone }))
        addUserMessage(value)
        await addBotMessage(`Perfect, ${name}! Let me confirm your order...`, 600)
        setStep(STEPS.CONFIRM)
        break
    }
  }

  const handleSizeSelect = async (sizeId) => {
    const dumpster = config.dumpsters.find(d => d.id === sizeId)
    setBookingData(prev => ({ ...prev, size: sizeId }))
    addUserMessage(dumpster.name)
    
    await addBotMessage(`Great choice! The ${dumpster.name} is ${dumpster.dimensions.display}.\n\n📍 Tap "Place Dumpster" then drag the green box to show where you want it.`, 800)
    setStep(STEPS.MAP_PLACEMENT)
  }

  const handlePlacementConfirm = async () => {
    const notes = placementDescription.trim() || 'See map placement'
    setBookingData(prev => ({ ...prev, placementNotes: notes }))
    addUserMessage(`📍 Placement confirmed`)
    
    await addBotMessage(`Got it! 👍\n\nHow long do you need it?`, 600)
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
    
    await addBotMessage(`🚫 Quick heads up — these items CANNOT go in:\n\n• Tires, batteries, appliances with Freon\n• Electronics (TVs, computers)\n• Paint, chemicals, oil\n• Yard waste\n\nPutting prohibited items in = extra fees.`, 700)
    setStep(STEPS.PROHIBITED)
  }

  const handleProhibitedAck = async () => {
    addUserMessage('Got it!')
    await addBotMessage(`Last step — what's your name and phone number?\n\nExample: John Smith, 618-555-1234`, 600)
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
        await addBotMessage(`✅ Booking confirmed!\n\n${config.businessName} will call or text you at ${bookingData.phone} to confirm your ${dumpster.name} delivery on ${bookingData.deliveryDate}.\n\nTotal: $${price}\n\nQuestions? Call ${config.phone}`)
      } else {
        await addBotMessage(`⚠️ Something went wrong, but don't worry!\n\nCall us at ${config.phone} and we'll get you set up.\n\nReference: ${bookingData.address}`)
      }
    } catch (error) {
      console.error('Booking error:', error)
      setIsTyping(false)
      await addBotMessage(`⚠️ Couldn't submit online.\n\nCall us at ${config.phone} — we'll book it for you!\n\nReference: ${bookingData.address}`)
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
        <div className="fixed inset-0 bg-dark-900 flex flex-col z-50">
          
          <div className="bg-primary-500 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{config.businessName}</h3>
                <p className="text-primary-100 text-sm">Online now • Usually replies instantly</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <div className="max-w-2xl mx-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex mb-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-4 ${
                    msg.type === 'user' 
                      ? 'bg-primary-500 text-white rounded-br-md' 
                      : 'bg-dark-700 text-white rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-line text-base leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start mb-4">
                  <div className="bg-dark-700 rounded-2xl rounded-bl-md px-5 py-4">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 bg-dark-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                      <span className="w-2.5 h-2.5 bg-dark-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                      <span className="w-2.5 h-2.5 bg-dark-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                  </div>
                </div>
              )}

              {/* Project Type Selection */}
              {!isTyping && step === STEPS.PROJECT_TYPE && messages.length > 0 && (
                <div className="space-y-3 mt-4">
                  <p className="text-dark-400 text-base mb-4">What kind of project are you working on?</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {config.projectTypes.map((project) => {
                      const Icon = projectIcons[project.id]
                      return (
                        <button
                          key={project.id}
                          onClick={() => handleProjectType(project.id)}
                          className="w-full bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-5 flex items-center gap-4 transition-colors text-left"
                        >
                          <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Icon className="w-7 h-7 text-primary-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-lg">{project.emoji} {project.label}</p>
                            <p className="text-sm text-dark-400">{project.description}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {!isTyping && step === STEPS.SIZE && (
                <div className="space-y-3 mt-4">
                  {config.dumpsters.map((dumpster) => {
                    const project = config.projectTypes.find(p => p.id === bookingData.projectType)
                    const isRecommended = project?.recommendedSize === dumpster.id
                    return (
                      <button
                        key={dumpster.id}
                        onClick={() => handleSizeSelect(dumpster.id)}
                        className={`w-full rounded-xl p-5 flex items-center justify-between transition-colors text-left ${
                          isRecommended 
                            ? 'bg-primary-500/20 border-2 border-primary-500 hover:bg-primary-500/30' 
                            : 'bg-dark-700 hover:bg-dark-600'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Truck className={`w-10 h-10 flex-shrink-0 ${isRecommended ? 'text-primary-400' : 'text-dark-400'}`} />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-white text-lg">{dumpster.name}</p>
                              {isRecommended && (
                                <span className="text-xs bg-primary-500 text-white px-3 py-1 rounded-full font-medium">
                                  ⭐ Best fit
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-dark-400">
                              {dumpster.dimensions.display} • {dumpster.weightIncluded} included
                            </p>
                          </div>
                        </div>
                        <span className="text-primary-400 font-bold text-xl">${dumpster.pricing['3-day']}+</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Map Placement */}
              {!isTyping && step === STEPS.MAP_PLACEMENT && (
                <div className="space-y-4 mt-4">
                  <div className="bg-dark-700 rounded-xl overflow-hidden">
                    {/* Map Container */}
                    <div className="relative" style={{ minHeight: '300px' }}>
                      <div
                        ref={mapContainerRef}
                        className="h-72 md:h-96 w-full bg-dark-600"
                        onWheel={handleMapWheel}
                      />
                      
                      {/* Loading overlay */}
                      {!mapLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-dark-600">
                          <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-3 animate-pulse">
                            <MapPin className="w-8 h-8 text-primary-400" />
                          </div>
                          <p className="text-white font-medium mb-1">Loading satellite view...</p>
                          <p className="text-dark-400 text-sm">{bookingData.address}</p>
                        </div>
                      )}

                      {/* Place Dumpster Button Overlay */}
                      {mapLoaded && !dumpsterPlaced && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <button
                            onClick={placeDumpster}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-4 rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg transform hover:scale-105 transition-all"
                          >
                            <Plus className="w-6 h-6" />
                            Place Dumpster Here
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Map legend */}
                    <div className="p-4 bg-dark-800 border-t border-dark-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-4 bg-primary-500/60 border-2 border-primary-500 rounded"></div>
                          <span className="text-sm text-dark-300">
                            {selectedDumpster?.name} ({selectedDumpster?.dimensions.display})
                          </span>
                        </div>
                        {dumpsterPlaced && (
                          <div className="flex items-center gap-2">
                            {/* Rotation buttons for mobile */}
                            <button
                              onClick={() => setRotation(prev => {
                                const newRot = (prev - 45) % 360
                                return newRot < 0 ? newRot + 360 : newRot
                              })}
                              className="p-2 bg-dark-600 hover:bg-dark-500 rounded-lg transition-colors"
                              title="Rotate left"
                            >
                              <RotateCcw className="w-4 h-4 text-primary-400" />
                            </button>
                            <button
                              onClick={() => setRotation(prev => (prev + 45) % 360)}
                              className="p-2 bg-dark-600 hover:bg-dark-500 rounded-lg transition-colors"
                              title="Rotate right"
                            >
                              <RotateCw className="w-4 h-4 text-primary-400" />
                            </button>
                            <span className="text-primary-400 text-sm font-medium hidden md:inline">
                              Scroll to rotate
                            </span>
                          </div>
                        )}
                      </div>
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
                      className="flex-1 bg-dark-700 hover:bg-dark-600 text-white rounded-xl p-4 flex items-center justify-center gap-2 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      Wrong address
                    </button>
                    <button
                      onClick={handlePlacementConfirm}
                      disabled={!dumpsterPlaced}
                      className={`flex-[2] flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-colors ${
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
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={() => handleDurationSelect('3-day')}
                    className="bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-6 text-center transition-colors"
                  >
                    <p className="font-bold text-white text-2xl">3 Days</p>
                    <p className="text-primary-400 font-semibold text-xl mt-1">
                      ${selectedDumpster?.pricing['3-day']}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDurationSelect('7-day')}
                    className="bg-primary-500/20 border-2 border-primary-500 hover:bg-primary-500/30 rounded-xl p-6 text-center transition-colors"
                  >
                    <p className="font-bold text-white text-2xl">7 Days</p>
                    <p className="text-primary-400 font-semibold text-xl mt-1">
                      ${selectedDumpster?.pricing['7-day']}
                    </p>
                    <p className="text-sm text-primary-300 mt-2">⭐ Most popular</p>
                  </button>
                </div>
              )}

              {/* Date Selection */}
              {!isTyping && step === STEPS.DATE && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {getAvailableDates().map((date) => (
                    <button
                      key={date}
                      onClick={() => handleDateSelect(date)}
                      className="bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-4 text-center transition-colors"
                    >
                      <Calendar className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                      <p className="text-base text-white font-medium">{date}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Prohibited Items */}
              {!isTyping && step === STEPS.PROHIBITED && (
                <button
                  onClick={handleProhibitedAck}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-5 text-lg mt-4"
                >
                  <Check className="w-6 h-6" />
                  I Understand
                </button>
              )}

              {/* Order Confirmation */}
              {!isTyping && step === STEPS.CONFIRM && (
                <div className="bg-dark-700 rounded-xl p-6 mt-4">
                  <h4 className="font-semibold text-white text-xl mb-4">📋 Order Summary</h4>
                  <div className="space-y-3 text-base mb-6">
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Address</span>
                      <span className="text-white text-right max-w-[60%]">{bookingData.address}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Placement</span>
                      <span className="text-white">{bookingData.placementNotes}</span>
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
                      <span className="text-dark-400">Delivery Date</span>
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
                    <div className="flex justify-between pt-4">
                      <span className="text-white font-bold text-xl">Total</span>
                      <span className="text-primary-400 font-bold text-2xl">
                        ${selectedDumpster?.pricing[bookingData.duration]}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleConfirm}
                    className="w-full btn-accent flex items-center justify-center gap-2 py-5 text-lg"
                  >
                    ✅ Confirm Booking
                    <ArrowRight className="w-6 h-6" />
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {(step === STEPS.ADDRESS || step === STEPS.CONTACT) && (
            <form onSubmit={handleSubmit} className="p-4 md:p-6 border-t border-dark-700 flex-shrink-0 bg-dark-800">
              <div className="max-w-2xl mx-auto flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    step === STEPS.ADDRESS 
                      ? "Enter delivery address..." 
                      : "Your name, phone number (e.g. John Smith, 618-555-1234)"
                  }
                  className="input-field flex-1 text-lg py-4"
                  autoFocus
                />
                <button 
                  type="submit"
                  className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white p-4 rounded-xl transition-colors"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </form>
          )}

          {step !== STEPS.COMPLETE && (
            <div className="px-4 pb-6 pt-3 flex-shrink-0 bg-dark-800">
              <p className="text-center text-base text-dark-400">
                Prefer to talk?{' '}
                <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline inline-flex items-center gap-1 font-medium">
                  <Phone className="w-4 h-4" />
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
