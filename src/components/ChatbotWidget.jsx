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
  Check,
  Home,
  Hammer,
  Building2,
  HardHat,
  Package,
  Phone,
  Move
} from 'lucide-react'

// Step definitions
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

// Project type icons
const projectIcons = {
  cleanout: Home,
  renovation: Hammer,
  roofing: HardHat,
  construction: Building2,
  other: Package
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [step, setStep] = useState(STEPS.WELCOME)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [bookingData, setBookingData] = useState({
    projectType: '',
    address: '',
    placement: null,
    placementNotes: '',
    size: '',
    duration: '',
    deliveryDate: '',
    name: '',
    phone: '',
  })
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Show nudge after 2 seconds, auto-open after 4 seconds
  useEffect(() => {
    if (!hasAutoOpened && !isOpen) {
      const nudgeTimer = setTimeout(() => {
        setShowNudge(true)
      }, 2000)
      
      const openTimer = setTimeout(() => {
        setIsOpen(true)
        setHasAutoOpened(true)
        setShowNudge(false)
      }, 4000)
      
      return () => {
        clearTimeout(nudgeTimer)
        clearTimeout(openTimer)
      }
    }
  }, [hasAutoOpened, isOpen])

  // Add bot message with typing effect
  const addBotMessage = async (text, delay = 500) => {
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, delay))
    setIsTyping(false)
    setMessages(prev => [...prev, { type: 'bot', text }])
  }

  // Add user message
  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', text }])
  }

  // Initialize conversation when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage("Hey! 👋 Need a dumpster?\n\nI'll help you find the right size and get scheduled in about 60 seconds.", 300)
      setStep(STEPS.PROJECT_TYPE)
    }
  }, [isOpen])

  // Handle project type selection
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

  // Handle form submission
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
        const parts = value.split(/[,\n]/).map(p => p.trim())
        const name = parts[0] || value
        const phone = parts[1] || ''
        setBookingData(prev => ({ ...prev, name, phone }))
        addUserMessage(value)
        await addBotMessage(`Perfect, ${name}! Let me confirm your order...`, 600)
        setStep(STEPS.CONFIRM)
        break
    }
  }

  // Handle dumpster size selection
  const handleSizeSelect = async (sizeId) => {
    const dumpster = config.dumpsters.find(d => d.id === sizeId)
    setBookingData(prev => ({ ...prev, size: sizeId }))
    addUserMessage(dumpster.name)
    
    await addBotMessage(`Great choice! The ${dumpster.name} is ${dumpster.dimensions.display}.\n\n📍 Where should we put it?`, 800)
    setStep(STEPS.MAP_PLACEMENT)
  }

  // Handle placement confirmation
  const handlePlacementConfirm = async (notes) => {
    setBookingData(prev => ({ ...prev, placementNotes: notes || 'Driveway' }))
    addUserMessage(`📍 ${notes || 'Driveway'}`)
    
    await addBotMessage(`Got it — ${notes}! 👍\n\nHow long do you need it?`, 600)
    setStep(STEPS.DURATION)
  }

  // Handle duration selection
  const handleDurationSelect = async (duration) => {
    const dumpster = config.dumpsters.find(d => d.id === bookingData.size)
    const price = dumpster.pricing[duration]
    setBookingData(prev => ({ ...prev, duration }))
    addUserMessage(duration === '3-day' ? '3 Days' : '7 Days')
    
    await addBotMessage(`That'll be $${price} for the ${duration === '3-day' ? '3' : '7'}-day rental.\n\nWhen do you want it delivered?`, 600)
    setStep(STEPS.DATE)
  }

  // Handle date selection
  const handleDateSelect = async (date) => {
    setBookingData(prev => ({ ...prev, deliveryDate: date }))
    addUserMessage(date)
    
    await addBotMessage(`🚫 Quick heads up — these items CANNOT go in:\n\n• Tires, batteries, appliances with Freon\n• Electronics (TVs, computers)\n• Paint, chemicals, oil\n• Yard waste\n\nPutting prohibited items in = extra fees.`, 700)
    setStep(STEPS.PROHIBITED)
  }

  // Handle prohibited acknowledgment
  const handleProhibitedAck = async () => {
    addUserMessage('Got it!')
    await addBotMessage(`Last step — what's your name and phone number?\n\nWe'll text you to confirm delivery.`, 600)
    setStep(STEPS.CONTACT)
  }

  // Handle booking confirmation
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
          placementLat: bookingData.placement?.lat,
          placementLng: bookingData.placement?.lng,
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

  // Generate available dates
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
      {/* Chat Window - Full screen on mobile */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 md:w-[400px] md:h-[600px] md:max-h-[80vh] bg-dark-900 md:rounded-2xl shadow-2xl flex flex-col z-50 md:border md:border-dark-700">
          
          {/* Header */}
          <div className="bg-primary-500 p-4 flex items-center justify-between md:rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{config.businessName}</h3>
                <p className="text-primary-100 text-sm">Online now</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-2 -mr-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-dark-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                </div>
              </div>
            )}

            {/* Project Type Selection */}
            {!isTyping && step === STEPS.PROJECT_TYPE && messages.length > 0 && (
              <div className="space-y-2">
                <p className="text-dark-400 text-sm mb-3">What kind of project?</p>
                {config.projectTypes.map((project) => {
                  const Icon = projectIcons[project.id]
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleProjectType(project.id)}
                      className="w-full bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-4 flex items-center gap-4 transition-colors text-left"
                    >
                      <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-primary-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{project.emoji} {project.label}</p>
                        <p className="text-xs text-dark-400">{project.description}</p>
                      </div>
                    </button>
                  )
                })}
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
                        <Truck className={`w-8 h-8 flex-shrink-0 ${isRecommended ? 'text-primary-400' : 'text-dark-400'}`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-white">{dumpster.name}</p>
                            {isRecommended && (
                              <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">
                                Best fit
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-dark-400">
                            {dumpster.dimensions.display} • {dumpster.weightIncluded} included
                          </p>
                        </div>
                      </div>
                      <span className="text-primary-400 font-bold">${dumpster.pricing['3-day']}+</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Map Placement */}
            {!isTyping && step === STEPS.MAP_PLACEMENT && (
              <div className="space-y-3">
                <div className="bg-dark-700 rounded-xl overflow-hidden">
                  <div className="h-48 bg-dark-600 relative flex flex-col items-center justify-center text-center p-4">
                    <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-2">
                      <Move className="w-7 h-7 text-primary-400" />
                    </div>
                    <p className="text-white font-medium text-sm mb-1">Dumpster Size</p>
                    <p className="text-primary-400 font-bold">{selectedDumpster?.dimensions.display}</p>
                    {/* Visual dumpster */}
                    <div 
                      className="border-2 border-primary-400 border-dashed rounded bg-primary-500/10 flex items-center justify-center mt-3"
                      style={{ width: '100px', height: '36px' }}
                    >
                      <Truck className="w-5 h-5 text-primary-400" />
                    </div>
                    <p className="text-dark-500 text-xs mt-2">
                      📍 {bookingData.address}
                    </p>
                  </div>
                </div>
                
                <p className="text-dark-400 text-sm">Where should we put it?</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Driveway', 'Street', 'Side of house', 'Backyard'].map((location) => (
                    <button
                      key={location}
                      onClick={() => handlePlacementConfirm(location)}
                      className="bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-lg p-3 text-sm text-white transition-colors"
                    >
                      {location}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const custom = prompt('Where should we put the dumpster?')
                    if (custom) handlePlacementConfirm(custom)
                  }}
                  className="w-full text-primary-400 text-sm hover:underline"
                >
                  + Other location
                </button>
              </div>
            )}

            {/* Duration Selection */}
            {!isTyping && step === STEPS.DURATION && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDurationSelect('3-day')}
                  className="bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-4 text-center transition-colors"
                >
                  <p className="font-bold text-white text-lg">3 Days</p>
                  <p className="text-primary-400 font-semibold">
                    ${selectedDumpster?.pricing['3-day']}
                  </p>
                </button>
                <button
                  onClick={() => handleDurationSelect('7-day')}
                  className="bg-primary-500/20 border-2 border-primary-500 hover:bg-primary-500/30 rounded-xl p-4 text-center transition-colors"
                >
                  <p className="font-bold text-white text-lg">7 Days</p>
                  <p className="text-primary-400 font-semibold">
                    ${selectedDumpster?.pricing['7-day']}
                  </p>
                  <p className="text-xs text-primary-300 mt-1">Most popular</p>
                </button>
              </div>
            )}

            {/* Date Selection */}
            {!isTyping && step === STEPS.DATE && (
              <div className="grid grid-cols-2 gap-2">
                {getAvailableDates().map((date) => (
                  <button
                    key={date}
                    onClick={() => handleDateSelect(date)}
                    className="bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-3 text-center transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-primary-400 mx-auto mb-1" />
                    <p className="text-sm text-white">{date}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Prohibited Items Acknowledgment */}
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
                <h4 className="font-semibold text-white mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-dark-400">Address</span>
                    <span className="text-white text-right max-w-[55%] truncate">{bookingData.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Placement</span>
                    <span className="text-white">{bookingData.placementNotes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Dumpster</span>
                    <span className="text-white">{selectedDumpster?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Duration</span>
                    <span className="text-white">{bookingData.duration === '3-day' ? '3 Days' : '7 Days'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Delivery</span>
                    <span className="text-white">{bookingData.deliveryDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Name</span>
                    <span className="text-white">{bookingData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Phone</span>
                    <span className="text-white">{bookingData.phone}</span>
                  </div>
                  <div className="flex justify-between border-t border-dark-600 pt-2 mt-2">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-primary-400 font-bold text-lg">
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

          {/* Input Area */}
          {(step === STEPS.ADDRESS || step === STEPS.CONTACT) && (
            <form onSubmit={handleSubmit} className="p-4 border-t border-dark-700 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    step === STEPS.ADDRESS 
                      ? "Enter delivery address..." 
                      : "Your name, phone number"
                  }
                  className="input-field flex-1 text-base"
                  autoFocus
                />
                <button 
                  type="submit"
                  className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white p-3 rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          {step !== STEPS.COMPLETE && (
            <div className="px-4 pb-4 pt-2 flex-shrink-0">
              <p className="text-center text-xs text-dark-500">
                Prefer to talk?{' '}
                <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {config.phone}
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Nudge bubble */}
      {!isOpen && showNudge && (
        <div 
          className="fixed bottom-24 right-6 bg-white text-dark-900 px-4 py-3 rounded-2xl shadow-lg z-40 max-w-[200px] cursor-pointer animate-fade-in"
          onClick={() => {
            setIsOpen(true)
            setHasAutoOpened(true)
            setShowNudge(false)
          }}
        >
          <p className="text-sm font-medium">Need a dumpster? 🚛</p>
          <p className="text-xs text-dark-500">Get a quote in 60 seconds</p>
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white transform rotate-45"></div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setShowNudge(false)
          if (!hasAutoOpened) setHasAutoOpened(true)
        }}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 transition-all duration-300 ${
          isOpen 
            ? 'bg-dark-700 hover:bg-dark-600' 
            : 'bg-primary-500 hover:bg-primary-600 animate-pulse'
        }`}
      >
        {isOpen ? (
          <X className="w-7 h-7 text-white" />
        ) : (
          <MessageCircle className="w-7 h-7 text-white" />
        )}
      </button>
    </div>
  )
}
