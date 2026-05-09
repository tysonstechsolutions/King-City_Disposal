// Stripe checkout success page — only valid in a specific session, no SEO value.
// noindex prevents Google from picking up stale snapshots that show
// "Payment Successful" to people searching for the brand.
export const metadata = {
  title: 'Payment Successful',
  robots: { index: false, follow: false },
}

export default function Layout({ children }) {
  return children
}
