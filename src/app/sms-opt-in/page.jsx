import Link from 'next/link'
import { config } from '../../config'

// White-on-light styling here is intentional: this page exists for Twilio's
// toll-free SMS verification reviewers, who expect a plain factual document
// distinct from the marketing site.
export default function SMSOptInPage() {
  const websiteHost = (config.websiteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          SMS Opt-In Process - {config.businessName}
        </h1>

        <div className="prose prose-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
            How Customers Consent to SMS Notifications
          </h2>

          <p className="text-gray-700 mb-4">
            Customers provide explicit consent to receive SMS notifications during our online booking process at{' '}
            <Link href="/book" className="text-orange-600 hover:underline">
              {websiteHost}/book
            </Link>
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
            Step-by-Step Opt-In Process
          </h3>

          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>Customer selects dumpster size and project details</li>
            <li>Customer enters delivery address and date</li>
            <li>Customer provides name and email address</li>
            <li>
              <strong>Customer enters phone number with visible consent notice</strong>
            </li>
            <li>Customer reviews booking and confirms</li>
          </ol>

          <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">
            Consent Language Shown to Customers
          </h3>

          <div className="bg-gray-50 border-l-4 border-orange-500 p-6 my-6">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Phone Number Field Label:</strong>
            </p>
            <p className="text-gray-800 mb-4">Phone Number *</p>

            <p className="text-sm text-gray-600 mb-2">
              <strong>Consent Notice (displayed directly below phone input):</strong>
            </p>
            <p className="text-gray-800 italic">
              &ldquo;By providing your phone number, you agree to receive booking confirmations and invoice
              notifications via text. Msg &amp; data rates may apply. Reply STOP to opt out.&rdquo;
            </p>

            <p className="text-sm text-gray-600 mt-4 mb-2">
              <strong>Action Required:</strong>
            </p>
            <p className="text-gray-800">
              Customer must click &ldquo;Continue&rdquo; button to proceed, indicating acceptance of SMS notifications.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">
            Types of Messages Sent
          </h3>

          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Booking Confirmations</strong> - Sent immediately after booking is placed</li>
            <li><strong>Delivery Notifications</strong> - Sent when dumpster is on the way</li>
            <li><strong>Invoice Notifications</strong> - Sent with payment link when invoice is ready</li>
            <li><strong>Service Updates</strong> - Important updates about active rentals</li>
          </ul>

          <p className="text-gray-700 mt-4">
            <strong>We do NOT send:</strong> Marketing messages, promotional offers, or unsolicited communications
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">
            Opt-Out Process
          </h3>

          <p className="text-gray-700">
            Customers can opt out at any time by replying <strong>STOP</strong> to any text message.
            They will receive a confirmation that they have been unsubscribed.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">
            Help Information
          </h3>

          <p className="text-gray-700">
            Customers can reply <strong>HELP</strong> for assistance or call us at{' '}
            <a href={`tel:${config.phoneRaw}`} className="text-orange-600 hover:underline">
              {config.phone}
            </a>
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">
              For Verification Purposes
            </h4>
            <p className="text-blue-800">
              This page documents {config.businessName}&apos;s SMS opt-in process for toll-free number verification.
              All information accurately reflects our actual business practices.
            </p>
            <p className="text-blue-800 mt-2">
              <strong>Business:</strong> {config.businessName}<br />
              <strong>Toll-Free Number:</strong> {config.phone}<br />
              <strong>Service Area:</strong> Southern Illinois<br />
              <strong>Website:</strong>{' '}
              <Link href="/" className="text-blue-600 hover:underline">
                {websiteHost}
              </Link>
            </p>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Last Updated: March 5, 2026<br />
              Contact: <a href={`mailto:${config.email}`} className="text-orange-600 hover:underline">
                {config.email}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
