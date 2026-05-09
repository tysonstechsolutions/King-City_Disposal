'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function FAQAccordion({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-neutral-50 transition-colors"
        aria-expanded={isOpen}
      >
        {/* faq-question class is referenced by SpeakableSpecification in
            FAQ schema — keep it on the visible question element so Google
            Assistant can read it aloud for voice queries. */}
        <h3 className="faq-question font-semibold text-neutral-900 pr-4">{question}</h3>
        <ChevronDown
          className={`w-5 h-5 text-primary-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-neutral-100">
          {/* faq-answer matches the speakable selector */}
          <p className="faq-answer text-neutral-600 leading-relaxed pt-4">{answer}</p>
        </div>
      )}
    </div>
  )
}
