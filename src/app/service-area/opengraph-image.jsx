import { config } from '../../config'
import { renderOG, ogConfig } from '../../lib/ogTemplate'

export const runtime = ogConfig.runtime
export const dynamic = ogConfig.dynamic
export const alt = `${config.businessName} service area — Southern Illinois`
export const size = ogConfig.size
export const contentType = ogConfig.contentType

export default async function ServiceAreaOG() {
  return renderOG({
    eyebrow: 'Service Area',
    headline: `${config.serviceTowns.length}+ Towns`,
    accentHeadline: 'Southern Illinois',
    subhead: `${config.serviceRadius}-mile delivery radius centered on Fairfield, IL — from Centralia to Carmi and everywhere in between.`,
    footerNote: 'Same-day delivery available',
  })
}
