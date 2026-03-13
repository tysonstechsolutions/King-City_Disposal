import Link from 'next/link'
import { config } from '../../config'
import {
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
  Users,
  Heart,
  Clock,
  Shield
} from 'lucide-react'

export const metadata = {
  title: `About Us - Locally Owned Dumpster Rental | ${config.businessName}`,
  description: `${config.businessName} is a locally owned dumpster rental company serving ${config.address.city}, IL and Southern Illinois. Fast delivery, transparent pricing, and honest service.`,
  alternates: {
    canonical: `${config.websiteUrl}/about`,
  },
}

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              About {config.businessName}
            </h1>
            <p className="text-xl text-white/90">
              Locally owned. Honestly priced. Here when you need us.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Southern Illinois Roots
              </h2>
              <div className="space-y-4 text-dark-300">
                <p>
                  {config.businessName} was founded with a simple idea: dumpster rental
                  shouldn&apos;t be complicated. No hidden fees, no surprise charges, no
                  runaround. Just straightforward service from people who live and work
                  right here in Southern Illinois.
                </p>
                <p>
                  We&apos;re based in {config.address.city}, IL, and we serve communities
                  throughout the region. When you call us, you&apos;re talking to your
                  neighbors — people who understand what it means to do business the
                  right way.
                </p>
                <p>
                  Whether you&apos;re cleaning out a garage, tearing off a roof, or
                  managing a construction site, we&apos;ve got the right dumpster for the
                  job. And we&apos;ll get it to you fast.
                </p>
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-8 border border-dark-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Based in {config.address.city}</h3>
                  <p className="text-dark-400">Serving Southern Illinois</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-dark-200">Locally owned & operated</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-dark-200">Same-day delivery available</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-dark-200">Transparent, upfront pricing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-dark-200">Serving {config.serviceTowns.length}+ communities</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            How We Do Business
          </h2>
          <p className="text-dark-300 text-center mb-12 max-w-2xl mx-auto">
            We believe in doing things the right way. Here&apos;s what that means to us.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-dark-900 rounded-xl p-6 border border-dark-700 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-white mb-2">Honest Pricing</h3>
              <p className="text-dark-400 text-sm">
                The price we quote is the price you pay. No hidden fees or surprise charges.
              </p>
            </div>

            <div className="bg-dark-900 rounded-xl p-6 border border-dark-700 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-white mb-2">Reliable Service</h3>
              <p className="text-dark-400 text-sm">
                When we say we&apos;ll be there, we&apos;ll be there. On time, every time.
              </p>
            </div>

            <div className="bg-dark-900 rounded-xl p-6 border border-dark-700 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-white mb-2">Local Support</h3>
              <p className="text-dark-400 text-sm">
                Talk to real people who know the area and care about doing a good job.
              </p>
            </div>

            <div className="bg-dark-900 rounded-xl p-6 border border-dark-700 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-white mb-2">Community First</h3>
              <p className="text-dark-400 text-sm">
                We live here too. Supporting our neighbors is what we do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Area */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Serving Southern Illinois
            </h2>
            <p className="text-dark-300 mb-8">
              We deliver dumpsters throughout the region, including these communities
              and everywhere in between.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {config.serviceTowns.slice(0, 20).map((town) => (
                <span
                  key={town}
                  className="bg-dark-800 text-dark-200 px-3 py-1 rounded-full text-sm"
                >
                  {town}
                </span>
              ))}
              {config.serviceTowns.length > 20 && (
                <span className="bg-primary/20 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                  +{config.serviceTowns.length - 20} more
                </span>
              )}
            </div>

            <Link
              href="/service-area"
              className="text-primary hover:text-primary-700 inline-flex items-center gap-2 font-medium"
            >
              View Full Service Area
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="section bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Book your dumpster online or give us a call. We&apos;re here to help
            with your next project.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Book a Dumpster
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
