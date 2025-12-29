import { config } from '../../config'
import Script from 'next/script'
import Link from 'next/link'
import { 
  ChevronDown, 
  AlertTriangle, 
  Phone, 
  HelpCircle,
  DollarSign,
  Truck,
  Clock,
  Scale,
  Ban
} from 'lucide-react'
import FAQAccordion from './FAQAccordion'

// ============================================
// METADATA
// ============================================
export const metadata = {
  title: `FAQ - Dumpster Rental Questions Answered`,
  description: `Common questions about dumpster rentals in ${config.address.city}, IL. Learn about pricing, sizes, prohibited items, weight limits, and rental duration. ${config.phone}`,
  alternates: {
    canonical: `${config.websiteUrl}/faq`,
  },
}

// ============================================
// FAQ DATA - Organized by category
// ============================================
const faqCategories = [
  {
    name: 'Pricing & Payment',
    icon: DollarSign,
    questions: [
      {
        q: 'What does the rental price include?',
        a: `Your rental price includes delivery, pickup, and disposal fees up to your included weight limit. There are no hidden fees — what you see is what you pay (unless you exceed the weight limit or keep the dumpster longer than your rental period).`
      },
      {
        q: 'What if I go over the weight limit?',
        a: `We'll weigh the dumpster at the dump. If you're over your included tonnage, we charge the overage rate per ton. For example, our 20-yard dumpster includes ${config.dumpsters[0]?.weightIncluded || '3 tons'}. Go over by 1 ton, and you pay an extra $${config.dumpsters[0]?.overageRate || '70'}. We always let you know before charging.`
      },
      {
        q: 'Do you require a deposit?',
        a: `We collect payment when you book. No separate deposit required. If you need to cancel, just give us 24 hours notice and we'll refund you in full.`
      },
      {
        q: 'What payment methods do you accept?',
        a: `We accept all major credit cards, debit cards, and cash. Card payments are due at booking. Cash payments are due upon delivery.`
      },
      {
        q: 'How much does a dumpster cost in ${config.address.city}?',
        a: `Our dumpster rentals start at $${config.dumpsters[0]?.pricing['3-day'] || '425'} for a 3-day rental. The 7-day rental is $${config.dumpsters[0]?.pricing['7-day'] || '485'}. Price includes delivery, pickup, and disposal up to the included weight limit. Check our pricing page for current rates on all sizes.`
      },
    ]
  },
  {
    name: 'Rental Duration',
    icon: Clock,
    questions: [
      {
        q: 'How long can I keep the dumpster?',
        a: `Our standard rental periods are 3 days or 7 days. Need more time? No problem — you can extend your rental at a daily rate ($${config.dumpsters[0]?.dailyExtension || '20'}/day depending on size).`
      },
      {
        q: 'What if I fill it up before my rental period ends?',
        a: `Just give us a call or text and we'll come pick it up early! We're happy to accommodate your schedule. You won't get a refund for unused days, but you won't be charged extra either.`
      },
      {
        q: 'Can I extend my rental?',
        a: `Absolutely! Just call or text us before your rental period ends. Extensions are charged at a daily rate. Check our pricing page for current daily extension rates for each dumpster size.`
      },
      {
        q: 'When does my rental period start?',
        a: `Your rental period starts the day we deliver the dumpster. So if you book a 3-day rental and we deliver Monday morning, your rental includes Monday, Tuesday, and Wednesday. We'll pick up Thursday morning.`
      },
    ]
  },
  {
    name: 'Delivery & Pickup',
    icon: Truck,
    questions: [
      {
        q: 'How quickly can you deliver?',
        a: `We offer same-day delivery for orders placed before noon (subject to availability). Next-day delivery is almost always available. Need it ASAP? Give us a call at ${config.phone} and we'll do our best to accommodate.`
      },
      {
        q: 'Where can you place the dumpster?',
        a: `We can place dumpsters in driveways, on the street (permit may be required), or on your property. When you book, you'll mark the exact spot on a map. We need about 60 feet of clearance to safely deliver.`
      },
      {
        q: 'Do I need to be home for delivery?',
        a: `Nope! As long as you've shown us where to put it (you'll drop a pin on a map when booking) and the area is accessible, we can deliver while you're away. We'll text you when it's dropped off.`
      },
      {
        q: 'Will the dumpster damage my driveway?',
        a: `Roll-off dumpsters have wheels that can leave marks on softer surfaces. If you're concerned, we recommend placing plywood under the wheels. Let us know and we can place boards when we deliver.`
      },
      {
        q: 'Do I need a permit?',
        a: `If you're placing the dumpster on your own property (driveway, yard), you typically don't need a permit. If you're placing it on a public street, check with your city — some require permits for street placement. We can help you figure this out.`
      },
    ]
  },
  {
    name: 'Dumpster Sizes',
    icon: Scale,
    questions: [
      {
        q: 'What size dumpster do I need?',
        a: `It depends on your project! Our 20-yard dumpster works great for most home cleanouts, single-room remodels, and smaller roofing jobs. The 30-yard is better for whole-house cleanouts, large renovations, or construction projects. Not sure? Call us at ${config.phone} and describe your project — we'll recommend the right size.`
      },
      {
        q: 'How big is a 20-yard dumpster?',
        a: `A 20-yard dumpster is typically ${config.dumpsters.find(d => d.id === '20yd')?.dimensions?.length || '22'} feet long, ${config.dumpsters.find(d => d.id === '20yd')?.dimensions?.width || '8'} feet wide, and ${config.dumpsters.find(d => d.id === '20yd')?.dimensions?.height || '4'} feet tall. It holds about 8 pickup truck loads of debris.`
      },
      {
        q: 'How big is a 30-yard dumpster?',
        a: `A 30-yard dumpster is typically ${config.dumpsters.find(d => d.id === '30yd')?.dimensions?.length || '22'} feet long, ${config.dumpsters.find(d => d.id === '30yd')?.dimensions?.width || '8'} feet wide, and ${config.dumpsters.find(d => d.id === '30yd')?.dimensions?.height || '6'} feet tall. It holds about 12 pickup truck loads of debris.`
      },
      {
        q: 'What if I choose a size that\'s too small?',
        a: `If you fill up your dumpster and need more space, just call us. We can swap it out for a larger one or drop off an additional dumpster. There may be additional charges, but we'll always let you know upfront.`
      },
    ]
  },
  {
    name: 'Prohibited Items',
    icon: Ban,
    questions: [
      {
        q: 'What can\'t I put in the dumpster?',
        a: `The main prohibited items are: hazardous materials (paint, chemicals, oil), batteries, tires, appliances with Freon (refrigerators, AC units), electronics, propane tanks, and medical waste. See our full prohibited items list below.`
      },
      {
        q: 'Can I put concrete or dirt in the dumpster?',
        a: `Heavy materials like concrete, brick, dirt, and asphalt require special pricing due to their weight. Call us at ${config.phone} for a quote on heavy debris — we may need to use a smaller dumpster or have separate pricing.`
      },
      {
        q: 'What about mattresses and furniture?',
        a: `Mattresses and some furniture items have a surcharge due to disposal regulations. Mattresses are $${config.surchargeItems?.find(i => i.item === 'Mattress')?.fee || '40'} each. Couches and upholstered chairs are $${config.surchargeItems?.find(i => i.item === 'Couch/Sofa')?.fee || '25'} each. Just let us know what you're tossing and we'll add it to your quote.`
      },
      {
        q: 'Can I put yard waste in the dumpster?',
        a: `Yard waste (grass, leaves, branches) is banned from Illinois landfills. We cannot accept yard waste in our dumpsters. For yard waste disposal, contact your local waste hauler or look for a composting facility in your area.`
      },
    ]
  },
]

