'use client'

import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { config } from '../../config'

// Step definitions
export const STEPS = {
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

// Create context
const ChatbotContext = createContext(null)

// Provider component
export function ChatbotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)
  const [step, setStep] = useState(STEPS.WELCOME)
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
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

  // Availability state
  const [availability, setAvailability] = useState({})
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // Refs
  const messagesEndRef = useRef(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  // Check if size is available
  const isSizeAvailable = (size) => {
    if (Object.keys(availability).length === 0) return true
    const avail = availability[size]
    return avail ? avail.available > 0 : true
  }

  // Get availability info
  const getAvailabilityInfo = (size) => {
    return availability[size] || { total: 0, booked: 0, available: 0 }
  }

  // Get available dates (next 14 days, excluding Sundays)
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

  // Get selected dumpster
  const selectedDumpster = config.dumpsters.find(d => d.id === bookingData.size)

  // Calculate surcharge total
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

  // Reset chatbot
  const resetChatbot = () => {
    setStep(STEPS.WELCOME)
    setMessages([])
    setBookingData({
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
    setAvailability({})
  }

  const value = {
    // State
    isOpen,
    setIsOpen,
    hasAutoOpened,
    setHasAutoOpened,
    step,
    setStep,
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    bookingData,
    setBookingData,
    availability,
    loadingAvailability,

    // Refs
    messagesEndRef,

    // Methods
    addBotMessage,
    addUserMessage,
    fetchAvailability,
    isSizeAvailable,
    getAvailabilityInfo,
    getAvailableDates,
    getSurchargeTotal,
    resetChatbot,

    // Computed
    selectedDumpster,
    config,
    STEPS,
  }

  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  )
}

// Hook to use chatbot context
export function useChatbot() {
  const context = useContext(ChatbotContext)
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider')
  }
  return context
}
