import { config } from '../config'

// Homepage-only JSON-LD. These used to live in the root layout, which put a
// FAQPage on every URL — pages with their own FAQ (e.g. /faq, service and city
// pages) then had two FAQPage blocks, which Google flags as an error.

// ============================================
// FAQ SCHEMA - Shows expandable Q&As in Google search results (rich snippets)
// ============================================
export function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much does a dumpster rental cost in Mount Vernon IL?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Dumpster rentals in Mount Vernon and Southern Illinois start at $${config.dumpsters[0]?.pricing['10-day']} for a 10-day rental. This includes delivery, pickup, and disposal up to ${config.dumpsters[0]?.weightIncluded}. Call King City Disposal at ${config.phone} for a quote.`
        }
      },
      {
        "@type": "Question",
        "name": "Can I get same-day dumpster delivery?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Yes! ${config.businessName} offers same-day dumpster delivery in ${config.address.city} and surrounding areas for orders placed before noon (subject to availability). Next-day delivery is almost always available. Call us at ${config.phone} for rush delivery.`
        }
      },
      {
        "@type": "Question",
        "name": "What size dumpster do I need for a home cleanout?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "For most garage, basement, or single-room cleanouts, a 20-yard dumpster is perfect. It holds about 8 pickup truck loads of debris. For whole-house cleanouts or major renovations, consider a 30-yard dumpster."
        }
      },
      {
        "@type": "Question",
        "name": "How long can I keep the dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Our standard rental period is 10 days, which is longer than most competitors. Need more time? Extensions are available at $${config.dumpsters[0]?.extensionRate || 100} per week. Fill it up early? Just call and we'll pick it up!`
        }
      },
      {
        "@type": "Question",
        "name": "What can't go in a dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Prohibited items include hazardous materials, paint, chemicals, batteries, tires, appliances with Freon (refrigerators, AC units), electronics, and yard waste. These items are banned by Illinois law. See our FAQ page for the complete list."
        }
      }
    ]
  }

  return (
    <script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ============================================
// HOWTO SCHEMA - For the booking process
// ============================================
export function HowToSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Rent a Dumpster in Southern Illinois",
    "description": "Simple 4-step process to rent a roll-off dumpster from King City Disposal.",
    "totalTime": "PT5M",
    "estimatedCost": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": config.dumpsters[0]?.pricing['10-day'] || 475
    },
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Choose Your Size",
        "text": "Select a 20-yard or 30-yard dumpster based on your project needs.",
        "url": `${config.websiteUrl}/dumpsters`
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Pick Delivery Location",
        "text": "Enter your address and use our satellite map to show exactly where to place the dumpster.",
        "url": `${config.websiteUrl}/book`
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Schedule Delivery",
        "text": "Choose your delivery date. Same-day delivery often available for orders before noon.",
        "url": `${config.websiteUrl}/book`
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Fill It Up",
        "text": "Load your debris, then call us for pickup when you're done or at the end of your rental period.",
        "url": `${config.websiteUrl}/contact`
      }
    ]
  }

  return (
    <script
      id="howto-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
