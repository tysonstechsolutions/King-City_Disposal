'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function FAQAccordion({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-dark-700/50 transition-colors"
      >
        <h3 className="font-semibold text-white pr-4">{question}</h3>
        <ChevronDown 
          className={`w-5 h-5 text-primary-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      {isOpen && (
        <div className="px-6 pb-6">
          <p className="text-dark-300 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}
