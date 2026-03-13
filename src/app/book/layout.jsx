import { config } from '../../config'

export const metadata = {
  title: `Book a Dumpster - Online Booking | ${config.businessName}`,
  description: `Book your dumpster rental online in minutes. Choose your size, pick a delivery date, and we'll deliver to ${config.address.city}, IL and surrounding areas. Starting at $${config.dumpsters[0]?.pricing['10-day']}.`,
  alternates: {
    canonical: `${config.websiteUrl}/book`,
  },
}

export default function BookLayout({ children }) {
  return children
}
