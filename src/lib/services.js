// ============================================
// SERVICE-SPECIFIC LANDING PAGES — DATA
// ============================================
// Each service maps to a /services/<slug> page that targets a distinct
// search intent. Google ranks pages, not sites — having one page per
// service type is the difference between ranking for "construction
// dumpster rental" and not ranking at all.
//
// Each entry below produces:
//   - <title>, <meta description>, OG metadata (per-page, not just inherited)
//   - H1 with the target keyword
//   - Service + BreadcrumbList JSON-LD
//   - Three rich content sections (intro, what-fits, why-us)
//   - Service-specific FAQ rendered with FAQPage schema
//
// To add a new service: copy a block, swap the slug + content, that's it.

export const services = [
  {
    slug: 'residential',
    label: 'Residential',
    icon: 'Home',
    title: 'Residential Dumpster Rental',
    h1: 'Residential Dumpster Rentals in {city}, IL',
    metaTitle: 'Residential Dumpster Rental in {city}, IL | From $475',
    metaDescription:
      'Affordable residential dumpster rental in {city}, IL for garage cleanouts, basement clear-outs, and home projects. 20 & 30 yard sizes from $475. Book online or call {phone}.',
    intent: 'home cleanouts, garage, basement, attic, moving',
    intro:
      'Whether you’re tackling a long-overdue garage purge, clearing out a basement, or prepping for a move, a residential dumpster from {business} makes the job dead simple. Drop it in your driveway, fill it on your schedule, and we haul it away.',
    whatFits: [
      'Garage and basement junk',
      'Old furniture and mattresses',
      'Yard debris and small renovation waste',
      'Boxes, clothes, household clutter',
      'Carpet, padding, flooring',
      'Up to 4 tons of debris (varies by size)',
    ],
    whyUs: [
      'Same-day or next-day delivery in {city} and surrounding areas',
      'Flat pricing — what you see online is what you pay',
      '10-day rental included; extend daily if you need more time',
      'Locally owned, real humans on the phone',
    ],
    faq: [
      {
        q: 'How big a dumpster do I need for a garage cleanout?',
        a: 'For a one-car garage cleanout, a 20-yard dumpster is usually plenty (about 8 pickup-truck loads of debris). Two-car garages or full estate cleanouts often need the 30-yard. If you’re unsure, call {phone} and we’ll size it for you.',
      },
      {
        q: 'Can I put the dumpster on my driveway?',
        a: 'Yes — driveway placement is the most common option and works for almost every residential job. We bring boards if you’re worried about the dumpster marking your driveway. Just let us know when you book.',
      },
      {
        q: 'How long can I keep it?',
        a: 'Standard rental is 10 days. Need more time? Extensions are available daily — just text or call before pickup day.',
      },
    ],
  },
  {
    slug: 'construction',
    label: 'Construction',
    icon: 'Hammer',
    title: 'Construction Dumpster Rental',
    h1: 'Construction & Contractor Dumpster Rentals in {city}, IL',
    metaTitle: 'Construction Dumpster Rental in {city}, IL | Same Day',
    metaDescription:
      'Construction debris dumpsters for contractors, builders, and remodels in {city}, IL. 20 & 30 yard roll-offs, fast delivery, contractor-friendly billing. Call {phone}.',
    intent: 'contractor, jobsite, demolition, remodel, framing, drywall',
    intro:
      'Builders and contractors need a dumpster company that shows up when promised and gets out of the way. {business} delivers clean roll-offs to your jobsite, swaps when needed, and hauls fast so you can keep your crew moving.',
    whatFits: [
      'Drywall, lumber, and framing scraps',
      'Demolition debris',
      'Flooring, tile, and underlayment',
      'Insulation and fixtures',
      'Concrete and brick (call about weight limits)',
      'General construction waste',
    ],
    whyUs: [
      'Net billing for repeat contractors — call to set up an account',
      'Same-day swap-outs available on most jobs',
      'Driveway-safe placement, jobsite parking, or street with permit',
      'Drivers who know how to spot dumpsters in tight builds',
    ],
    faq: [
      {
        q: 'Do you offer swap-outs on multi-day projects?',
        a: 'Yes. On big builds we’ll swap a full dumpster for an empty one same-day or next-day depending on schedule. Just text the word SWAP and your jobsite address.',
      },
      {
        q: 'Can I rent multiple dumpsters at once?',
        a: 'Absolutely. Lots of contractors run 2 or 3 simultaneously on bigger jobs. Call {phone} and we’ll work out pricing.',
      },
      {
        q: 'What about heavy materials like concrete and brick?',
        a: 'We can take concrete, brick, and dirt — but heavy materials count fast against the weight limit. Call us first; we may suggest a smaller dumpster used for heavy debris only.',
      },
    ],
  },
  {
    slug: 'roofing',
    label: 'Roofing',
    icon: 'Building',
    title: 'Roofing Dumpster Rental',
    h1: 'Roofing Dumpster Rentals in {city}, IL',
    metaTitle: 'Roofing Dumpster Rental in {city}, IL | Tear-Off Ready',
    metaDescription:
      'Roof tear-off dumpsters in {city}, IL. Built for shingles, underlayment, and roofing debris. Quick turnaround for roofing crews. From $475. Call {phone}.',
    intent: 'roof, shingles, tear-off, roofer, asphalt',
    intro:
      'Roofing tear-offs generate a lot of weight in a hurry. Asphalt shingles can fill a 20-yard fast, so we’ll help you pick the right size and get it on-site before your crew shows up.',
    whatFits: [
      'Asphalt and composite shingles',
      'Underlayment and felt paper',
      'Wood shake and torn-off decking',
      'Flashing and trim metal',
      'Nails, fasteners, gutter scraps',
    ],
    whyUs: [
      'Sized for tear-offs — we’ll recommend 20 vs 30 yard based on roof size',
      'Same-day delivery for emergency leak repairs',
      'Flat rate including standard shingle weight',
      'We know roofers’ schedules — we work around them, not the other way around',
    ],
    faq: [
      {
        q: 'How many squares of shingles fit in a 20-yard dumpster?',
        a: 'A 20-yard typically holds about 30 squares (3,000 sq ft of roof) of standard 3-tab asphalt shingles. Architectural or laminated shingles weigh more — go up to a 30-yard if you’re on the edge.',
      },
      {
        q: 'Can I put the dumpster close to the house for tear-off?',
        a: 'Yes — the closer the better. We can usually get within 10 feet of the eave. Tell us about overhead wires or low branches when you book.',
      },
      {
        q: 'Do you take wet shingles?',
        a: 'Yes. Just be aware: wet shingles weigh significantly more than dry ones, so factor that into your size choice.',
      },
    ],
  },
  {
    slug: 'junk-removal',
    label: 'Junk Removal',
    icon: 'Trash2',
    title: 'Junk Removal Dumpster',
    h1: 'Junk Removal Dumpster Rentals in {city}, IL',
    metaTitle: 'Junk Removal Dumpster Rental in {city}, IL',
    metaDescription:
      'Get rid of household junk, old furniture, and clutter with a dumpster from {business}. Cheaper than haul-off services for big cleanouts in {city}, IL. Call {phone}.',
    intent: 'junk, clutter, decluttering, hoarder cleanout, clean-out',
    intro:
      'When you’ve got more junk than a few trash cans can handle, renting a dumpster is almost always cheaper than hiring a haul-off service by the truckload — and you can take your time loading it on your schedule.',
    whatFits: [
      'Old furniture, mattresses, box springs',
      'Appliances (call about freon items)',
      'Boxes, clothes, toys, household items',
      'Garage and shed contents',
      'Storage unit cleanouts',
    ],
    whyUs: [
      'Often cheaper than per-truckload haul-off services',
      'Load it yourself on your schedule — no booking a 4-hour window',
      'Fits in most driveways',
      'Locally owned — call {phone} with questions, real humans answer',
    ],
    faq: [
      {
        q: 'Is it cheaper to rent a dumpster or hire a junk-haul service?',
        a: 'For anything more than a single pickup-truck load, a rental dumpster is almost always cheaper. Junk-haul services typically charge $300-700 per truckload; our 20-yard rental is $475 and holds about 8 pickup-truck loads.',
      },
      {
        q: 'What can’t go in?',
        a: 'No paint, fuel, oil, batteries, tires, or hazardous waste. Most everything else is fair game. See our FAQ for the full list.',
      },
      {
        q: 'Will you help load it?',
        a: 'We don’t offer loading service, but we can drop the dumpster low to the ground for easier loading. Mention it when you book.',
      },
    ],
  },
  {
    slug: 'concrete-disposal',
    label: 'Concrete & Heavy Debris',
    icon: 'Layers',
    title: 'Concrete & Heavy Debris Dumpster',
    h1: 'Concrete & Heavy Debris Dumpsters in {city}, IL',
    metaTitle: 'Concrete Dumpster Rental in {city}, IL',
    metaDescription:
      'Dumpsters for concrete, brick, dirt, and heavy debris in {city}, IL. Sized correctly for weight limits. Call {phone} so we can quote it right.',
    intent: 'concrete, brick, dirt, gravel, heavy material',
    intro:
      'Heavy materials like concrete, brick, dirt, and gravel hit weight limits fast. We’ll help you pick the right size for the job — usually a smaller dumpster used at full weight beats a bigger one half-full at twice the disposal cost.',
    whatFits: [
      'Broken concrete (slabs, walkways, driveways)',
      'Brick, block, and stone',
      'Clean fill dirt',
      'Gravel and aggregate',
      'Asphalt (call first)',
    ],
    whyUs: [
      'We size by weight, not just volume — saves you money',
      'Most concrete-only loads work best in a 20-yard',
      'Driveway-safe placement, even loaded',
      'Call {phone} for a custom quote',
    ],
    faq: [
      {
        q: 'How much concrete fits in a dumpster?',
        a: 'A 20-yard can hold about 10 tons of concrete loaded only to halfway full. Filling it any higher exceeds the weight a roll-off truck can legally haul.',
      },
      {
        q: 'Can I mix concrete with other debris?',
        a: 'Generally no — landfills charge more when concrete is mixed with general waste. Pure concrete loads can often be recycled at a lower disposal rate, which we pass on.',
      },
      {
        q: 'Do you take dirt?',
        a: 'Yes, clean fill dirt only — no contaminated soil, sod with grass, or root balls.',
      },
    ],
  },
  {
    slug: 'yard-waste',
    label: 'Yard Waste',
    icon: 'TreeDeciduous',
    title: 'Yard Waste Dumpster',
    h1: 'Yard Waste Dumpster Rental in {city}, IL',
    metaTitle: 'Yard Waste Dumpster Rental in {city}, IL',
    metaDescription:
      'Dumpsters for yard cleanups, brush, branches, and storm cleanup in {city}, IL. Drop in driveway, fill on your time, we haul. Call {phone}.',
    intent: 'yard, brush, branches, storm cleanup, landscaping',
    intro:
      'Big yard project, storm cleanup, or just a season’s worth of brush piling up? A dumpster lets you clear it all in one shot instead of dragging bag after bag to the curb.',
    whatFits: [
      'Brush, branches, and limbs',
      'Leaves, grass clippings, and mulch',
      'Stumps (call about size)',
      'Garden waste and sod',
      'Storm debris',
    ],
    whyUs: [
      'Faster than weekly bag pickup for big jobs',
      'Lockable lid available — keeps neighborhood pets out',
      'We can drop it under low branches if needed',
      'Family-owned, southern IL based — we know the storms here',
    ],
    faq: [
      {
        q: 'Can I put a tree stump in?',
        a: 'Small stumps and root balls under 2 feet across, yes. Larger stumps usually need a separate haul or a stump-grinding service first.',
      },
      {
        q: 'What about storm cleanup after a tornado or wind event?',
        a: 'We prioritize storm cleanups — call {phone} and we’ll get something out same-day if we can. Pricing is the same as standard rentals.',
      },
      {
        q: 'Do you offer a yard-waste discount?',
        a: 'Yard waste pricing matches our standard rates because it counts the same against the weight limit at the dump. Big advantage: clean yard loads rarely hit the weight cap.',
      },
    ],
  },
  {
    slug: 'estate-cleanout',
    label: 'Estate Cleanout',
    icon: 'Box',
    title: 'Estate Cleanout Dumpster',
    h1: 'Estate Cleanout Dumpsters in {city}, IL',
    metaTitle: 'Estate Cleanout Dumpster in {city}, IL | Compassionate Help',
    metaDescription:
      'Estate cleanout dumpster rental in {city}, IL. Compassionate, flexible service for difficult cleanouts. 20 & 30 yard sizes. Call {phone}.',
    intent: 'estate, deceased, hoarder, foreclosure, large cleanout',
    intro:
      'Estate cleanouts are hard. We’ve helped a lot of families through them and we’ll work with your timing, not the other way around. Pick a delivery day, take as long as you need to load, and we’ll be there to take it away when you’re ready.',
    whatFits: [
      'Furniture, clothes, household items',
      'Appliances and electronics',
      'Boxes of papers and personal items',
      'Damaged carpet and flooring',
      'Years of accumulated belongings',
    ],
    whyUs: [
      'Flexible scheduling — extend daily if you need more time',
      'We can place dumpsters with a phone call instead of a long form',
      'Bigger 30-yard sizes for full-house cleanouts',
      'Local, family-owned — we’ll talk through your timing',
    ],
    faq: [
      {
        q: 'How long can I keep it for an estate cleanout?',
        a: 'Standard is 10 days but extensions are easy — most estate jobs run 2-4 weeks. Just text or call before each pickup deadline and we’ll keep it as long as you need.',
      },
      {
        q: 'What size do I need for a whole-house cleanout?',
        a: 'A full 1,500–2,000 sq ft house cleanout typically fills a 30-yard. Larger houses or anything with hoarding usually needs a 30-yard plus a swap-out, or two 30-yards.',
      },
      {
        q: 'Can I keep some items on the dumpster for last-minute decisions?',
        a: 'You bet. Loading is on your schedule. Take your time.',
      },
    ],
  },
]

// Get a single service by slug, with template substitutions filled in.
// Pass `vars = { city, phone, business }` and the strings come back ready
// to render. Falls back to the city in config if not provided.
export function getService(slug, vars = {}) {
  const svc = services.find(s => s.slug === slug)
  if (!svc) return null
  return resolveServiceVars(svc, vars)
}

export function getAllServices(vars = {}) {
  return services.map(s => resolveServiceVars(s, vars))
}

function resolveServiceVars(svc, vars) {
  const sub = (str) =>
    typeof str === 'string'
      ? str
          .replace(/\{city\}/g, vars.city || 'Mount Vernon')
          .replace(/\{phone\}/g, vars.phone || '(618) 231-8481')
          .replace(/\{business\}/g, vars.business || 'King City Disposal')
      : str

  return {
    ...svc,
    h1: sub(svc.h1),
    metaTitle: sub(svc.metaTitle),
    metaDescription: sub(svc.metaDescription),
    intro: sub(svc.intro),
    whatFits: svc.whatFits.map(sub),
    whyUs: svc.whyUs.map(sub),
    faq: svc.faq.map(f => ({ q: sub(f.q), a: sub(f.a) })),
  }
}
