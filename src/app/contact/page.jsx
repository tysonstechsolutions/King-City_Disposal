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
      <section className="section bg-dark-800 pt-32">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl md:text-6xl text-white mb-4">
              GET IN <span className="text-gradient">TOUCH</span>
            </h1>
            <p className="text-xl text-dark-300">
              Have a question? Need a custom quote? We&apos;re here to help. 
              Real people answer our phones — no robots, no phone trees.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="section">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="font-display text-3xl text-white mb-8">
                CONTACT INFO
              </h2>

              <div className="space-y-6 mb-12">
                {/* Phone */}
                <a 
                  href={`tel:${config.phoneRaw}`}
                  className="flex items-start gap-4 bg-dark-800 rounded-xl p-6 border border-dark-700 hover:border-primary-500/50 transition-colors group"
                >
                  <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                    <Phone className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-dark-400 text-sm mb-1">Call or Text</p>
                    <p className="text-xl font-semibold text-white">{config.phone}</p>
                    <p className="text-dark-400 text-sm mt-1">Fastest way to reach us!</p>
                  </div>
                </a>

                {/* Email */}
                <a 
                  href={`mailto:${config.email}`}
                  className="flex items-start gap-4 bg-dark-800 rounded-xl p-6 border border-dark-700 hover:border-primary-500/50 transition-colors group"
                >
                  <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                    <Mail className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-dark-400 text-sm mb-1">Email</p>
                    <p className="text-lg font-semibold text-white">{config.email}</p>
                    <p className="text-dark-400 text-sm mt-1">We reply within 24 hours</p>
                  </div>
                </a>

                {/* Location */}
                <div className="flex items-start gap-4 bg-dark-800 rounded-xl p-6 border border-dark-700">
                  <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-dark-400 text-sm mb-1">Service Area</p>
                    <p className="text-lg font-semibold text-white">
                      {config.address.city}, {config.address.state} + {config.serviceRadius} mile radius
                    </p>
                    <p className="text-dark-400 text-sm mt-1">Southern Illinois</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4 bg-dark-800 rounded-xl p-6 border border-dark-700">
                  <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-dark-400 text-sm mb-2">Business Hours</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-8">
                        <span className="text-dark-300">Mon - Fri</span>
                        <span className="text-white">{config.hours.monday}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-dark-300">Saturday</span>
                        <span className="text-white">{config.hours.saturday}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-dark-300">Sunday</span>
                        <span className="text-white">{config.hours.sunday}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick booking tip */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-white font-semibold mb-1">Need a quick quote?</p>
                    <p className="text-dark-300 text-sm">
                      Use our chatbot in the bottom-right corner for instant pricing 
                      and to book your dumpster in under 60 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="font-display text-3xl text-white mb-8">
                SEND A MESSAGE
              </h2>

              {submitted ? (
                <div className="bg-dark-800 rounded-2xl border border-primary-500/50 p-8 text-center">
                  <CheckCircle2 className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-2">Message Sent!</h3>
                  <p className="text-dark-300 mb-6">
                    Thanks for reaching out! We&apos;ll get back to you within 24 hours.
                  </p>
                  <a 
                    href={`tel:${config.phoneRaw}`}
                    className="text-primary-400 hover:text-primary-300"
                  >
                    Need faster help? Call {config.phone}
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-dark-800 rounded-2xl border border-dark-700 p-6 md:p-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field"
                        placeholder="John Smith"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="input-field"
                          placeholder="(618) 555-1234"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="input-field"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="input-field resize-none"
                        placeholder="Tell us about your project or ask a question..."
                      />
                    </div>

                    <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2">
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
