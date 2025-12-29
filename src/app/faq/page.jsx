'use client'

import { useState } from 'react'
import Link from 'next/link'
import { config } from '../../config'
import { 
  ChevronDown, 
  AlertTriangle, 
  Phone, 
  HelpCircle,
  DollarSign,
  Truck,
  Clock,
  Scale,
  Ban
} from 'lucide-react'

// FAQ data organized by category
const faqCategories = [
  {
    name: 'Pricing & Payment',
    icon: DollarSign,
    questions: [
      {
        q: 'What does the rental price include?',
        a: 'Your rental price includes delivery, pickup, and disposal fees up to your included weight limit. There are no hidden fees — what you see is what you pay (unless you exceed the weight limit).'
      },
      {
        q: 'What if I go over the weight limit?',
        a: `We'll weigh the dumpster at the dump. If you're over your included tonnage, we'll charge the overage rate per ton. For example, if you have a 14-yard dumpster (2 tons included) and you go 1 ton over, that's an additional $100. We'll always let you know before charging.`
      },
      {
        q: 'Do you require a deposit?',
        a: 'We collect payment when you book. No separate deposit required. If you need to cancel, just give us 24 hours notice and we\'ll refund you in full.'
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards, debit cards, and cash. Payment is due at the time of booking for card payments, or upon delivery for cash.'
      },
    ]
  },
  {
    name: 'Rental Duration',
    icon: Clock,
    questions: [
      {
        q: 'How long can I keep the dumpster?',
        a: 'Our standard rental periods are 3 days or 7 days. Need more time? No problem — you can extend your rental at a daily rate ($15-25/day depending on size).'
      },
      {
        q: 'What if I fill it up before my rental period ends?',
        a: 'Just give us a call and we\'ll come pick it up early! We\'re happy to accommodate your schedule. You won\'t get a refund for unused days, but you won\'t be charged extra either.'
      },
      {
        q: 'Can I extend my rental?',
        a: 'Absolutely! Just call or text us before your rental period ends. Extensions are charged at a daily rate — check the pricing page for current rates.'
      },
    ]
  },
  {
    name: 'Delivery & Pickup',
    icon: Truck,
    questions: [
      {
        q: 'How quickly can you deliver?',
        a: 'We offer same-day delivery for orders placed before noon (subject to availability). Next-day delivery is almost always available. Need it ASAP? Give us a call and we\'ll do our best to accommodate.'
      },
      {
        q: 'Where can you place the dumpster?',
        a: 'We can place dumpsters in driveways, on the street (permit may be required), or on your property. When you book, you\'ll drop a pin on a map to show us exactly where you want it.'
      },
      {
        q: 'Do I need to be home for delivery?',
        a: 'Nope! As long as you\'ve shown us where to place it, we can drop it off without you there. We\'ll send you a text when it\'s delivered.'
      },
      {
        q: 'What if my dumpster gets full before pickup?',
        a: 'Call us! We can usually do a swap (pick up the full one, drop off an empty one) or schedule an early pickup. Additional fees may apply for swap-outs.'
      },
    ]
  },
  {
    name: 'Sizing & Weight',
    icon: Scale,
    questions: [
      {
        q: 'How do I know what size dumpster I need?',
        a: `Here's a quick guide:\n\n• 14 Yard: Garage cleanout, small bathroom remodel, 1-2 room estate cleanout\n• 20 Yard: Kitchen remodel, flooring removal, roofing (up to 25 squares), full house cleanout\n• 30 Yard: Major renovation, new construction, commercial cleanout\n\nWhen in doubt, go up a size — it's better to have extra space than not enough.`
      },
      {
        q: 'How heavy can I load the dumpster?',
        a: 'Each dumpster has an included weight allowance — 2 tons for 14-yard, 3 tons for 20-yard, and 4 tons for 30-yard. You can go over, but you\'ll pay an overage fee per ton.'
      },
      {
        q: 'Can I put heavy materials like concrete in?',
        a: 'Yes, but heavy materials (concrete, brick, dirt, rocks) are VERY heavy and can quickly exceed your weight limit. For heavy debris jobs, give us a call — we may recommend a smaller, "heavy load" dumpster or provide a custom quote.'
      },
    ]
  },
]

