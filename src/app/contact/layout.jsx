import { config } from '../../config'
import BreadcrumbSchema from '../../components/BreadcrumbSchema'

export const metadata = {
  title: `Contact Us - Get a Quote | ${config.businessName}`,
  description: `Contact ${config.businessName} for dumpster rental quotes, questions, or to schedule delivery. Call ${config.phone} or fill out our contact form. Real people answer the phone — typical response under 1 hour during business hours.`,
  alternates: {
    canonical: `${config.websiteUrl}/contact`,
  },
  openGraph: {
    title: `Contact ${config.businessName} — Real People, Fast Response`,
    description: `Get a dumpster quote in Southern Illinois. Call ${config.phone} or fill out our contact form.`,
    url: `${config.websiteUrl}/contact`,
    type: 'website',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: `Contact ${config.businessName}` }],
  },
}

export default function ContactLayout({ children }) {
  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Contact', path: '/contact' }]} />
      {children}
    </>
  )
}
