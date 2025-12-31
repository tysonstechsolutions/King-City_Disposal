import Link from 'next/link'
import Image from 'next/image'
import { config } from '../config'
import {
  Phone,
  CheckCircle,
  ArrowRight,
  Star,
  MapPin,
  Clock,
  Truck,
  Shield,
  Sofa,
  Hammer,
  TreeDeciduous,
  Refrigerator,
  Trash2,
  Building,
  Quote
} from 'lucide-react'

// Testimonials data
const testimonials = [
  {
    name: "Mike Johnson",
    location: "Mount Vernon, IL",
    text: "Fast delivery, fair pricing, and they picked it up right on time. Exactly what I needed for my garage cleanout.",
    rating: 5
  },
  {
    name: "Sarah Williams",
    location: "Centralia, IL",
    text: "Used them for a roofing project. The dumpster was there when they said it would be, and pickup was hassle-free.",
    rating: 5
  },
  {
    name: "Tom Baker",
    location: "Salem, IL",
    text: "Great local company. Called them in the morning, had a dumpster by afternoon. Can't beat that service.",
    rating: 5
  }
]

// What we haul items
const haulItems = [
  { icon: Sofa, label: "Furniture" },
  { icon: Hammer, label: "Construction Debris" },
  { icon: TreeDeciduous, label: "Yard Waste" },
  { icon: Refrigerator, label: "Appliances" },
  { icon: Trash2, label: "Household Junk" },
  { icon: Building, label: "Renovation Waste" },
]

