import { config } from '../../config'

export const metadata = {
  title: 'Terms of Service',
  description: `Terms of Service for ${config.businessName} dumpster rental services.`,
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-neutral-900 mb-8">Terms of Service</h1>

        <div className="prose prose-neutral prose-lg max-w-none">
          <p className="text-neutral-500 mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-neutral-600">
              By using {config.businessName}&apos;s dumpster rental services, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">2. Rental Agreement</h2>
            <p className="text-neutral-600 mb-4">
              When you book a dumpster rental, you agree to:
            </p>
            <ul className="list-disc list-inside text-neutral-600 space-y-2">
              <li>Provide accurate delivery address and contact information</li>
              <li>Ensure the placement location is accessible for delivery and pickup</li>
              <li>Not exceed the weight limit specified for your dumpster size</li>
              <li>Not dispose of prohibited items (hazardous materials, chemicals, tires, batteries, etc.)</li>
              <li>Return the dumpster in reasonable condition</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">3. Prohibited Items</h2>
            <p className="text-neutral-600 mb-4">
              The following items are NOT allowed in our dumpsters:
            </p>
            <ul className="list-disc list-inside text-neutral-600 space-y-2">
              <li>Hazardous materials and chemicals</li>
              <li>Paint, oils, and solvents</li>
              <li>Batteries and electronics</li>
              <li>Tires</li>
              <li>Appliances containing Freon</li>
              <li>Medical waste</li>
              <li>Asbestos</li>
              <li>Hot ashes or coals</li>
            </ul>
            <p className="text-neutral-600 mt-4">
              Additional fees will be charged if prohibited items are found in your dumpster.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">4. Pricing and Payment</h2>
            <p className="text-neutral-600">
              Rental prices include delivery, pickup, and disposal within the specified weight limit.
              Additional charges may apply for overage weight, extended rental periods, or special disposal items
              (mattresses, furniture, etc.). Payment is due at the time of booking unless otherwise arranged.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">5. Rental Period</h2>
            <p className="text-neutral-600">
              Rental periods begin on the delivery date. Standard rental period is 10 days.
              Extensions are available at a weekly rate. Please contact us if you need to extend your rental.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">6. Cancellation Policy</h2>
            <p className="text-neutral-600">
              Cancellations made at least 24 hours before scheduled delivery will receive a full refund.
              Cancellations made less than 24 hours before delivery may be subject to a cancellation fee.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">7. Liability</h2>
            <p className="text-neutral-600">
              {config.businessName} is not responsible for damage to driveways, lawns, or other surfaces
              that may occur during normal delivery and pickup operations. The customer is responsible for
              ensuring the placement area can support the weight of the dumpster and its contents.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">8. Contact Us</h2>
            <p className="text-neutral-600">
              If you have questions about these Terms of Service, please contact us at{' '}
              <a href={`tel:${config.phoneRaw}`} className="text-primary-600 hover:underline">
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