export default function FAQPage() {
  const [openItems, setOpenItems] = useState({})

  const toggleItem = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <>
      {/* Hero */}
      <section className="section bg-dark-800 pt-32">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl md:text-6xl text-white mb-4">
              FREQUENTLY ASKED <span className="text-gradient">QUESTIONS</span>
            </h1>
            <p className="text-xl text-dark-300">
              Got questions? We&apos;ve got answers. If you don&apos;t see what you&apos;re 
              looking for, give us a call.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="section">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto space-y-12">
            {faqCategories.map((category, categoryIndex) => (
              <div key={category.name}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                    <category.icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <h2 className="font-display text-2xl text-white">{category.name}</h2>
                </div>

                <div className="space-y-2">
                  {category.questions.map((item, questionIndex) => {
                    const isOpen = openItems[`${categoryIndex}-${questionIndex}`]
                    return (
                      <div 
                        key={questionIndex}
                        className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden"
                      >
                        <button
                          onClick={() => toggleItem(categoryIndex, questionIndex)}
                          className="faq-question px-6 w-full"
                        >
                          <span className="text-left">{item.q}</span>
                          <ChevronDown 
                            className={`w-5 h-5 text-dark-400 transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-6">
                            <p className="text-dark-300 whitespace-pre-line leading-relaxed">
                              {item.a}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prohibited Items Section */}
      <section id="prohibited" className="section bg-dark-800">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Ban className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="font-display text-3xl text-white">PROHIBITED ITEMS</h2>
                <p className="text-dark-400">Items that CANNOT go in the dumpster</p>
              </div>
            </div>

            <div className="bg-dark-700/50 rounded-2xl border border-red-500/20 p-6 md:p-8 mb-8">
              <div className="flex items-start gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold mb-2">Illinois Law & Landfill Regulations</p>
                  <p className="text-dark-300 text-sm">
                    The following items are banned from Illinois landfills by state law. 
                    Putting these items in your dumpster may result in additional fees, 
                    load rejection, or the dumpster being returned to you.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {config.prohibitedItems.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 bg-dark-800/50 rounded-lg p-4"
                  >
                    <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm font-medium">{item.item}</p>
                      <p className="text-dark-500 text-xs">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Surcharge Items */}
            <div className="bg-dark-700/50 rounded-2xl border border-accent-500/20 p-6 md:p-8">
              <div className="flex items-start gap-3 mb-6">
                <DollarSign className="w-6 h-6 text-accent-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold mb-2">Surcharge Items</p>
                  <p className="text-dark-300 text-sm">
                    These items CAN go in the dumpster but have an additional fee due to 
                    special handling at the landfill.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {config.surchargeItems.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-dark-800/50 rounded-lg p-4"
                  >
                    <span className="text-white">{item.item}</span>
                    <span className="text-accent-400 font-semibold">
                      {item.fee ? `$${item.fee} ${item.unit}` : item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-dark-400 mt-6">
              Not sure if something is allowed? Give us a call at{' '}
              <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline">
                {config.phone}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="section">
        <div className="container-custom">
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-3xl p-8 md:p-12 text-center">
            <HelpCircle className="w-16 h-16 text-white/80 mx-auto mb-4" />
            <h2 className="font-display text-4xl text-white mb-4">
              STILL HAVE QUESTIONS?
            </h2>
            <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
              We&apos;re here to help! Give us a call and talk to a real person — 
              no phone trees, no robots.
            </p>

            <a 
              href={`tel:${config.phoneRaw}`}
              className="bg-white text-primary-600 font-bold py-4 px-8 rounded-lg hover:bg-primary-50 transition-colors inline-flex items-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Call {config.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
