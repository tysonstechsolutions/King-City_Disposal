import { config } from '../../../config'
import { getService } from '../../../lib/services'
import { renderOG, ogConfig } from '../../../lib/ogTemplate'

export const runtime = ogConfig.runtime
export const dynamic = ogConfig.dynamic
export const alt = 'Dumpster rental service — King City Disposal'
export const size = ogConfig.size
export const contentType = ogConfig.contentType

// No generateStaticParams — see comment in dumpster-rental opengraph-image.

export default async function ServiceOG({ params }) {
  const svc = getService(params.type, {
    city: config.address.city,
    phone: config.phone,
    business: config.businessName,
  })
  if (!svc) {
    return renderOG({
      eyebrow: 'Services',
      headline: 'Dumpster',
      accentHeadline: 'Rental',
      subhead: `Serving ${config.address.city} and Southern Illinois.`,
    })
  }
  return renderOG({
    eyebrow: 'Service',
    headline: svc.label,
    accentHeadline: 'Dumpsters',
    subhead: `${svc.title}. Same-day delivery in ${config.address.city} and Southern Illinois.`,
    footerNote: `From $${config.dumpsters[0].pricing['10-day']}`,
  })
}
