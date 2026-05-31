import { config } from '../../config'
import { renderOG, ogConfig } from '../../lib/ogTemplate'

export const runtime = ogConfig.runtime
export const dynamic = ogConfig.dynamic
export const alt = `Dumpster sizes — 20 and 30 yard roll-offs from ${config.businessName}`
export const size = ogConfig.size
export const contentType = ogConfig.contentType

export default async function DumpstersOG() {
  return renderOG({
    eyebrow: 'Dumpster Sizes',
    headline: '20-Yard or',
    accentHeadline: '30-Yard?',
    subhead: 'Side-by-side comparison of dimensions, weight limits, and what each size best handles.',
    footerNote: `Fleet of ${config.fleet['20yd'] + config.fleet['30yd']} dumpsters`,
  })
}
