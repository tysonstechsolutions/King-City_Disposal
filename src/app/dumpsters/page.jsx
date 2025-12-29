import Link from 'next/link'
import { config } from '../../config'
import { 
  Truck, 
  Check, 
  ArrowRight,
  Phone,
  Ruler,
  Scale,
  Clock,
  Package
} from 'lucide-react'

export const metadata = {
  title: `Dumpster Sizes - 20 & 30 Yard Roll-Off Dumpsters | ${config.businessName}`,
  description: `Compare dumpster sizes for your project. 20 and 30 yard roll-off dumpsters available for delivery in ${config.address.city}, IL and surrounding areas.`,
}

export default function DumpstersPage() {
  return (
    <>
      {/* Hero */}
      <section className="section bg-dark-800 pt-32">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl md:text-6xl text-white mb-4">
              DUMPSTER <span className="text-gradient">SIZES</span>
            </h1>
            <p className="text-xl text-dark-300">
              Not sure which size you need? We&apos;ll help you figure it out. 
              When in doubt, go up a size — it&apos;s better to have extra room.
            </p>
          </div>
        </div>
      </section>

      {/* Size Guide */}
      <section className="section">
        <div className="container-custom">
          <div className="grid gap-8">
            {config.dumpsters.map((dumpster, index) => (
              <div 
                key={dumpster.id}
                id={dumpster.id}
                className="bg-dark-800 rounded-3xl border border-dark-700 overflow-hidden scroll-mt-24"
              >
                <div className="grid lg:grid-cols-2">
                  {/* Image/Visual */}
                  <div className="bg-dark-700 p-8 lg:p-12 flex items-center justify-center relative">
                    <div className="text-center">
                      <Truck className="w-32 h-32 text-dark-500 mx-auto mb-4" />
                      <div className="inline-block bg-primary-500 text-white px-4 py-2 rounded-full font-bold">
                        {dumpster.id.replace('yd', ' Yard')}
                      </div>
                    </div>
                    {/* Dimension overlay */}
                    <div className="absolute bottom-4 left-4 right-4 bg-dark-800/80 backdrop-blur-sm rounded-lg p-3 text-center">
                      <p className="text-white text-sm">
                        <span className="text-dark-400">Dimensions:</span>{' '}
                        {dumpster.dimensions.display}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-8 lg:p-12">
                    <h2 className="font-display text-3xl text-white mb-2">
                      {dumpster.name.toUpperCase()}
                    </h2>
                    <p className="text-dark-300 mb-6">{dumpster.description}</p>

                    {/* Quick specs */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-dark-700/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-dark-400 text-sm mb-1">
                          <Package className="w-4 h-4" />
                          Capacity
                        </div>
                        <p className="text-white font-semibold">{dumpster.capacity}</p>
                      </div>
                      <div className="bg-dark-700/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-dark-400 text-sm mb-1">
                          <Scale className="w-4 h-4" />
                          Weight Included
                        </div>
                        <p className="text-white font-semibold">{dumpster.weightIncluded}</p>
                      </div>
                    </div>

                    {/* Best for */}
                    <div className="mb-6">
                      <h3 className="text-white font-semibold mb-3">Best For:</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dumpster.bestFor.map((use, i) => (
                          <li key={i} className="flex items-center gap-2 text-dark-300 text-sm">
                            <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />
                            {use}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pricing */}
                    <div className="bg-dark-700/50 rounded-xl p-6 mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <p className="text-dark-400 text-sm">3-Day Rental</p>
                          <p className="text-3xl font-bold text-white">${dumpster.pricing['3-day']}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-dark-400 text-sm">7-Day Rental</p>
                          <p className="text-3xl font-bold text-white">${dumpster.pricing['7-day']}</p>
                        </div>
                      </div>
                      <div className="border-t border-dark-600 pt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-dark-400">Extra weight:</span>{' '}
                          <span className="text-white">${dumpster.weightOverage}/ton</span>
                        </div>
                        <div>
                          <span className="text-dark-400">Extra days:</span>{' '}
                          <span className="text-white">${dumpster.dailyExtension}/day</span>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link 
                      href="/pricing"
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      Book This Dumpster
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Size Comparison Table */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <h2 className="font-display text-4xl text-white mb-8 text-center">
            QUICK <span className="text-gradient">COMPARISON</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-4 px-4 text-dark-400 font-medium">Feature</th>
                  {config.dumpsters.map((d) => (
                    <th key={d.id} className="text-center py-4 px-4 text-white font-semibold">
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                <tr>
                  <td className="py-4 px-4 text-dark-300">Dimensions</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-4 text-center text-white">
                      {d.dimensions.display}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-dark-300">Capacity</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-4 text-center text-white">
                      {d.capacity}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-dark-300">Weight Included</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-4 text-center text-white">
                      {d.weightIncluded}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-dark-300">3-Day Price</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-4 text-center text-primary-400 font-bold">
                      ${d.pricing['3-day']}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-dark-300">7-Day Price</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-4 text-center text-primary-400 font-bold">
                      ${d.pricing['7-day']}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-dark-300">Wheelbarrow Loads</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-4 text-center text-white">
                      {d.wheelbarrowLoads}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Not sure section */}
      <section className="section">
        <div className="container-custom">
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="font-display text-4xl text-white mb-4">
              NOT SURE WHICH SIZE?
            </h2>
            <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
              Tell us about your project and we&apos;ll recommend the right dumpster. 
              We&apos;d rather you have too much space than not enough!
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="bg-white text-primary-600 font-bold py-4 px-8 rounded-lg hover:bg-primary-50 transition-colors">
                Get a Recommendation
              </Link>
              <a 
                href={`tel:${config.phoneRaw}`}
                className="bg-primary-700 text-white font-bold py-4 px-8 rounded-lg hover:bg-primary-800 transition-colors flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Call {config.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
