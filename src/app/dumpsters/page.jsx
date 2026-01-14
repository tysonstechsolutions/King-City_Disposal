import Link from 'next/link'
import { config } from '../../config'
import {
  Truck,
  Check,
  ArrowRight,
  Phone,
  Package,
  Scale
} from 'lucide-react'

export const metadata = {
  title: `Dumpster Sizes - 20 & 30 Yard Roll-Off Dumpsters | ${config.businessName}`,
  description: `Compare dumpster sizes for your project. 20 and 30 yard roll-off dumpsters available for delivery in ${config.address.city}, IL and surrounding areas.`,
}

export default function DumpstersPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-neutral-900 text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Dumpster Sizes
            </h1>
            <p className="text-xl text-neutral-300">
              Not sure which size you need? We&apos;ll help you figure it out.
              When in doubt, go up a size — it&apos;s better to have extra room.
            </p>
          </div>
        </div>
      </section>

      {/* Size Guide */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="grid gap-8 max-w-5xl mx-auto">
            {config.dumpsters.map((dumpster) => (
              <div
                key={dumpster.id}
                id={dumpster.id}
                className="bg-dark-900 rounded-xl border border-dark-700 overflow-hidden scroll-mt-24 hover:shadow-lg transition-shadow"
              >
                <div className="grid lg:grid-cols-2">
                  {/* Image/Visual */}
                  <div className="bg-dark-800 p-8 lg:p-12 flex items-center justify-center relative">
                    <div className="text-center">
                      <Truck className="w-32 h-32 text-neutral-300 mx-auto mb-4" />
                      <div className="inline-block bg-primary text-white px-4 py-2 rounded-full font-bold">
                        {dumpster.id.replace('yd', ' Yard')}
                      </div>
                    </div>
                    {/* Dimension overlay */}
                    <div className="absolute bottom-4 left-4 right-4 bg-dark-900/90 backdrop-blur-sm rounded-lg p-3 text-center border border-dark-700">
                      <p className="text-white text-sm">
                        <span className="text-dark-400">Dimensions:</span>{' '}
                        <span className="font-medium">{dumpster.dimensions.display}</span>
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-8 lg:p-12">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {dumpster.name}
                    </h2>
                    <p className="text-dark-300 mb-6">{dumpster.description}</p>

                    {/* Quick specs */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                        <div className="flex items-center gap-2 text-dark-400 text-sm mb-1">
                          <Package className="w-4 h-4" />
                          Capacity
                        </div>
                        <p className="text-white font-semibold">{dumpster.capacity}</p>
                      </div>
                      <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
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
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            {use}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pricing */}
                    <div className="bg-primary/10 rounded-xl p-6 mb-6 border border-primary-200">
                      <div className="text-center mb-4">
                        <p className="text-dark-300 text-sm">10-Day Rental</p>
                        <p className="text-4xl font-bold text-primary">${dumpster.pricing['10-day']}</p>
                        <p className="text-sm text-dark-400 mt-1">Standard rental period</p>
                      </div>
                      <div className="border-t border-dark-700 pt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-dark-400">Extra weight:</span>{' '}
                          <span className="text-dark-200">${dumpster.weightOverage}/ton</span>
                        </div>
                        <div>
                          <span className="text-dark-400">Extension:</span>{' '}
                          <span className="text-dark-200">${dumpster.extensionRate}/week</span>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/book?size=${dumpster.id}`}
                      className="block w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                      Book This Dumpster
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Size Comparison Table */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Quick Comparison
          </h2>

          <div className="overflow-x-auto max-w-4xl mx-auto">
            <table className="w-full min-w-[600px] bg-dark-900 rounded-xl border border-dark-700 overflow-hidden">
              <thead>
                <tr className="bg-dark-800 border-b border-dark-700">
                  <th className="text-left py-4 px-6 text-dark-300 font-medium">Feature</th>
                  {config.dumpsters.map((d) => (
                    <th key={d.id} className="text-center py-4 px-6 text-white font-semibold">
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-4 px-6 text-dark-300">Dimensions</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-6 text-center text-white">
                      {d.dimensions.display}
                    </td>
                  ))}
                </tr>
                <tr className="bg-dark-800">
                  <td className="py-4 px-6 text-dark-300">Capacity</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-6 text-center text-white">
                      {d.capacity}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-6 text-dark-300">Weight Included</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-6 text-center text-white">
                      {d.weightIncluded}
                    </td>
                  ))}
                </tr>
                <tr className="bg-dark-800">
                  <td className="py-4 px-6 text-dark-300">10-Day Rental</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-6 text-center text-primary font-bold">
                      ${d.pricing['10-day']}
                    </td>
                  ))}
                </tr>
                <tr className="bg-dark-800">
                  <td className="py-4 px-6 text-dark-300">Wheelbarrow Loads</td>
                  {config.dumpsters.map((d) => (
                    <td key={d.id} className="py-4 px-6 text-center text-white">
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
      <section className="section bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Not Sure Which Size?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Tell us about your project and we&apos;ll recommend the right dumpster.
            We&apos;d rather you have too much space than not enough!
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Get a Recommendation
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