export default function HomePage() {
  return (
    <>
      {/* Hero Section - Clean & Professional */}
      <section className="bg-neutral-900 text-white">
        <div className="container-custom py-16 md:py-24">
          <div className="max-w-3xl">
            {/* Trust indicator */}
            <div className="flex items-center gap-2 text-primary-400 mb-6">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Locally Owned & Operated</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Dumpster Rentals in<br />
              <span className="text-primary-400">Southern Illinois</span>
            </h1>

            <p className="text-xl text-neutral-300 mb-8 max-w-2xl">
              Easy online booking, transparent pricing, and reliable service.
              Get a dumpster delivered to your driveway as soon as tomorrow.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors"
              >
                Book Online Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href={`tel:${config.phoneRaw}`}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold py-4 px-8 rounded-lg text-lg transition-colors"
              >
                <Phone className="w-5 h-5" />
                {config.phone}
              </a>
            </div>

            {/* Quick benefits */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-neutral-400 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-400" />
                <span>Same-Day Delivery Available</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-400" />
                <span>No Hidden Fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-400" />
                <span>Serving {config.serviceRadius}+ Mile Radius</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dumpster Sizes Section */}
      <section className="section bg-neutral-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="heading-2 mb-4">Choose Your Dumpster Size</h2>
            <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
              We offer two popular sizes to fit most residential and commercial projects.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {config.dumpsters.map((dumpster) => (
              <div
                key={dumpster.id}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                {/* Dumpster Image Placeholder */}
                <div className="h-48 bg-neutral-100 flex items-center justify-center relative">
                  <Truck className="w-24 h-24 text-neutral-300" />
                  <div className="absolute top-4 right-4 bg-primary-600 text-white text-sm font-bold px-3 py-1 rounded">
                    {dumpster.shortName}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                    {dumpster.name}
                  </h3>

                  <p className="text-neutral-600 mb-4">
                    {dumpster.description}
                  </p>

                  {/* Specs */}
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between py-2 border-b border-neutral-100">
                      <span className="text-neutral-500">Dimensions</span>
                      <span className="font-medium text-neutral-900">{dumpster.dimensions.display}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-100">
                      <span className="text-neutral-500">Rental Period</span>
                      <span className="font-medium text-neutral-900">Up to 3 Days</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-100">
                      <span className="text-neutral-500">Weight Included</span>
                      <span className="font-medium text-neutral-900">{dumpster.weightIncluded}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <span className="text-sm text-neutral-500">Starting at</span>
                      <div className="text-3xl font-bold text-primary-600">
                        ${dumpster.pricing['10-day']}
                      </div>
                    </div>
                    <span className="text-sm text-neutral-500">10-day rental</span>
                  </div>

                  <Link
                    href={`/book?size=${dumpster.id}`}
                    className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Need help choosing? */}
          <div className="text-center mt-8">
            <p className="text-neutral-600">
              Not sure which size you need?{' '}
              <a href={`tel:${config.phoneRaw}`} className="text-primary-600 font-semibold hover:underline">
                Call us at {config.phone}
              </a>
              {' '}and we&apos;ll help you choose.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works - Simple */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="heading-2 mb-4">How It Works</h2>
            <p className="text-neutral-600 text-lg">
              Getting a dumpster is easy. Here&apos;s what to expect.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Book Online or Call",
                description: "Choose your size, pick your delivery date, and book in minutes."
              },
              {
                step: "2",
                title: "We Deliver",
                description: "We'll drop the dumpster exactly where you need it."
              },
              {
                step: "3",
                title: "We Pick Up",
                description: "Fill it up, then we haul it away. Simple as that."
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{item.title}</h3>
                <p className="text-neutral-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Haul */}
      <section className="section bg-neutral-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="heading-2 mb-4">What We Haul</h2>
            <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
              Our dumpsters can handle most household and construction waste.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {haulItems.map((item) => (
              <div
                key={item.label}
                className="bg-white rounded-lg p-4 text-center border border-neutral-200"
              >
                <item.icon className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-neutral-700">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-neutral-500 text-sm">
              <strong>Not accepted:</strong> Hazardous materials, chemicals, paint, batteries, tires, and appliances with Freon.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="heading-2 mb-6">
                Why Choose {config.businessName}?
              </h2>
              <p className="text-neutral-600 text-lg mb-8">
                We&apos;re a local business serving Southern Illinois. When you call us,
                you talk to a real person who knows the area.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: Clock,
                    title: "Fast Delivery",
                    description: "Same-day and next-day delivery available in most areas."
                  },
                  {
                    icon: Shield,
                    title: "Transparent Pricing",
                    description: "No hidden fees. The price you see is the price you pay."
                  },
                  {
                    icon: MapPin,
                    title: "Locally Owned",
                    description: "We live and work in Southern Illinois. We're your neighbors."
                  },
                  {
                    icon: Phone,
                    title: "Real Customer Service",
                    description: "Call us and talk to a real person. No phone trees."
                  }
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">{item.title}</h3>
                      <p className="text-neutral-600 text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Area */}
            <div className="bg-neutral-50 rounded-xl p-8 border border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                Service Area
              </h3>
              <p className="text-neutral-600 mb-6">
                We serve {config.address.city} and surrounding communities within
                a {config.serviceRadius}-mile radius.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {config.serviceTowns.slice(0, 12).map((town) => (
                  <span
                    key={town}
                    className="bg-white px-3 py-1 rounded-full text-sm text-neutral-600 border border-neutral-200"
                  >
                    {town}
                  </span>
                ))}
                {config.serviceTowns.length > 12 && (
                  <span className="bg-primary-50 px-3 py-1 rounded-full text-sm text-primary-600 font-medium">
                    +{config.serviceTowns.length - 12} more
                  </span>
                )}
              </div>

              <Link
                href="/service-area"
                className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-1"
              >
                View full service area
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section bg-neutral-900 text-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-neutral-400 text-lg">
              Don&apos;t just take our word for it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-neutral-800 rounded-xl p-6 border border-neutral-700"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-neutral-600 mb-3" />

                <p className="text-neutral-300 mb-4 leading-relaxed">
                  &ldquo;{testimonial.text}&rdquo;
                </p>

                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-neutral-500">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section bg-primary-600">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Book your dumpster online in minutes, or give us a call.
            We&apos;re here to help.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-primary-600 font-semibold py-4 px-8 rounded-lg text-lg transition-colors"
            >
              Book Online Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`tel:${config.phoneRaw}`}
              className="inline-flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors border border-primary-500"
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
