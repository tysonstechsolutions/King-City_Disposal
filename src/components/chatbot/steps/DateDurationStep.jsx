'use client'

import { Calendar, ArrowRight, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useChatbot } from '../ChatbotContext'

export default function DateDurationStep() {
  const {
    isTyping,
    step,
    bookingData,
    selectedDumpster,
    loadingAvailability,
    STEPS,
    setBookingData,
    addUserMessage,
    addBotMessage,
    setStep,
    fetchAvailability,
    isSizeAvailable,
    getAvailabilityInfo,
    getAvailableDates,
  } = useChatbot()

  const handleDateDuration = async (date, duration) => {
    setBookingData(prev => ({ ...prev, deliveryDate: date, duration }))
    const dumpster = selectedDumpster
    const price = dumpster?.pricing[duration]

    addUserMessage(`${date}, 10 days`)

    await addBotMessage(`That'll be $${price} for the 10-day rental.\n\nLast step - what's your name and phone number?`, 600)
    setStep(STEPS.CONTACT)
  }

  if (isTyping || step !== STEPS.DATE_DURATION) {
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-dark-400 text-sm mb-2">Pick a delivery date:</p>
        <div className="grid grid-cols-3 gap-2">
          {getAvailableDates().map((date) => (
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
              className={`rounded-xl p-3 text-center transition-colors ${
                bookingData.deliveryDateRaw === date.value
                  ? 'bg-primary/20 border-2 border-primary-500'
                  : 'bg-dark-700 hover:bg-dark-600 border-2 border-transparent'
              }`}
            >
              <Calendar className={`w-4 h-4 mx-auto mb-1 ${bookingData.deliveryDateRaw === date.value ? 'text-primary-400' : 'text-dark-400'}`} />
              <p className="text-xs text-white font-medium">{date.label}</p>
            </button>
          ))}
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

      <div>
        <p className="text-dark-400 text-sm mb-2">Rental period</p>
        <div className="bg-primary/20 border-2 border-primary-500 rounded-xl p-4 text-center">
          <p className="font-bold text-white text-lg">10 Days</p>
          <p className="text-primary-400 font-semibold">${selectedDumpster?.pricing['10-day']}</p>
          <p className="text-dark-400 text-xs mt-1">Standard rental - Extensions available</p>
        </div>
      </div>

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
  )
}
