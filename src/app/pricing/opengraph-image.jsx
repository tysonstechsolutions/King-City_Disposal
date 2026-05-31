import { config } from '../../config'
import { renderOG, ogConfig } from '../../lib/ogTemplate'

export const runtime = ogConfig.runtime
export const dynamic = ogConfig.dynamic
export const alt = `${config.businessName} pricing — dumpster rentals from $${config.dumpsters[0].pricing['10-day']}`
export const size = ogConfig.size
export const contentType = ogConfig.contentType

export default async function PricingOG() {
  const startingPrice = config.dumpsters[0].pricing['10-day']
  return renderOG({
    eyebrow: 'Pricing',
    headline: `From $${startingPrice}`,
    accentHeadline: '10-Day Rental',
    subhead: 'No hidden fees, no surprises. Delivery, pickup, and disposal up to weight limit all included.',
    footerNote: '20-yard & 30-yard available',
  })
}
