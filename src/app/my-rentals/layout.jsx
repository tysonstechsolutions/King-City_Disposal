import { config } from '../../config'

// Customer self-service portal — fetches a customer's rentals by phone
// number. Don't want Google indexing this; users land here via direct
// link from confirmation SMS or by navigating from the footer.
export const metadata = {
  title: 'My Rentals',
  description: `Check the status of your dumpster rental with ${config.businessName}. Look up by phone number.`,
  robots: { index: false, follow: false },
}

export default function Layout({ children }) {
  return children
}
