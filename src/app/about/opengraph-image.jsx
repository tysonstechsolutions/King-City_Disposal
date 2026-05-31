import { config } from '../../config'
import { renderOG, ogConfig } from '../../lib/ogTemplate'

export const runtime = ogConfig.runtime
export const dynamic = ogConfig.dynamic
export const alt = `About ${config.businessName} — locally owned in ${config.address.city}, IL`
export const size = ogConfig.size
export const contentType = ogConfig.contentType

export default async function AboutOG() {
  return renderOG({
    eyebrow: 'About Us',
    headline: 'Locally Owned',
    accentHeadline: 'Family Operated',
    subhead: `Real people, real phones. Serving ${config.serviceTowns.length}+ communities across Southern Illinois.`,
    footerNote: `${config.fleet['20yd'] + config.fleet['30yd']} dumpster fleet`,
  })
}
