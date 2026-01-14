import Link from 'next/link'
import { config } from '../../config'
import { MapPin, Phone, CheckCircle2, ArrowRight } from 'lucide-react'

export const metadata = {
  title: `Service Area - Dumpster Rental in Southern Illinois | ${config.businessName}`,
  description: `${config.businessName} delivers dumpsters to ${config.serviceTowns.slice(0, 10).join(', ')} and more. Serving a ${config.serviceRadius}-mile radius from ${config.address.city}, IL.`,
}

export default function ServiceAreaPage() {
  // Group towns by first letter for easy scanning
  const groupedTowns = config.serviceTowns.reduce((acc, town) => {
    const letter = town[0].toUpperCase()
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(town)
    return acc
  }, {})

  return (
    <>
      {/* Hero */}
      <section className="bg-neutral-900 text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Service Area
            </h1>
            <p className="text-xl text-neutral-300">
              We deliver dumpsters throughout Southern Illinois. If you&apos;re within{' '}
              {config.serviceRadius} miles of {config.address.city}, we&apos;ve got you covered.
            </p>
          </div>
        </div>
      </section>

      {/* Map placeholder + service radius */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Map */}
            <div className="bg-dark-900 rounded-xl p-8 h-96 flex items-center justify-center border border-dark-700">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-dark-400">Interactive map coming soon</p>
                <p className="text-dark-500 text-sm">
                  {config.serviceRadius}-mile radius from {config.address.city}, IL
                </p>
              </div>
            </div>

            {/* Info */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Delivering to Your Door
              </h2>
              <p className="text-dark-300 mb-6">
                Based in {config.address.city}, Illinois, we serve homeowners, contractors,
                and businesses throughout the region. Same-day and next-day delivery
                available for most locations.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Same-Day Delivery</p>
                    <p className="text-dark-400 text-sm">
                      Order before noon for same-day delivery (availability varies)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">No Mileage Fees</p>
                    <p className="text-dark-400 text-sm">
                      Delivery is included in your rental price — no extra charges
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Flexible Placement</p>
                    <p className="text-dark-400 text-sm">
                      Driveway, street, job site — we&apos;ll put it where you need it
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/10 rounded-xl p-6 border border-primary-200">
                <p className="text-dark-200 mb-4">
                  Not sure if we deliver to your area?
                </p>
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Call {config.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Towns List */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Towns We Serve
            </h2>
            <p className="text-dark-300 max-w-2xl mx-auto">
              From small towns to bigger cities, we deliver dumpsters across Southern Illinois.
              Don&apos;t see your town? Give us a call — we probably cover it!
            </p>
          </div>

          {/* Alphabetical town grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {Object.entries(groupedTowns).sort().map(([letter, towns]) => (
              <div key={letter}>
                <h3 className="text-2xl font-bold text-primary mb-3 border-b border-dark-700 pb-2">
                  {letter}
                </h3>
                <ul className="space-y-1">
                  {towns.sort().map((town) => (
                    <li key={town} className="text-dark-300 hover:text-white transition-colors">
                      {town}, IL
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-dark-400 mb-4">
              Live outside these areas? We may still be able to help!
            </p>
            <a
              href={`tel:${config.phoneRaw}`}
              className="text-primary hover:text-primary-700 font-semibold"
            >
              Call {config.phone} to check availability
            </a>
          </div>
        </div>
      </section>

      {/* Service-specific pages for SEO */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Dumpster Rental by City
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {config.serviceTowns.slice(0, 12).map((town) => (
              <div
                key={town}
                className="bg-dark-900 rounded-xl p-6 border border-dark-700 hover:border-primary-300 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-white mb-2">
                  Dumpster Rental in {town}, IL
                </h3>
                <p className="text-dark-400 text-sm mb-4">
                  Fast, affordable dumpster rentals delivered to {town} and surrounding areas.
                </p>
                <Link
                  href="/book"
                  className="text-primary hover:text-primary-700 text-sm inline-flex items-center gap-1 font-medium"
                >
                  Get pricing
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get a Dumpster?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Enter your address in our booking tool to confirm we deliver to your location
            and get an instant quote.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Get Your Quote
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
