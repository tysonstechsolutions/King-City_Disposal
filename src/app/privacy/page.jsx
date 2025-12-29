import { config } from '../../config'

export const metadata = {
  title: 'Privacy Policy',
  description: `Privacy Policy for ${config.businessName} - How we collect, use, and protect your information.`,
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl text-white mb-8">Privacy Policy</h1>

        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-dark-300 mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>
            <p className="text-dark-300 mb-4">
              When you use {config.businessName}'s services, we may collect the following information:
            </p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li><strong>Contact Information:</strong> Name, phone number, email address</li>
              <li><strong>Service Address:</strong> Delivery and pickup location for your dumpster rental</li>
              <li><strong>Payment Information:</strong> Processed securely through our payment provider (Stripe)</li>
              <li><strong>Communication Records:</strong> Text messages and call logs related to your rental</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
            <p className="text-dark-300 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Process and fulfill your dumpster rental orders</li>
              <li>Communicate with you about your rental (delivery updates, pickup reminders)</li>
              <li>Send appointment reminders and service notifications via SMS</li>
              <li>Process payments securely</li>
              <li>Improve our services and customer experience</li>
              <li>Respond to your inquiries and provide customer support</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. SMS/Text Messaging</h2>
            <p className="text-dark-300 mb-4">
              By providing your phone number, you consent to receive text messages from {config.businessName} regarding:
            </p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Booking confirmations</li>
              <li>Delivery and pickup reminders</li>
              <li>Service updates and notifications</li>
              <li>Responses to your inquiries</li>
            </ul>
            <p className="text-dark-300 mt-4">
              Message frequency varies. Standard message and data rates may apply.
              Reply STOP to opt out of text messages at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Information Sharing</h2>
            <p className="text-dark-300">
              We do not sell, trade, or rent your personal information to third parties.
              We may share your information only with:
            </p>
            <ul className="list-disc list-inside text-dark-300 space-y-2 mt-4">
              <li><strong>Service Providers:</strong> Payment processors (Stripe), communication services (Twilio) that help us operate our business</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
            <p className="text-dark-300">
              We implement appropriate security measures to protect your personal information.
              Payment information is processed securely through Stripe and is never stored on our servers.
              However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Cookies and Tracking</h2>
            <p className="text-dark-300">
              Our website may use cookies and similar technologies to improve your browsing experience
              and analyze site traffic. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights</h2>
            <p className="text-dark-300">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-dark-300 space-y-2 mt-4">
              <li>Access the personal information we have about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information (subject to legal requirements)</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Children's Privacy</h2>
            <p className="text-dark-300">
              Our services are not directed to children under 18. We do not knowingly collect
              personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Changes to This Policy</h2>
            <p className="text-dark-300">
              We may update this Privacy Policy from time to time. Changes will be posted on this page
              with an updated "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Contact Us</h2>
            <p className="text-dark-300">
              If you have questions about this Privacy Policy or your personal information, please contact us at{' '}
              <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:underline">
                {config.phone}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
