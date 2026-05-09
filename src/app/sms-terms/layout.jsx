import { config } from '../../config'

export const metadata = {
  title: 'SMS Terms of Service',
  description: `SMS terms and conditions for ${config.businessName} text-message communications.`,
  alternates: { canonical: `${config.websiteUrl}/sms-terms` },
  robots: { index: false, follow: true },
}

export default function Layout({ children }) {
  return children
}
