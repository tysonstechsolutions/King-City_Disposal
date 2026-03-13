'use client'

import { config } from '../../config'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Phone, Mail } from 'lucide-react'

export default function SMSTermsPage() {
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SMS Terms & Conditions</h1>
              <p className="text-dark-400">{config.businessName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 md:p-8 space-y-8">

          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">SMS Messaging Terms</h2>
            <p className="text-dark-300 leading-relaxed">
              By providing your phone number and opting in to receive text messages from {config.businessName},
              you agree to receive SMS messages related to your dumpster rental service. These terms govern
              our SMS communications with you.
            </p>
          </section>

          {/* What Messages You'll Receive */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Types of Messages You'll Receive</h2>
            <p className="text-dark-300 mb-4">
              When you opt in to receive text messages from {config.businessName}, you may receive:
            </p>
            <ul className="space-y-2 text-dark-300">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-white">Booking Confirmations:</strong> Confirmation of your dumpster rental booking with details about your delivery date and location.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-white">Delivery Notifications:</strong> Updates about when your dumpster is being delivered or has been delivered.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-white">Pickup Reminders:</strong> Reminders that your rental period is ending and pickup is scheduled.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-white">Invoice & Payment Notifications:</strong> Invoices, payment confirmations, and receipts for your rental.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-white">Service Updates:</strong> Important updates about your rental, such as schedule changes or service alerts.</span>
              </li>
            </ul>
          </section>

          {/* Message Frequency */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Message Frequency</h2>
            <p className="text-dark-300 leading-relaxed">
              Message frequency varies based on your rental activity. You will typically receive 3-8 messages
              per rental (booking confirmation, delivery notification, pickup reminder, and invoice).
              You will not receive marketing or promotional messages unless you separately opt in to those communications.
            </p>
          </section>

          {/* Opt-Out Instructions */}
          <section className="bg-dark-700 rounded-xl p-6 border border-dark-600">
            <h2 className="text-xl font-semibold text-white mb-4">How to Opt Out</h2>
            <p className="text-dark-300 mb-4">
              You can opt out of receiving text messages at any time by:
            </p>
            <ul className="space-y-3 text-dark-300">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Replying <strong className="text-white">STOP</strong> to any message you receive from us</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Calling us at <a href={`tel:${config.phoneRaw}`} className="text-primary hover:underline">{config.phone}</a></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Emailing us at <a href={`mailto:${config.email}`} className="text-primary hover:underline">{config.email}</a></span>
              </li>
            </ul>
            <p className="text-dark-400 mt-4 text-sm">
              After opting out, you will receive one final confirmation message. You will no longer receive
              text messages from us unless you opt in again.
            </p>
          </section>

          {/* Help */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Need Help?</h2>
            <p className="text-dark-300 mb-4">
              If you need assistance with our SMS messaging program, you can:
            </p>
            <ul className="space-y-2 text-dark-300">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Reply <strong className="text-white">HELP</strong> to any message for assistance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Call us at <a href={`tel:${config.phoneRaw}`} className="text-primary hover:underline">{config.phone}</a></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Email us at <a href={`mailto:${config.email}`} className="text-primary hover:underline">{config.email}</a></span>
              </li>
            </ul>
          </section>

          {/* Costs */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Message & Data Rates</h2>
            <p className="text-dark-300 leading-relaxed">
              Standard message and data rates may apply to messages sent and received. {config.businessName}
              does not charge for SMS messages, but your mobile carrier may charge you based on your plan.
              Check with your carrier if you have questions about your messaging plan.
            </p>
          </section>

          {/* Carriers */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Supported Carriers</h2>
            <p className="text-dark-300 leading-relaxed">
              Our SMS messaging service is compatible with all major U.S. carriers including AT&T, Verizon,
              T-Mobile, Sprint, and others. Carriers are not liable for delayed or undelivered messages.
            </p>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Privacy</h2>
            <p className="text-dark-300 leading-relaxed">
              Your phone number and opt-in consent are kept confidential. We do not sell, rent, or share
              your phone number with third parties for marketing purposes. Your information is used solely
              to provide you with service-related communications about your dumpster rental.
              For more details, see our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          {/* Contact Information */}
          <section className="border-t border-dark-600 pt-8">
            <h2 className="text-xl font-semibold text-white mb-4">Contact Us</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <a
                href={`tel:${config.phoneRaw}`}
                className="flex items-center gap-3 p-4 bg-dark-700 rounded-xl border border-dark-600 hover:border-primary/50 transition-colors"
              >
                <Phone className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-white font-medium">{config.phone}</p>
                  <p className="text-dark-400 text-sm">Call or Text</p>
                </div>
              </a>
              <a
                href={`mailto:${config.email}`}
                className="flex items-center gap-3 p-4 bg-dark-700 rounded-xl border border-dark-600 hover:border-primary/50 transition-colors"
              >
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-white font-medium">{config.email}</p>
                  <p className="text-dark-400 text-sm">Email Us</p>
                </div>
              </a>
            </div>
            <p className="text-dark-500 text-sm mt-6 text-center">
              {config.businessName} • {config.address?.city}, {config.address?.state}
            </p>
          </section>

          {/* Last Updated */}
          <p className="text-dark-500 text-sm text-center pt-4 border-t border-dark-600">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}
