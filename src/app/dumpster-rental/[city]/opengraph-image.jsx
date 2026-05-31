import { config } from '../../../config'
import { renderOG, ogConfig } from '../../../lib/ogTemplate'

export const runtime = ogConfig.runtime
export const dynamic = ogConfig.dynamic
export const alt = 'Dumpster rental — King City Disposal'
export const size = ogConfig.size
export const contentType = ogConfig.contentType

// No generateStaticParams here — with force-dynamic, OG images render
// on first request and edge-cache. Prerendering on Windows fails because
// @vercel/og's fileURLToPath chokes on paths-with-spaces. Generating
// on-demand is fine: each city's OG image is cached after the first hit.
function slugify(town) {
  return town
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function unslugify(slug) {
  const cleanSlug = slug.replace(/-il$/, '')
  const town = config.serviceTowns.find((t) => slugify(t) === cleanSlug)
  return town || null
}

export default async function CityOG({ params }) {
  const townName = unslugify(params.city) || 'Southern Illinois'
  const startingPrice = config.dumpsters[0].pricing['10-day']

  return renderOG({
    eyebrow: `${townName}, IL`,
    headline: 'Dumpster Rental',
    accentHeadline: `in ${townName}`,
    subhead: `Same-day delivery from $${startingPrice}. 20 & 30 yard roll-offs delivered straight to your driveway.`,
    footerNote: 'No hidden fees',
  })
}
