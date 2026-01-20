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
  Quote,
  Truck,
  Calendar,
  DollarSign,
  Users,
  ThumbsUp,
  Zap
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
      {/* Hero Section - Navy blue with image on left */}
      <section className="bg-gradient-to-br from-accent-950 via-accent-900 to-accent-800 text-white overflow-hidden">
        <div className="container-custom py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            {/* Image on LEFT - with red border accent */}
            <div className="order-2 lg:order-1 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-primary-600">
                <Image
                  src="/images/dumpster.jpg"
                  alt="King City Disposal roll-off dumpster ready for delivery"
                  width={600}
                  height={450}
                  className="w-full h-auto object-cover"
                  priority
                />
                {/* Overlay badge */}
                <div className="absolute bottom-4 left-4 bg-primary-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
                  <span className="text-2xl">$475</span>
                  <span className="text-sm ml-1">Starting Price</span>
                </div>
              </div>

              {/* Floating stats card */}
              <div className="absolute -bottom-6 -right-4 md:right-8 bg-white text-accent-900 p-4 rounded-xl shadow-xl hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <Truck className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Same Day</p>
                    <p className="text-sm text-accent-600">Delivery Available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Text content on RIGHT */}
            <div className="order-1 lg:order-2">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <Shield className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium">Southern Illinois&apos; Most Trusted</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Dumpster Rentals
                <span className="block text-primary-400">Made Simple</span>
              </h1>

              <p className="text-xl text-white/80 mb-6 leading-relaxed">
                Need to clear out junk, tackle a renovation, or clean up a job site?
                We deliver roll-off dumpsters right to your driveway — fast, affordable,
                and hassle-free.
              </p>

              {/* Key benefits */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <span className="text-white/90">10-Day Rental Period</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <span className="text-white/90">3 Tons Included</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <span className="text-white/90">No Hidden Fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <span className="text-white/90">Local Family Business</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Book Your Dumpster
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-xl text-lg transition-all border border-white/20"
                >
                  <Phone className="w-5 h-5" />
                  {config.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar - Quick stats */}
      <section className="bg-accent-950 border-y border-accent-800">
        <div className="container-custom py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-400">500+</div>
              <div className="text-accent-300 text-sm">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-400">5.0</div>
              <div className="text-accent-300 text-sm flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                Google Rating
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-400">Same Day</div>
              <div className="text-accent-300 text-sm">Delivery Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-400">30 Mile</div>
              <div className="text-accent-300 text-sm">Service Radius</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Clean and simple */}
      <section className="bg-accent-900 py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-accent-300 text-lg max-w-2xl mx-auto">
              Getting a dumpster shouldn&apos;t be complicated. We&apos;ve made it as easy as 1-2-3.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                icon: Calendar,
                title: "Book Online or Call",
                description: "Pick your dumpster size and delivery date. Takes less than 2 minutes online, or give us a call."
              },
              {
                step: "2",
                icon: Truck,
                title: "We Deliver to You",
                description: "We'll drop the dumpster exactly where you need it — driveway, job site, wherever works best."
              },
              {
                step: "3",
                icon: ThumbsUp,
                title: "Fill It, We Haul It",
                description: "Take your time filling it up. When you're done, we pick it up and haul everything away."
              }
            ].map((item) => (
              <div key={item.step} className="relative bg-accent-800/50 rounded-2xl p-8 text-center border border-accent-700 hover:border-primary-500/50 transition-colors">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {item.step}
                </div>

                <div className="w-16 h-16 bg-accent-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-primary-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-accent-300 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dumpster Sizes Section */}
      <section className="bg-accent-950 py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Choose Your Dumpster Size
            </h2>
            <p className="text-accent-300 text-lg max-w-2xl mx-auto">
              Not sure which size you need? No worries — most home cleanouts fit in our 20-yarder.
              Bigger projects? Go with the 30.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {config.dumpsters.map((dumpster) => (
              <div
                key={dumpster.id}
                className="bg-accent-800 rounded-2xl border border-accent-700 overflow-hidden hover:border-primary-500/50 transition-all hover:shadow-xl group"
              >
                {/* Dumpster Image */}
                <div className="h-48 bg-accent-700 relative overflow-hidden">
                  <Image
                    src="/images/dumpster.jpg"
                    alt={dumpster.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-accent-900/80 to-transparent" />
                  <div className="absolute top-4 right-4 bg-primary-600 text-white text-sm font-bold px-3 py-1 rounded-lg">
                    {dumpster.shortName}
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="text-4xl font-extrabold text-white">${dumpster.pricing['10-day']}</span>
                    <span className="text-white/70 text-sm ml-2">10-day rental</span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {dumpster.name}
                  </h3>

                  <p className="text-accent-300 mb-4">
                    {dumpster.description}
                  </p>

                  {/* Specs */}
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between py-2 border-b border-accent-700">
                      <span className="text-accent-400">Dimensions</span>
                      <span className="font-medium text-white">{dumpster.dimensions.display}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-accent-700">
                      <span className="text-accent-400">Weight Included</span>
                      <span className="font-medium text-white">{dumpster.weightIncluded}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-accent-400">Best For</span>
                      <span className="font-medium text-white">{dumpster.id === '20-yard' ? 'Home Cleanouts' : 'Big Projects'}</span>
                    </div>
                  </div>

                  <Link
                    href={`/book?size=${dumpster.id}`}
                    className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                  >
                    Book This Size
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Need help choosing? */}
          <div className="text-center mt-10">
            <p className="text-accent-300 mb-4">
              Not sure which size you need? We&apos;re happy to help!
            </p>
            <a href={`tel:${config.phoneRaw}`} className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-semibold">
              <Phone className="w-5 h-5" />
              Call {config.phone} for a free consultation
            </a>
          </div>
        </div>
      </section>

      {/* What We Haul */}
      <section className="bg-accent-900 py-16 md:py-24">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                What Can You Put In?
              </h2>
              <p className="text-accent-300 text-lg mb-8 leading-relaxed">
                Our dumpsters can handle just about anything from your home cleanout,
                renovation, or construction project. If you&apos;re not sure, just ask!
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {haulItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 bg-accent-800/50 rounded-xl p-4 border border-accent-700"
                  >
                    <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary-400" />
                    </div>
                    <span className="font-medium text-white">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="bg-accent-800 rounded-xl p-4 border border-accent-700">
                <p className="text-accent-400 text-sm">
                  <strong className="text-white">Not accepted:</strong> Hazardous materials, chemicals, paint, batteries, tires, and appliances with Freon.
                  <Link href="/faq" className="text-primary-400 hover:underline ml-1">See full list →</Link>
                </p>
              </div>
            </div>

            {/* Family image */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-accent-700">
                <Image
                  src="/images/fam.jpg"
                  alt="King City Disposal family owners"
                  width={600}
                  height={450}
                  className="w-full h-auto object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white text-accent-900 p-5 rounded-xl shadow-xl">
                <p className="font-bold text-lg">Family Owned</p>
                <p className="text-sm text-accent-600">Serving Southern Illinois</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Transparency */}
      <section className="bg-accent-950 py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Honest, Transparent Pricing
              </h2>
              <p className="text-accent-300 text-lg">
                No hidden fees, no surprises on your bill. Here&apos;s exactly what you&apos;re paying for.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* What's Included */}
              <div className="bg-accent-800 rounded-2xl p-6 border border-accent-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Included in Every Rental</h3>
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
                    <li key={item} className="flex items-center gap-2 text-accent-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Potential Extra Costs */}
              <div className="bg-accent-800 rounded-2xl p-6 border border-accent-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Potential Extra Costs</h3>
                </div>
                <ul className="space-y-4">
                  <li className="text-accent-300">
                    <span className="font-semibold text-white">Weight overage:</span> $105/ton over 3 tons
                    <p className="text-sm text-accent-400 mt-1">Most cleanouts stay under. Heavy stuff like concrete adds up.</p>
                  </li>
                  <li className="text-accent-300">
                    <span className="font-semibold text-white">Extra time:</span> $25/day after 10 days
                    <p className="text-sm text-accent-400 mt-1">Need more time? No problem, just let us know.</p>
                  </li>
                  <li className="text-accent-300">
                    <span className="font-semibold text-white">Mattresses:</span> $40 each
                    <p className="text-sm text-accent-400 mt-1">Special disposal required by law.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Reviews Section */}
      <section className="bg-accent-900 py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What Our Customers Say</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <span className="text-xl font-bold text-white">5.0</span>
              <span className="text-accent-400">on Google</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-accent-800 rounded-2xl p-6 border border-accent-700"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-accent-600 mb-3" />

                <p className="text-white/90 mb-4 leading-relaxed">
                  &ldquo;{testimonial.text}&rdquo;
                </p>

                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-accent-400">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Area */}
      <section className="bg-accent-950 py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <MapPin className="w-12 h-12 text-primary-400 mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Proudly Serving Southern Illinois
            </h2>
            <p className="text-accent-300 text-lg mb-8">
              Based in {config.address.city}, we deliver within a {config.serviceRadius}-mile radius.
              That includes:
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {config.serviceTowns.slice(0, 12).map((town) => (
                <span
                  key={town}
                  className="bg-accent-800 px-4 py-2 rounded-full text-sm text-white border border-accent-700"
                >
                  {town}
                </span>
              ))}
              {config.serviceTowns.length > 12 && (
                <Link
                  href="/service-area"
                  className="bg-primary-600/20 px-4 py-2 rounded-full text-sm text-primary-400 border border-primary-600/50 hover:bg-primary-600/30 transition-colors"
                >
                  +{config.serviceTowns.length - 12} more cities →
                </Link>
              )}
            </div>

            <Link
              href="/service-area"
              className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-semibold"
            >
              View full service area map
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary-700 to-primary-600 py-16 md:py-24">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/90 text-xl mb-8 max-w-2xl mx-auto">
            Book online in under 2 minutes, or give us a call.
            We&apos;re real people who answer real phones.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-primary-700 font-bold py-4 px-10 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl"
            >
              Book Online Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`tel:${config.phoneRaw}`}
              className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold py-4 px-10 rounded-xl text-lg transition-all border border-white/30"
            >
              <Phone className="w-5 h-5" />
              Call {config.phone}
            </a>
          </div>

          <p className="text-white/70 text-sm mt-6">
            Mon-Fri 7am-6pm • Sat 8am-2pm • Same-day delivery available
          </p>
        </div>
      </section>
    </>
  )
}
