import Link from 'next/link'
import { config } from '../config'
import { 
  Truck, 
  Clock, 
  Shield, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  ArrowRight,
  Star,
  Zap,
  Calendar
} from 'lucide-react'

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero-pattern min-h-[90vh] flex items-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        
        <div className="container-custom relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="animate-fade-in">
              {/* Trust badge */}
              <div className="trust-badge mb-6 inline-flex">
                <Star className="w-4 h-4 text-accent-400 fill-accent-400" />
                <span className="text-dark-200">Locally Owned & Operated</span>
              </div>
              
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
                DUMPSTER{' '}
                <span className="text-gradient">RENTALS</span>{' '}
                MADE EASY
              </h1>
              
              <p className="text-xl text-dark-300 mb-8 leading-relaxed max-w-xl">
                Need a dumpster? Get instant pricing, book online in 60 seconds, 
                and we&apos;ll deliver it to your driveway. Serving {config.address.city} 
                and all of Southern Illinois.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mb-8">
                <Link href="/book" className="btn-accent flex items-center gap-2 text-lg">
                  <Zap className="w-5 h-5" />
                  Get Instant Quote
                </Link>
                <a href={`tel:${config.phoneRaw}`} className="btn-secondary flex items-center gap-2 text-lg">
                  <Phone className="w-5 h-5" />
                  {config.phone}
                </a>
              </div>

              {/* Quick trust points */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-dark-300">
                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                  <span>Same-Day Delivery</span>
                </div>
                <div className="flex items-center gap-2 text-dark-300">
                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                  <span>Transparent Pricing</span>
                </div>
                <div className="flex items-center gap-2 text-dark-300">
                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                  <span>No Hidden Fees</span>
                </div>
              </div>
            </div>

            {/* Right Content - Quick Price Preview */}
            <div className="animate-slide-up delay-200">
              <div className="bg-dark-800/80 backdrop-blur-sm rounded-3xl border border-dark-700 p-8 shadow-2xl">
                <h2 className="font-display text-2xl text-white mb-6">QUICK PRICING</h2>
                
                <div className="space-y-4">
                  {config.dumpsters.map((dumpster, index) => (
                    <div 
                      key={dumpster.id}
                      className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl hover:bg-dark-700 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                          <Truck className="w-6 h-6 text-primary-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{dumpster.name}</p>
                          <p className="text-sm text-dark-400">{dumpster.weightIncluded} included</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-400">
                          ${dumpster.pricing['3-day']}
                        </p>
                        <p className="text-xs text-dark-400">3-day rental</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link 
                  href="/pricing"
                  className="mt-6 w-full btn-primary flex items-center justify-center gap-2"
                >
                  See Full Pricing
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
              HOW IT <span className="text-gradient">WORKS</span>
            </h2>
            <p className="text-dark-300 text-lg max-w-2xl mx-auto">
              Getting a dumpster has never been easier. Book online in minutes, 
              we handle the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Calendar,
                title: 'Pick Your Size & Date',
                description: 'Choose from 14, 20, or 30 yard dumpsters. Select your delivery date and rental period.'
              },
              {
                step: '02',
                icon: MapPin,
                title: 'Show Us Where',
                description: 'Drop a pin on the map to show us exactly where you want the dumpster placed.'
              },
              {
                step: '03',
                icon: Truck,
                title: 'We Deliver & Pick Up',
                description: 'We drop it off, you fill it up, we haul it away. Simple as that.'
              }
            ].map((item, index) => (
              <div 
                key={item.step}
                className="card text-center group animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-6xl font-display text-dark-700 group-hover:text-primary-500/30 transition-colors mb-4">
                  {item.step}
                </div>
                <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-500/30 transition-colors">
                  <item.icon className="w-8 h-8 text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-dark-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dumpster Sizes Preview */}
      <section className="section">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
              CHOOSE YOUR <span className="text-gradient">SIZE</span>
            </h2>
            <p className="text-dark-300 text-lg max-w-2xl mx-auto">
              From small garage cleanouts to major construction projects, 
              we&apos;ve got the right dumpster for your job.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {config.dumpsters.map((dumpster, index) => (
              <div 
                key={dumpster.id}
                className="card dumpster-card group animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Placeholder for dumpster image */}
                <div className="h-48 bg-dark-700 rounded-xl mb-6 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-800 to-transparent z-10" />
                  <Truck className="w-24 h-24 text-dark-600" />
                  <div className="absolute top-4 right-4 z-20">
                    <span className="bg-primary-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                      {dumpster.id.replace('yd', ' Yard')}
                    </span>
                  </div>
                </div>

                <h3 className="text-2xl font-semibold text-white mb-2">{dumpster.name}</h3>
                <p className="text-dark-400 mb-4">{dumpster.description}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Dimensions</span>
                    <span className="text-white">{dumpster.dimensions.length} × {dumpster.dimensions.width} × {dumpster.dimensions.height}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Weight Included</span>
                    <span className="text-white">{dumpster.weightIncluded}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Starting At</span>
                    <span className="text-primary-400 font-bold text-lg">${dumpster.pricing['3-day']}</span>
                  </div>
                </div>

                <Link 
                  href={`/dumpsters#${dumpster.id}`}
                  className="w-full btn-secondary flex items-center justify-center gap-2 group-hover:bg-primary-500 group-hover:border-primary-500 transition-all"
                >
                  Learn More
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl md:text-5xl text-white mb-6">
                WHY CHOOSE{' '}
                <span className="text-gradient">{config.businessName.toUpperCase()}</span>?
              </h2>
              <p className="text-dark-300 text-lg mb-8">
                We&apos;re not a big national chain. We&apos;re your neighbors, serving 
                Southern Illinois with reliable dumpster rentals and real customer service.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Clock,
                    title: 'Same-Day & Next-Day Delivery',
                    description: 'Need it fast? We can usually deliver the same day or next day.'
                  },
                  {
                    icon: Shield,
                    title: 'Transparent Pricing',
                    description: 'No surprise fees. The price you see is the price you pay (unless you go over weight).'
                  },
                  {
                    icon: MapPin,
                    title: 'Locally Owned',
                    description: `Born and raised in Southern Illinois. We know the area and we're here to stay.`
                  },
                  {
                    icon: Phone,
                    title: 'Real People Answer',
                    description: 'Call us and talk to a real person. No phone trees, no robots.'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                      <p className="text-dark-400 text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Area Preview */}
            <div className="bg-dark-700/50 rounded-3xl p-8 border border-dark-600">
              <h3 className="font-display text-2xl text-white mb-4">SERVICE AREA</h3>
              <p className="text-dark-300 mb-6">
                We proudly serve {config.address.city} and surrounding communities 
                within {config.serviceRadius} miles.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {config.serviceTowns.slice(0, 12).map((town) => (
                  <span 
                    key={town}
                    className="bg-dark-600 px-3 py-1 rounded-full text-sm text-dark-300"
                  >
                    {town}
                  </span>
                ))}
                <span className="bg-primary-500/20 px-3 py-1 rounded-full text-sm text-primary-400">
                  +{config.serviceTowns.length - 12} more
                </span>
              </div>

              <Link 
                href="/service-area"
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                View Full Service Area
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container-custom">
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
                READY TO GET STARTED?
              </h2>
              <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
                Get an instant quote online or give us a call. We&apos;ll have a 
                dumpster in your driveway before you know it.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/book" className="bg-white text-primary-600 font-bold py-4 px-8 rounded-lg hover:bg-primary-50 transition-colors">
                  Get Your Quote
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
        </div>
      </section>
    </>
  )
}
