// ============================================
// CITY-SPECIFIC SEO HOOKS
// ============================================
// Two purposes:
//   1. Differentiate the /dumpster-rental/[city] pages so Google doesn't
//      collapse them as near-duplicates of each other (real risk when 30
//      city pages share the same template).
//   2. Reward local searchers with copy that proves we actually know
//      their town — boosts conversion, not just rank.
//
// Each entry should mention something genuinely local (a landmark, a
// nickname, a notable employer, a road they all know). Three pieces per
// entry:
//   - hook:  one paragraph that opens the city page below the hero
//   - faq:   { q, a } unique to that city, emitted as FAQ schema
//   - notes: optional helpful tip (e.g., "narrow alleys downtown — we
//            scout placement on Google Earth before delivery")
//
// Cities not in this map fall back to generic copy. Adding entries over
// time is incremental SEO wins per city.
// ============================================

import { config } from '../config'

export const cityHooks = {
  'Mount Vernon': {
    hook: 'Whether you’re renovating a historic home near the Jefferson County Courthouse, cleaning out a property off Broadway, or running a contracting crew on a new build out toward I-57, we can usually get a dumpster on your driveway the same day.',
    faq: {
      q: 'Do I need a permit to put a dumpster on the street in Mount Vernon?',
      a: 'For dumpsters placed on your private driveway or property, no permit is required. If the dumpster needs to sit on a public street, Mount Vernon may require a temporary use permit — call us and we’ll help you sort it out before delivery.',
    },
  },
  'Fairfield': {
    hook: 'Fairfield is a straight shot east of our Mount Vernon yard on Route 15, so deliveries here happen fast — often the same day you call. Whether the project is a barn cleanout off Route 15 or a roof tear-off in town, we’ve got you covered.',
    faq: {
      q: 'How quickly can you deliver a dumpster in Fairfield?',
      a: `Fairfield is about 30 miles east of our Mount Vernon yard, well inside our ${config.serviceRadius}-mile service area. Same-day delivery is almost always available for orders placed before noon.`,
    },
  },
  'Centralia': {
    hook: 'From estate cleanouts off Broadway to roofing crews tearing off shingles on the older neighborhoods near Foundation Park, Centralia projects fit our 20- and 30-yard roll-offs perfectly. Delivery is a short run northwest from our Mount Vernon yard.',
    faq: {
      q: 'Can you deliver a dumpster to a Centralia rental property?',
      a: 'Yes — we work with landlords across Centralia for turn-over cleanouts. We can deliver and pick up without you being on site as long as we have placement instructions and someone authorized to sign for delivery.',
    },
  },
  'Salem': {
    hook: 'Salem sits a quick run up Route 37 from our base — delivery usually happens within hours of your call. We handle everything from in-town residential cleanouts to construction debris on jobs out toward Kinmundy.',
    faq: {
      q: 'Do you serve rural addresses outside Salem city limits?',
      a: 'Absolutely. Anywhere within our service radius — including rural Marion County addresses with long driveways or shared lanes — we can usually deliver. Just describe access in your booking notes and we’ll plan placement carefully.',
    },
  },
  'McLeansboro': {
    hook: 'We service McLeansboro and the surrounding Hamilton County area weekly. From cleanouts on older homes near the square to contractor jobs out toward Dale, our 20- and 30-yard roll-offs handle most projects.',
    faq: {
      q: 'How does delivery work to a McLeansboro address?',
      a: 'We deliver from our Mount Vernon yard. Plan for delivery the same day for morning orders or next day for afternoon orders.',
    },
  },
  'West Frankfort': {
    hook: 'West Frankfort projects — from porch tear-offs in the older neighborhoods to commercial cleanouts near the old mine sites — fit our roll-off dumpsters perfectly. We make the run down Route 37 regularly.',
    faq: {
      q: 'Do you deliver to West Frankfort on weekends?',
      a: 'Saturday delivery is available with advance notice — book by Friday afternoon. Sundays we’re closed for delivery but you can still book online for Monday pickup.',
    },
  },
  'Benton': {
    hook: 'Benton sits at the southern edge of our service area. Whether the job is a roof tear-off, an estate cleanout, or construction debris from a build out toward Rend Lake, we can usually deliver same-day if you call before noon.',
    faq: {
      q: 'What size dumpster do most Benton homeowners rent?',
      a: 'Our 20-yard dumpster handles 90% of residential cleanouts in Benton — about 8 pickup-truck loads of debris. Bigger remodels or roof tear-offs typically need the 30-yard.',
    },
  },
  'Nashville': {
    hook: 'Nashville is on the west edge of our service area. We make the run up I-64 routinely for residential cleanouts, garage demos, and contractor jobs.',
    faq: {
      q: 'How far in advance should I book a Nashville delivery?',
      a: 'For weekday delivery, 24 hours notice is usually plenty. For Saturday, book by Thursday to lock in a time window.',
    },
  },
  'Flora': {
    hook: 'Flora projects on the north end of our service area — Clay County cleanouts, farm and barn demolition, contractor work — all fit our roll-offs. Delivery from our Mount Vernon yard is straightforward.',
    faq: {
      q: 'Can you handle agricultural / farm cleanouts in Flora?',
      a: 'Yes. Old fencing, scrap lumber, general farm debris all go in a 30-yard. Tires, batteries, and chemicals do not — give us a call and we’ll help you figure out the right disposal route for those.',
    },
  },
}

export function getCityHook(townName) {
  return cityHooks[townName] || null
}
