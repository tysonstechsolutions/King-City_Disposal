'use client'

import { useState } from 'react'
import { config } from '../../config'
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  MessageCircle
} from 'lucide-react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    // In production, this would send to your API/email service
    console.log('Form submitted:', formData)
    setSubmitted(true)
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-neutral-900 text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-neutral-300">
              Have a question? Need a custom quote? We&apos;re here to help.
              Real people answer our phones — no robots, no phone trees.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="section bg-neutral-50">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-8">
                Contact Info
              </h2>

              <div className="space-y-4 mb-8">
                {/* Phone */}
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="flex items-start gap-4 bg-white rounded-xl p-6 border border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <Phone className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-neutral-500 text-sm mb-1">Call or Text</p>
                    <p className="text-xl font-semibold text-neutral-900">{config.phone}</p>
                    <p className="text-neutral-500 text-sm mt-1">Fastest way to reach us!</p>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${config.email}`}
                  className="flex items-start gap-4 bg-white rounded-xl p-6 border border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <Mail className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-neutral-500 text-sm mb-1">Email</p>
                    <p className="text-lg font-semibold text-neutral-900">{config.email}</p>
                    <p className="text-neutral-500 text-sm mt-1">We reply within 24 hours</p>
                  </div>
                </a>

                {/* Location */}
                <div className="flex items-start gap-4 bg-white rounded-xl p-6 border border-neutral-200">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-neutral-500 text-sm mb-1">Service Area</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {config.address.city}, {config.address.state} + {config.serviceRadius} mile radius
                    </p>
                    <p className="text-neutral-500 text-sm mt-1">Southern Illinois</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4 bg-white rounded-xl p-6 border border-neutral-200">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-neutral-500 text-sm mb-2">Business Hours</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-8">
                        <span className="text-neutral-600">Mon - Fri</span>
                        <span className="text-neutral-900 font-medium">{config.hours.monday}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-neutral-600">Saturday</span>
                        <span className="text-neutral-900 font-medium">{config.hours.saturday}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-neutral-600">Sunday</span>
                        <span className="text-neutral-900 font-medium">{config.hours.sunday}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick booking tip */}
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-neutral-900 font-semibold mb-1">Need a quick quote?</p>
                    <p className="text-neutral-600 text-sm">
                      Use our chatbot in the bottom-right corner for instant pricing
                      and to book your dumpster in under 60 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-8">
                Send a Message
              </h2>

              {submitted ? (
                <div className="bg-white rounded-xl border border-primary-200 p-8 text-center">
                  <CheckCircle2 className="w-16 h-16 text-primary-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-neutral-900 mb-2">Message Sent!</h3>
                  <p className="text-neutral-600 mb-6">
                    Thanks for reaching out! We&apos;ll get back to you within 24 hours.
                  </p>
                  <a
                    href={`tel:${config.phoneRaw}`}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Need faster help? Call {config.phone}
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-200 p-6 md:p-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                        placeholder="John Smith"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                          placeholder="(618) 555-1234"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
                        placeholder="Tell us about your project or ask a question..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Send Message
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
