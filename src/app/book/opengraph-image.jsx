import { config } from '../../config'
import { renderOG, ogConfig } from '../../lib/ogTemplate'

export const runtime = ogConfig.runtime
export const dynamic = ogConfig.dynamic
export const alt = `Book a dumpster online with ${config.businessName}`
export const size = ogConfig.size
export const contentType = ogConfig.contentType

export default async function BookOG() {
  return renderOG({
    eyebrow: 'Book Online',
    headline: 'Reserve in',
    accentHeadline: 'Under 2 Minutes',
    subhead: `Pick a size, drop a pin on the map for placement, pay securely. Same-day delivery in ${config.address.city} and ${config.serviceTowns.length}+ Southern Illinois towns.`,
    footerNote: 'Same-day delivery available',
  })
}
