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
  description: `Transparent dumpster rental pricing in ${config.address.city}, IL. 20 and 30 yard dumpsters starting at $475 for 10 days. No hidden fees.`,
}

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Transparent Pricing
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            No hidden fees, no surprises. What you see is what you pay.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {config.dumpsters.map((dumpster, index) => (
              <div
                key={dumpster.id}
                className="bg-dark-900 rounded-xl border border-dark-700 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Dumpster visual */}
                <div className="h-40 bg-dark-800 flex items-center justify-center relative">
                  <Truck className="w-20 h-20 text-white/90" />
                  <div className="absolute top-4 right-4 bg-primary text-white text-sm font-bold px-3 py-1 rounded">
                    {dumpster.shortName}
                  </div>
                </div>

                <div className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {dumpster.name}
                  </h2>

                  <p className="text-dark-300 text-sm mb-6">
                    {dumpster.description}
                  </p>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="bg-primary/10 rounded-lg p-4 border border-primary-200">
                      <div className="flex justify-between items-center">
                        <span className="text-dark-200 font-medium">10-Day Rental</span>
                        <span className="text-2xl font-bold text-primary">
                          ${dumpster.pricing['10-day']}
                        </span>
                      </div>
                      <p className="text-sm text-dark-400 mt-2">Standard rental period • Extensions available</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-dark-200">
                        <span className="font-semibold">{dumpster.weightIncluded}</span> included
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-dark-200">
                        Delivery & pickup included
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-dark-200">
                        Dimensions: {dumpster.dimensions.display}
                      </span>
                    </div>
                  </div>

                  {/* Overages */}
                  <div className="bg-dark-800 rounded-lg p-4 mb-6 text-sm border border-dark-700">
                    <div className="flex justify-between mb-1">
                      <span className="text-dark-400">Extra weight</span>
                      <span className="text-dark-200">${dumpster.weightOverage}/ton</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Extension rate</span>
                      <span className="text-dark-200">${dumpster.extensionRate}/week</span>
                    </div>
                  </div>

                  <Link
                    href={`/book?size=${dumpster.id}`}
                    className="block w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              What&apos;s Included
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Delivery', description: 'We bring the dumpster right to your location' },
              { title: 'Pickup', description: 'We come back and haul it away when you\'re done' },
              { title: 'Disposal', description: 'Dump fees included up to weight limit' },
              { title: 'Placement', description: 'We\'ll put it exactly where you want it' },
            ].map((item, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-dark-300 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Surcharge & Prohibited Items */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Surcharges */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Info className="w-6 h-6 text-amber-500" />
                <h2 className="text-2xl font-bold text-white">Surcharge Items</h2>
              </div>
              <p className="text-dark-300 mb-6">
                These items can go in the dumpster but have an additional fee:
              </p>

              <div className="bg-dark-900 rounded-xl border border-dark-700 overflow-hidden">
                {config.surchargeItems.map((item, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-4 ${index !== config.surchargeItems.length - 1 ? 'border-b border-dark-700' : ''}`}
                  >
                    <span className="text-dark-200">{item.item}</span>
                    <span className="text-amber-600 font-semibold">
                      {item.fee ? `$${item.fee} ${item.unit}` : item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prohibited */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-bold text-white">Prohibited Items</h2>
              </div>
              <p className="text-dark-300 mb-6">
                These items cannot go in the dumpster (Illinois law):
              </p>

              <div className="bg-dark-900 rounded-xl border border-dark-700 p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {config.prohibitedItems.slice(0, 10).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-dark-200"
                    >
                      <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                      {item.item}
                    </div>
                  ))}
                </div>

                <Link
                  href="/faq#prohibited"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary-700 font-medium mt-4"
                >
                  See full list
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Common Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: 'How long can I keep the dumpster?',
                a: 'Our standard rental is 10 days. Need more time? No problem — extensions are available at a weekly rate.'
              },
              {
                q: 'What if I go over the weight limit?',
                a: 'We\'ll weigh the dumpster at the dump. If you\'re over, we\'ll just charge the overage rate per ton. No surprise fees — we\'ll let you know.'
              },
              {
                q: 'Can I put concrete or dirt in the dumpster?',
                a: 'Yes, but heavy materials like concrete, brick, and dirt require special pricing since they\'re so heavy. Give us a call for a quote on heavy debris.'
              },
            ].map((item, index) => (
              <div key={index} className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-dark-300">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/faq" className="inline-flex items-center gap-2 text-primary hover:text-primary-700 font-semibold">
              View All FAQs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Book?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Book online in minutes, or give us a call to talk to a real person.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Book Online
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`tel:${config.phoneRaw}`}
              className="inline-flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold py-4 px-8 rounded-lg transition-colors border border-primary-500"
            >
              <Phone className="w-5 h-5" />
              {config.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
