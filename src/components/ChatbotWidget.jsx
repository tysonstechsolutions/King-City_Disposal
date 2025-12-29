'use client'

import { useState, useEffect, useRef } from 'react'
import { config } from '../config'
import { 
  MessageCircle, 
  X, 
  Send, 
  MapPin, 
  Calendar,
  Truck,
  User,
  Phone,
  Check,
  AlertTriangle,
  ArrowRight,
  Loader2
} from 'lucide-react'

// Chat steps
const STEPS = {
  GREETING: 'greeting',
  ADDRESS: 'address',
  MAP: 'map',
  SIZE: 'size',
  DURATION: 'duration',
  DATE: 'date',
  PROHIBITED: 'prohibited',
  CONTACT: 'contact',
  CONFIRM: 'confirm',
  COMPLETE: 'complete'
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(STEPS.GREETING)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [bookingData, setBookingData] = useState({
    address: '',
    placement: null, // {lat, lng}
    size: '',
    duration: '',
    deliveryDate: '',
    name: '',
    phone: '',
  })
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

  // Initialize chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage(`Hey! 👋 Need a dumpster? I can get you a quote in about 60 seconds.\n\nWhat's the delivery address?`)
      setStep(STEPS.ADDRESS)
    }
  }, [isOpen])

  // Handle user input
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const userInput = inputValue.trim()
    setInputValue('')
    addUserMessage(userInput)

    // Process based on current step
    switch (step) {
      case STEPS.ADDRESS:
        setBookingData(prev => ({ ...prev, address: userInput }))
        await addBotMessage(`Got it — ${userInput}\n\nNow I need you to show me exactly where to put the dumpster. Tap on the map to drop a pin.`, 800)
        setStep(STEPS.MAP)
        break

      case STEPS.CONTACT:
        // Parse name and phone
        // Simple parsing - in production you'd want better validation
        const parts = userInput.split(/[,\n]/).map(s => s.trim())
        const name = parts[0] || userInput
        const phone = parts[1] || ''
        
        setBookingData(prev => ({ ...prev, name, phone }))
        await addBotMessage(`Perfect, ${name}! Let me confirm your order...`, 600)
        setStep(STEPS.CONFIRM)
        break

      default:
        break
    }
  }

  // Handle size selection
  const handleSizeSelect = async (size) => {
    const dumpster = config.dumpsters.find(d => d.id === size)
    setBookingData(prev => ({ ...prev, size }))
    addUserMessage(dumpster.name)
    
    await addBotMessage(`Great choice! The ${dumpster.name} is perfect for most projects.\n\nHow long do you need it?`)
    setStep(STEPS.DURATION)
  }

  // Handle duration selection
  const handleDurationSelect = async (duration) => {
    const dumpster = config.dumpsters.find(d => d.id === bookingData.size)
    const price = dumpster.pricing[duration]
    
    setBookingData(prev => ({ ...prev, duration }))
    addUserMessage(duration === '3-day' ? '3 Days' : '7 Days')
    
    await addBotMessage(`That'll be $${price} for the ${duration === '3-day' ? '3' : '7'}-day rental.\n\nWhen do you want it delivered?`)
    setStep(STEPS.DATE)
  }

  // Handle date selection
  const handleDateSelect = async (date) => {
    setBookingData(prev => ({ ...prev, deliveryDate: date }))
    addUserMessage(date)
    
    await addBotMessage(`🚫 Quick heads up — these items CANNOT go in the dumpster:\n\n• Tires, batteries, appliances with Freon\n• Electronics (TVs, computers)\n• Hazardous chemicals, paint, oil\n• Yard waste (grass, leaves)\n\nPutting these items in will result in extra fees. Got it?`)
    setStep(STEPS.PROHIBITED)
  }

  // Handle prohibited acknowledgment
  const handleProhibitedAck = async () => {
    addUserMessage('Got it!')
    await addBotMessage(`Perfect! Last step — what's your name and phone number?\n\n${config.businessName} will text you to confirm.`)
    setStep(STEPS.CONTACT)
  }

  // Handle map placement (simplified - in production you'd use Leaflet)
  const handleMapClick = async () => {
    // Simulate map placement
    setBookingData(prev => ({ ...prev, placement: { lat: 38.6689, lng: -88.4856 } }))
    addUserMessage('📍 Placement selected')
    
    await addBotMessage(`Perfect! I can see the spot.\n\nWhat size dumpster do you need?`)
    setStep(STEPS.SIZE)
  }

  // Handle booking confirmation
  const handleConfirm = async () => {
    addUserMessage('Confirm booking')
    setIsTyping(true)
    
    // Get price
    const dumpster = config.dumpsters.find(d => d.id === bookingData.size)
    const price = dumpster?.pricing[bookingData.duration] || 0
    
    try {
      // Submit to API
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: bookingData.name,
          customerPhone: bookingData.phone,
          customerEmail: null,
          address: bookingData.address,
          placementLat: bookingData.placement?.lat,
          placementLng: bookingData.placement?.lng,
          dumpsterSize: bookingData.size,
          rentalDuration: bookingData.duration,
          deliveryDate: bookingData.deliveryDate,
          priceCents: price * 100,
        }),
      })
      
      const result = await response.json()
      
      setIsTyping(false)
      
      if (result.success) {
        await addBotMessage(`✅ Booking confirmed!\n\n${config.businessName} will call or text you at ${bookingData.phone} to confirm your ${dumpster.name} delivery on ${bookingData.deliveryDate}.\n\nTotal: $${price}\n\nQuestions? Call ${config.phone}`)
      } else {
        await addBotMessage(`⚠️ Something went wrong, but don't worry!\n\nPlease call us directly at ${config.phone} and we'll get you set up right away.\n\nReference: ${bookingData.address}`)
      }
    } catch (error) {
      console.error('Booking error:', error)
      setIsTyping(false)
      await addBotMessage(`⚠️ Couldn't submit online, but no worries!\n\nCall us at ${config.phone} and we'll book it for you.\n\nReference: ${bookingData.address}, ${dumpster?.name}`)
    }
    
    setStep(STEPS.COMPLETE)
  }

  // Get available dates (next 14 days, excluding Sundays)
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      // Skip Sundays
      if (date.getDay() !== 0) {
        dates.push(date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }))
      }
    }
    return dates.slice(0, 6) // Show first 6 available
  }

  return (
    <div className="chatbot-container">
      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window animate-slide-up mb-4">
          {/* Header */}
          <div className="bg-primary-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{config.businessName}</h3>
                <p className="text-primary-100 text-sm">Usually replies instantly</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.type === 'user' 
                      ? 'bg-primary-500 text-white rounded-br-md' 
                      : 'bg-dark-700 text-white rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-dark-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Interactive elements based on step */}
            {!isTyping && step === STEPS.MAP && (
              <div className="bg-dark-700 rounded-xl p-4">
                <div 
                  className="h-48 bg-dark-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-dark-500 transition-colors"
                  onClick={handleMapClick}
                >
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-primary-400 mx-auto mb-2" />
                    <p className="text-dark-300 text-sm">Tap to select placement</p>
                    <p className="text-dark-400 text-xs">(Map loads here in production)</p>
                  </div>
                </div>
              </div>
            )}

            {!isTyping && step === STEPS.SIZE && (
              <div className="space-y-2">
                {config.dumpsters.map((dumpster) => (
                  <button
                    key={dumpster.id}
                    onClick={() => handleSizeSelect(dumpster.id)}
                    className="w-full bg-dark-700 hover:bg-dark-600 rounded-xl p-4 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-8 h-8 text-primary-400" />
                      <div className="text-left">
                        <p className="font-semibold text-white">{dumpster.name}</p>
                        <p className="text-xs text-dark-400">{dumpster.weightIncluded} included</p>
                      </div>
                    </div>
                    <span className="text-primary-400 font-bold">
                      ${dumpster.pricing['3-day']}+
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!isTyping && step === STEPS.DURATION && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDurationSelect('3-day')}
                  className="bg-dark-700 hover:bg-dark-600 rounded-xl p-4 text-center transition-colors"
                >
                  <p className="font-semibold text-white">3 Days</p>
                  <p className="text-sm text-primary-400">
                    ${config.dumpsters.find(d => d.id === bookingData.size)?.pricing['3-day']}
                  </p>
                </button>
                <button
                  onClick={() => handleDurationSelect('7-day')}
                  className="bg-dark-700 hover:bg-dark-600 rounded-xl p-4 text-center transition-colors"
                >
                  <p className="font-semibold text-white">7 Days</p>
                  <p className="text-sm text-primary-400">
                    ${config.dumpsters.find(d => d.id === bookingData.size)?.pricing['7-day']}
                  </p>
                </button>
              </div>
            )}

            {!isTyping && step === STEPS.DATE && (
              <div className="grid grid-cols-2 gap-2">
                {getAvailableDates().map((date) => (
                  <button
                    key={date}
                    onClick={() => handleDateSelect(date)}
                    className="bg-dark-700 hover:bg-dark-600 rounded-xl p-3 text-center transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-primary-400 mx-auto mb-1" />
                    <p className="text-sm text-white">{date}</p>
                  </button>
                ))}
              </div>
            )}

            {!isTyping && step === STEPS.PROHIBITED && (
              <button
                onClick={handleProhibitedAck}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                I Understand
              </button>
            )}

            {!isTyping && step === STEPS.CONFIRM && (
              <div className="bg-dark-700 rounded-xl p-4">
                <h4 className="font-semibold text-white mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-dark-400">Address</span>
                    <span className="text-white">{bookingData.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Dumpster</span>
                    <span className="text-white">
                      {config.dumpsters.find(d => d.id === bookingData.size)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Duration</span>
                    <span className="text-white">
                      {bookingData.duration === '3-day' ? '3 Days' : '7 Days'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Delivery</span>
                    <span className="text-white">{bookingData.deliveryDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Name</span>
                    <span className="text-white">{bookingData.name}</span>
                  </div>
                  <div className="flex justify-between border-t border-dark-600 pt-2 mt-2">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-primary-400 font-bold">
                      ${config.dumpsters.find(d => d.id === bookingData.size)?.pricing[bookingData.duration]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleConfirm}
                  className="w-full btn-accent flex items-center justify-center gap-2"
                >
                  Confirm Booking
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {(step === STEPS.ADDRESS || step === STEPS.CONTACT) && (
            <form onSubmit={handleSubmit} className="p-4 border-t border-dark-700">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    step === STEPS.ADDRESS 
                      ? "Enter your address..." 
                      : "Your name, phone number"
                  }
                  className="input-field flex-1"
                />
                <button 
                  type="submit"
                  className="bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          {/* Escape hatch */}
          {step !== STEPS.COMPLETE && (
            <div className="px-4 pb-4">
              <p className="text-center text-xs text-dark-500">
                Prefer to talk? Call{' '}
                <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline">
                  {config.phone}
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chat Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`chatbot-bubble ${isOpen ? 'bg-dark-700' : ''}`}
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
