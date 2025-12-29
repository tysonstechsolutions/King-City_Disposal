import Link from 'next/link'
import { config } from '../../config'
import { 
  Truck, 
  Check, 
  AlertTriangle,
  Phone,
  ArrowRight,
  Info
} from 'lucide-react'

export const metadata = {
  title: `Dumpster Rental Pricing | ${config.businessName}`,
  description: `Transparent dumpster rental pricing in ${config.address.city}, IL. 14, 20, and 30 yard dumpsters starting at $350. No hidden fees.`,
}

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="section bg-dark-800 pt-32">
        <div className="container-custom text-center">
          <h1 className="font-display text-5xl md:text-6xl text-white mb-4">
            TRANSPARENT <span className="text-gradient">PRICING</span>
          </h1>
          <p className="text-xl text-dark-300 max-w-2xl mx-auto">
            No hidden fees, no surprises. What you see is what you pay.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="section">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-8">
            {config.dumpsters.map((dumpster, index) => (
              <div 
                key={dumpster.id}
                className={`card relative ${index === 1 ? 'border-primary-500 md:-translate-y-4' : ''}`}
              >
                {/* Popular badge for middle option */}
                {index === 1 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Dumpster visual */}
                <div className="h-32 bg-dark-700 rounded-xl mb-6 flex items-center justify-center">
                  <Truck className="w-16 h-16 text-dark-500" />
                </div>

                <h2 className="font-display text-3xl text-white mb-2">
                  {dumpster.name.toUpperCase()}
                </h2>
                
                <p className="text-dark-400 text-sm mb-6">
                  {dumpster.description}
                </p>

                {/* Pricing table */}
                <div className="space-y-3 mb-6">
                  <div className="bg-dark-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-dark-300">3-Day Rental</span>
                      <span className="text-3xl font-bold text-white">
                        ${dumpster.pricing['3-day']}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-dark-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-dark-300">7-Day Rental</span>
                      <span className="text-3xl font-bold text-white">
                        ${dumpster.pricing['7-day']}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary-500" />
                    <span className="text-dark-300">
                      <span className="text-white font-semibold">{dumpster.weightIncluded}</span> included
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary-500" />
                    <span className="text-dark-300">
                      Delivery & pickup included
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary-500" />
                    <span className="text-dark-300">
                      Dimensions: {dumpster.dimensions.length} × {dumpster.dimensions.width} × {dumpster.dimensions.height}
                    </span>
                  </div>
                </div>

                {/* Overages */}
                <div className="bg-dark-700/50 rounded-lg p-4 mb-6 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-dark-400">Extra weight</span>
                    <span className="text-dark-300">${dumpster.weightOverage}/ton</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Extra days</span>
                    <span className="text-dark-300">${dumpster.dailyExtension}/day</span>
                  </div>
                </div>

                <button 
                  className={`w-full py-4 rounded-lg font-bold transition-all ${
                    index === 1 
                      ? 'bg-primary-500 hover:bg-primary-600 text-white' 
                      : 'bg-dark-700 hover:bg-dark-600 text-white border border-dark-600'
                  }`}
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl text-white mb-4">
              WHAT&apos;S <span className="text-gradient">INCLUDED</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Delivery', description: 'We bring the dumpster right to your location' },
              { title: 'Pickup', description: 'We come back and haul it away when you\'re done' },
              { title: 'Disposal', description: 'Dump fees included up to weight limit' },
              { title: 'Placement', description: 'We\'ll put it exactly where you want it' },
            ].map((item, index) => (
              <div key={index} className="bg-dark-700/50 rounded-xl p-6 text-center">
                <Check className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-dark-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Surcharge Items */}
      <section className="section">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Surcharges */}
            <div>
              <h2 className="font-display text-3xl text-white mb-6 flex items-center gap-3">
                <Info className="w-8 h-8 text-accent-400" />
                SURCHARGE ITEMS
              </h2>
              <p className="text-dark-300 mb-6">
                These items can go in the dumpster but have an additional fee:
              </p>
              
              <div className="space-y-3">
                {config.surchargeItems.map((item, index) => (
                  <div 
                    key={index}
                    className="flex justify-between items-center bg-dark-800 rounded-lg p-4"
                  >
                    <span className="text-white">{item.item}</span>
                    <span className="text-accent-400 font-semibold">
                      {item.fee ? `$${item.fee} ${item.unit}` : item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prohibited */}
            <div>
              <h2 className="font-display text-3xl text-white mb-6 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                PROHIBITED ITEMS
              </h2>
              <p className="text-dark-300 mb-6">
                These items CANNOT go in the dumpster (Illinois law):
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {config.prohibitedItems.slice(0, 10).map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 text-sm text-dark-300"
                  >
                    <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                    {item.item}
                  </div>
                ))}
              </div>
              
              <Link 
                href="/faq#prohibited"
                className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 mt-4"
              >
                See full list
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl text-white mb-4">
              COMMON <span className="text-gradient">QUESTIONS</span>
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: 'How long can I keep the dumpster?',
                a: 'Our standard rentals are 3 or 7 days. Need more time? No problem — extra days are available at a daily rate.'
              },
              {
                q: 'What if I go over the weight limit?',
                a: 'We\'ll weigh the dumpster at the dump. If you\'re over, we\'ll just charge the overage rate per ton. No surprise fees — we\'ll let you know.'
              },
              {
                q: 'Can I put concrete or dirt in the dumpster?',
                a: 'Yes, but heavy materials like concrete, brick, and dirt require special pricing since they\'re so heavy. Give us a call for a quote on heavy debris.'
              },
              {
                q: 'Do you deliver on weekends?',
                a: `Yes! We deliver Monday-Friday ${config.hours.monday} and Saturday ${config.hours.saturday}.`
              },
            ].map((item, index) => (
              <div key={index} className="bg-dark-700/50 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-dark-300">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/faq" className="btn-secondary inline-flex items-center gap-2">
              View All FAQs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-custom">
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="font-display text-4xl text-white mb-4">
              READY TO BOOK?
            </h2>
            <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
              Use our chatbot for instant booking, or give us a call to talk to a real person.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-white text-primary-600 font-bold py-4 px-8 rounded-lg hover:bg-primary-50 transition-colors">
                Open Booking Chat
              </button>
              <a 
                href={`tel:${config.phoneRaw}`}
                className="bg-primary-700 text-white font-bold py-4 px-8 rounded-lg hover:bg-primary-800 transition-colors flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                {config.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
