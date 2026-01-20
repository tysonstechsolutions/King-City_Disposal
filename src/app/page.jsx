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
      {/* Hero Section - Red background with blue/white text like logo */}
      <section className="bg-primary-700 text-white">
        <div className="container-custom py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Trust indicator */}
              <div className="flex items-center gap-2 text-accent-200 mb-6">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Southern Illinois&apos; Trusted Dumpster Rental Company</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Get a Dumpster<br />
                <span className="text-accent-300">Delivered TODAY</span>
              </h1>

              <p className="text-xl text-white/90 mb-8 max-w-2xl">
                Same-day delivery available in Mount Vernon & Southern IL.
                From $475 with no hidden fees. 10-day rental, 3 tons included.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 bg-accent-700 hover:bg-accent-800 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg"
                >
                  Book Online Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-primary-700 font-bold py-4 px-8 rounded-lg text-lg transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  {config.phone}
                </a>
              </div>

              {/* Trust stats */}
              <div className="flex flex-wrap gap-6 text-center mt-8">
                <div className="bg-white/10 rounded-lg px-4 py-3">
                  <span className="block text-2xl font-bold text-accent-300">$475</span>
                  <span className="text-white/70 text-xs">Starting Price</span>
                </div>
                <div className="bg-white/10 rounded-lg px-4 py-3">
                  <span className="block text-2xl font-bold text-accent-300">10 Day</span>
                  <span className="text-white/70 text-xs">Rental Period</span>
                </div>
                <div className="bg-white/10 rounded-lg px-4 py-3">
                  <span className="block text-2xl font-bold text-accent-300">$0</span>
                  <span className="text-white/70 text-xs">Hidden Fees</span>
                </div>
                <div className="bg-white/10 rounded-lg px-4 py-3">
                  <span className="block text-2xl font-bold text-accent-300">Same Day</span>
                  <span className="text-white/70 text-xs">Delivery Available</span>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="hidden lg:block">
              <Image
                src="/images/dumpster.jpg"
                alt="King City Disposal roll-off truck with dumpster"
                width={600}
                height={400}
                className="rounded-xl shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Transparency Section - What Happens If You Go Over? */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="heading-2 mb-4 text-white">Transparent Pricing. No Surprises.</h2>
              <p className="text-dark-300 text-lg">
                We believe in honest pricing. Here&apos;s exactly what you pay and when.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* What's Included */}
              <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h3 className="text-lg font-semibold text-white">Included in Every Rental</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Delivery to your location",
                    "10-day rental period",
                    "3 tons of disposal included",
                    "Pickup when you're done",
                    "No fuel surcharges",
                    "No environmental fees"
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-dark-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Potential Extra Costs */}
              <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-amber-500" />
                  <h3 className="text-lg font-semibold text-white">Potential Extra Costs</h3>
                </div>
                <ul className="space-y-3">
                  <li className="text-dark-300">
                    <span className="font-semibold text-white">Weight overage:</span> $105/ton over 3 tons
                    <p className="text-sm text-dark-400 mt-1">Most household cleanouts stay under 3 tons. Heavy materials like concrete add up fast.</p>
                  </li>
                  <li className="text-dark-300">
                    <span className="font-semibold text-white">Extra time:</span> $100/week extension
                    <p className="text-sm text-dark-400 mt-1">Need more than 10 days? Just let us know.</p>
                  </li>
                  <li className="text-dark-300">
                    <span className="font-semibold text-white">Mattresses:</span> $40 each
                    <p className="text-sm text-dark-400 mt-1">Due to special disposal requirements.</p>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-center text-dark-400 text-sm mt-6">
              Questions about pricing? <a href={`tel:${config.phoneRaw}`} className="text-primary font-semibold hover:underline">Call us at {config.phone}</a> — we&apos;ll give you an honest estimate.
            </p>
          </div>
        </div>
      </section>

      {/* Dumpster Sizes Section */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="heading-2 mb-4 text-white">Choose Your Dumpster Size</h2>
            <p className="text-dark-300 text-lg max-w-2xl mx-auto">
              We offer two popular sizes to fit most residential and commercial projects.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {config.dumpsters.map((dumpster) => (
              <div
                key={dumpster.id}
                className="bg-dark-700 rounded-xl border border-dark-600 overflow-hidden hover:border-dark-500 transition-all duration-300"
              >
                {/* Dumpster Image */}
                <div className="h-48 bg-dark-600 relative overflow-hidden">
                  <Image
                    src="/images/dumpster.jpg"
                    alt={dumpster.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-primary text-white text-sm font-bold px-3 py-1 rounded">
                    {dumpster.shortName}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {dumpster.name}
                  </h3>

                  <p className="text-dark-300 mb-4">
                    {dumpster.description}
                  </p>

                  {/* Specs */}
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Dimensions</span>
                      <span className="font-medium text-white">{dumpster.dimensions.display}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Rental Period</span>
                      <span className="font-medium text-white">10 Days</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dark-600">
                      <span className="text-dark-400">Weight Included</span>
                      <span className="font-medium text-white">{dumpster.weightIncluded}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <span className="text-sm text-dark-400">Starting at</span>
                      <div className="text-3xl font-bold text-primary">
                        ${dumpster.pricing['10-day']}
                      </div>
                    </div>
                    <span className="text-sm text-dark-400">10-day rental</span>
                  </div>

                  <Link
                    href={`/book?size=${dumpster.id}`}
                    className="block w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Need help choosing? */}
          <div className="text-center mt-8">
            <p className="text-dark-300">
              Not sure which size you need?{' '}
              <a href={`tel:${config.phoneRaw}`} className="text-primary font-semibold hover:underline">
                Call us at {config.phone}
              </a>
              {' '}and we&apos;ll help you choose.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works - Simple */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="heading-2 mb-4 text-white">How It Works</h2>
            <p className="text-dark-300 text-lg">
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
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-dark-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Haul */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="heading-2 mb-4 text-white">What We Haul</h2>
            <p className="text-dark-300 text-lg max-w-2xl mx-auto">
              Our dumpsters can handle most household and construction waste.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {haulItems.map((item) => (
              <div
                key={item.label}
                className="bg-dark-700 rounded-lg p-4 text-center border border-dark-600"
              >
                <item.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                <span className="text-sm font-medium text-dark-200">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-dark-400 text-sm">
              <strong className="text-dark-300">Not accepted:</strong> Hazardous materials, chemicals, paint, batteries, tires, and appliances with Freon.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="heading-2 mb-6 text-white">
                Why Choose {config.businessName}?
              </h2>
              <p className="text-dark-300 text-lg mb-8">
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
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="text-dark-400 text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {/* Meet the Owners */}
              <div className="bg-dark-800 rounded-xl overflow-hidden border border-dark-700">
                <Image
                  src="/images/fam.jpg"
                  alt="King City Disposal owners"
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover object-top"
                />
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Meet the Owners
                  </h3>
                  <p className="text-dark-300">
                    We&apos;re a family-owned business dedicated to providing reliable,
                    honest service to our Southern Illinois neighbors.
                  </p>
                </div>
              </div>

              {/* Service Area */}
              <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Service Area
                </h3>
                <p className="text-dark-400 text-sm mb-4">
                  Serving {config.address.city} and surrounding communities within
                  a {config.serviceRadius}-mile radius.
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {config.serviceTowns.slice(0, 8).map((town) => (
                    <span
                      key={town}
                      className="bg-dark-700 px-2 py-1 rounded-full text-xs text-dark-300 border border-dark-600"
                    >
                      {town}
                    </span>
                  ))}
                  {config.serviceTowns.length > 8 && (
                    <span className="bg-primary/20 px-2 py-1 rounded-full text-xs text-primary font-medium">
                      +{config.serviceTowns.length - 8} more
                    </span>
                  )}
                </div>

                <Link
                  href="/service-area"
                  className="text-primary font-semibold hover:underline inline-flex items-center gap-1 text-sm"
                >
                  View full service area
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Reviews Section */}
      <section className="section bg-neutral-900 text-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-xl font-bold">5.0</span>
              <span className="text-neutral-400">on Google</span>
            </div>
            <a
              href="https://www.google.com/search?q=King+City+Disposal+Mount+Vernon+IL+reviews"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              See all reviews on Google →
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-neutral-800 rounded-xl p-6 border border-neutral-700"
              >
                {/* Google badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
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

          {/* CTA to leave review */}
          <div className="text-center mt-10">
            <p className="text-neutral-400 mb-4">Had a great experience? We&apos;d love to hear about it!</p>
            <a
              href="https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              <Star className="w-5 h-5 text-amber-400" />
              Leave Us a Review on Google
            </a>
          </div>
        </div>
      </section>

      {/* Helpful Guides - Internal Links for SEO */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="heading-2 mb-4 text-white">Helpful Dumpster Rental Guides</h2>
            <p className="text-dark-300 text-lg max-w-2xl mx-auto">
              Not sure where to start? Our guides answer common questions about dumpster rentals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Link
              href="/guides/dumpster-sizes"
              className="bg-dark-700 rounded-xl p-6 border border-dark-600 hover:border-primary/50 transition-all group"
            >
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-primary transition-colors">
                What Size Dumpster Do I Need?
              </h3>
              <p className="text-dark-300 mb-4">
                Compare 20 and 30 yard dumpsters. Find the right size for your home cleanout,
                renovation, roofing project, or construction job.
              </p>
              <span className="text-primary font-semibold inline-flex items-center gap-2">
                Read the Guide
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link
              href="/guides/dumpster-rental-cost"
              className="bg-dark-700 rounded-xl p-6 border border-dark-600 hover:border-primary/50 transition-all group"
            >
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-primary transition-colors">
                How Much Does a Dumpster Cost?
              </h3>
              <p className="text-dark-300 mb-4">
                Understand dumpster rental pricing, what&apos;s included, and how to avoid
                hidden fees. Transparent pricing guide from a local company.
              </p>
              <span className="text-primary font-semibold inline-flex items-center gap-2">
                Read the Guide
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA - Red background like logo */}
      <section className="section bg-primary-700">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Book your dumpster online in minutes, or give us a call.
            We&apos;re here to help.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-accent-700 hover:bg-accent-800 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg"
            >
              Book Online Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`tel:${config.phoneRaw}`}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-primary-700 font-bold py-4 px-8 rounded-lg text-lg transition-colors"
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
