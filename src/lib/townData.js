// ============================================
// SERVICE TOWN GEOGRAPHY
// ============================================
// Real coordinates + county for every town in config.serviceTowns, geocoded
// from OpenStreetMap (Sept 2026). City pages use this to show TRUE distances
// and nearest neighbors instead of made-up numbers, and to give each page
// facts that actually differ from town to town.
//
// Adding a town: add it to config.serviceTowns AND here (lat/lng from
// openstreetmap.org, county without the word "County").
// ============================================

export const TOWNS = {
  'Fairfield': { lat: 38.3789, lng: -88.3598, county: 'Wayne' },
  'Mount Vernon': { lat: 38.3173, lng: -88.9031, county: 'Jefferson' },
  'Wayne City': { lat: 38.3453, lng: -88.5878, county: 'Wayne' },
  'Cisne': { lat: 38.5159, lng: -88.4375, county: 'Wayne' },
  'Albion': { lat: 38.3775, lng: -88.0561, county: 'Edwards' },
  'Crossville': { lat: 38.1617, lng: -88.0653, county: 'White' },
  'Carmi': { lat: 38.0909, lng: -88.1586, county: 'White' },
  'McLeansboro': { lat: 38.0934, lng: -88.5356, county: 'Hamilton' },
  'Enfield': { lat: 38.0995, lng: -88.3375, county: 'White' },
  'Norris City': { lat: 37.9812, lng: -88.3292, county: 'White' },
  'Benton': { lat: 37.9967, lng: -88.9201, county: 'Franklin' },
  'West Frankfort': { lat: 37.8978, lng: -88.9315, county: 'Franklin' },
  'Sesser': { lat: 38.0917, lng: -89.0504, county: 'Franklin' },
  'Christopher': { lat: 37.9726, lng: -89.0534, county: 'Franklin' },
  'Nashville': { lat: 38.3435, lng: -89.381, county: 'Washington' },
  'Centralia': { lat: 38.525, lng: -89.1334, county: 'Marion' },
  'Sandoval': { lat: 38.6156, lng: -89.1142, county: 'Marion' },
  'Odin': { lat: 38.6173, lng: -89.0523, county: 'Marion' },
  'Salem': { lat: 38.627, lng: -88.9456, county: 'Marion' },
  'Kinmundy': { lat: 38.7734, lng: -88.8467, county: 'Marion' },
  'Flora': { lat: 38.6689, lng: -88.4856, county: 'Clay' },
  'Louisville': { lat: 38.7723, lng: -88.5025, county: 'Clay' },
  'Clay City': { lat: 38.6887, lng: -88.3542, county: 'Clay' },
  'Xenia': { lat: 38.6359, lng: -88.6348, county: 'Clay' },
  'Woodlawn': { lat: 38.33, lng: -89.0326, county: 'Jefferson' },
  'Bluford': { lat: 38.3309, lng: -88.7259, county: 'Jefferson' },
  'Bonnie': { lat: 38.2028, lng: -88.9034, county: 'Jefferson' },
  'Dix': { lat: 38.4417, lng: -88.9376, county: 'Jefferson' },
  'Opdyke': { lat: 38.2598, lng: -88.7906, county: 'Jefferson' },
  'Waltonville': { lat: 38.2089, lng: -89.039, county: 'Jefferson' },
  'Ina': { lat: 38.1512, lng: -88.904, county: 'Jefferson' },
  'Nason': { lat: 38.1762, lng: -88.9676, county: 'Jefferson' },
  'Texico': { lat: 38.4395, lng: -88.897, county: 'Jefferson' },
  'Belle Rive': { lat: 38.2328, lng: -88.7406, county: 'Jefferson' },
  'Kell': { lat: 38.4912, lng: -88.9065, county: 'Marion' },
  'Iuka': { lat: 38.6162, lng: -88.7903, county: 'Marion' },
  'Farina': { lat: 38.8342, lng: -88.7723, county: 'Fayette' },
}

const BASE_TOWN = 'Mount Vernon'

function toRad(d) {
  return (d * Math.PI) / 180
}

// Straight-line ("as the crow flies") distance in miles. Driving distance
// runs roughly 15-25% longer, so copy always says "about".
export function milesBetween(a, b) {
  const A = TOWNS[a]
  const B = TOWNS[b]
  if (!A || !B) return null
  const R = 3958.8
  const dLat = toRad(B.lat - A.lat)
  const dLng = toRad(B.lng - A.lng)
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(A.lat)) * Math.cos(toRad(B.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Compass direction of `to` as seen from `from`, e.g. "northeast".
export function directionFrom(from, to) {
  const A = TOWNS[from]
  const B = TOWNS[to]
  if (!A || !B) return null
  const y = Math.sin(toRad(B.lng - A.lng)) * Math.cos(toRad(B.lat))
  const x = Math.cos(toRad(A.lat)) * Math.sin(toRad(B.lat)) -
    Math.sin(toRad(A.lat)) * Math.cos(toRad(B.lat)) * Math.cos(toRad(B.lng - A.lng))
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  const names = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
  return names[Math.round(bearing / 45) % 8]
}

// Everything a city page needs about a town's location, or null if unknown.
export function getTownGeo(town) {
  const t = TOWNS[town]
  if (!t) return null
  const miles = milesBetween(BASE_TOWN, town)
  return {
    ...t,
    isBase: town === BASE_TOWN,
    milesFromBase: Math.round(miles),
    directionFromBase: miles < 1 ? null : directionFrom(BASE_TOWN, town),
  }
}

// Closest other service towns by real distance.
export function getNearestTowns(town, count = 6) {
  if (!TOWNS[town]) return []
  return Object.keys(TOWNS)
    .filter(t => t !== town)
    .map(t => ({ town: t, miles: Math.round(milesBetween(town, t)) }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, count)
}

// Other service towns in the same county, nearest first.
export function getSameCountyTowns(town) {
  const t = TOWNS[town]
  if (!t) return []
  return Object.keys(TOWNS)
    .filter(o => o !== town && TOWNS[o].county === t.county)
    .sort((a, b) => milesBetween(town, a) - milesBetween(town, b))
}
