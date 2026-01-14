'use client'

import { Truck, Check } from 'lucide-react'
import { useChatbot } from '../ChatbotContext'

export default function SizeConfirmStep() {
  const {
    isTyping,
    step,
    bookingData,
    config,
    STEPS,
    setBookingData,
    addUserMessage,
    addBotMessage,
    setStep,
  } = useChatbot()

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

  if (isTyping || step !== STEPS.SIZE_CONFIRM) {
    return null
  }

  return (
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
  )
}
