import { config } from '../../config'

export const metadata = {
  title: 'SMS Opt-In',
  description: `Information about how ${config.businessName} uses SMS to communicate with customers about dumpster rental bookings, deliveries, and pickups.`,
  alternates: { canonical: `${config.websiteUrl}/sms-opt-in` },
  // Compliance/utility page — no value in ranking it.
  robots: { index: false, follow: true },
}

export default function Layout({ children }) {
  return children
}