// Flatten all questions for schema
const allQuestions = faqCategories.flatMap(cat => cat.questions)

// ============================================
// FAQ SCHEMA - For Google rich results
// ============================================
function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": allQuestions.map(faq => ({
      "@type": "Question",
      "name": faq.q.replace('${config.address.city}', config.address.city),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
          .replace(/\$\{config\.address\.city\}/g, config.address.city)
          .replace(/\$\{config\.phone\}/g, config.phone)
      }
    }))
  }

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ============================================
// MAIN FAQ PAGE
// ============================================
export default function FAQPage() {
  return (
    <>
      <FAQSchema />
      
      {/* Hero */}
      <section className="section bg-dark-800 pt-32">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl md:text-6xl text-white mb-4">
              FREQUENTLY ASKED <span className="text-gradient">QUESTIONS</span>
            </h1>
            <p className="text-xl text-dark-300">
              Everything you need to know about renting a dumpster in {config.address.city} and Southern Illinois.
              Can&apos;t find your answer? Call us at{' '}
              <a href={`tel:${config.phoneRaw}`} className="text-primary-400 hover:text-primary-300">
                {config.phone}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="section">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            {faqCategories.map((category, catIndex) => (
              <div key={catIndex} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                    <category.icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <h2 className="font-display text-2xl text-white">{category.name}</h2>
                </div>

                <div className="space-y-4">
                  {category.questions.map((faq, faqIndex) => (
                    <FAQAccordion 
                      key={faqIndex}
                      question={faq.q.replace('${config.address.city}', config.address.city)}
                      answer={faq.a}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prohibited Items Section */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <h2 className="font-display text-3xl text-white">PROHIBITED ITEMS</h2>
            </div>
            
            <p className="text-dark-300 mb-8">
              Illinois law and landfill regulations prohibit certain items from being disposed of in dumpsters. 
              Please review this list before loading your dumpster.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {config.prohibitedItems?.map((item, index) => (
                <div 
                  key={index}
                  className="bg-dark-700/50 rounded-xl p-4 border border-dark-600"
                >
                  <div className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">{item.item}</p>
                      <p className="text-dark-400 text-sm">{item.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Surcharge Items */}
      {config.surchargeItems && config.surchargeItems.length > 0 && (
        <section className="section">
          <div className="container-custom">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-display text-3xl text-white mb-6">
                ITEMS WITH <span className="text-gradient">SURCHARGES</span>
              </h2>
              
              <p className="text-dark-300 mb-8">
                These items can go in the dumpster but require an additional fee due to special disposal requirements.
              </p>

              <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left p-4 text-dark-400 font-medium">Item</th>
                      <th className="text-right p-4 text-dark-400 font-medium">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.surchargeItems.map((item, index) => (
                      <tr key={index} className="border-b border-dark-700 last:border-0">
                        <td className="p-4 text-white">{item.item}</td>
                        <td className="p-4 text-right">
                          {item.fee ? (
                            <span className="text-primary-400 font-semibold">${item.fee}/{item.unit}</span>
                          ) : (
                            <span className="text-dark-400">{item.unit}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-3xl p-8 md:p-12 text-center">
            <HelpCircle className="w-12 h-12 text-white mx-auto mb-4" />
            <h2 className="font-display text-3xl text-white mb-4">
              STILL HAVE QUESTIONS?
            </h2>
            <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
              We&apos;re here to help! Give us a call and we&apos;ll answer any questions about your project.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href={`tel:${config.phoneRaw}`}
                className="bg-white text-primary-600 font-bold py-4 px-8 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                {config.phone}
              </a>
              <Link 
                href="/contact"
                className="bg-primary-700 text-white font-bold py-4 px-8 rounded-lg hover:bg-primary-800 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
