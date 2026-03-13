import { config } from '../../config'

export const metadata = {
  title: `Contact Us - Get a Quote | ${config.businessName}`,
  description: `Contact ${config.businessName} for dumpster rental quotes, questions, or to schedule delivery. Call ${config.phone} or fill out our contact form. Real people answer!`,
  alternates: {
    canonical: `${config.websiteUrl}/contact`,
  },
}

export default function ContactLayout({ children }) {
  return children
}
