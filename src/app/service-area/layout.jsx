import { config } from '../../config'

export const metadata = {
  title: `Service Area - ${config.serviceRadius} Mile Delivery Radius | ${config.businessName}`,
  description: `${config.businessName} delivers dumpsters within a ${config.serviceRadius}-mile radius of ${config.address.city}, IL. View our service area map and list of cities we serve.`,
  alternates: {
    canonical: `${config.websiteUrl}/service-area`,
  },
}

export default function ServiceAreaLayout({ children }) {
  return children
}
