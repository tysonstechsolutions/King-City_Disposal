// ============================================
// EXAMPLE PAGE - Copy this to your project
// ============================================
//
// Save as: src/app/paving-calculator/page.jsx
// or: src/app/get-quote/page.jsx
// or wherever you want the calculator
//
// ============================================

import PavingCalculator from '../../components/PavingCalculator'

export const metadata = {
  title: 'Free Paving Estimate | Your Paving Company',
  description: 'Get an instant estimate for asphalt paving, sealcoating, or line striping. Calculate your project cost in minutes.',
}

export default function PavingCalculatorPage() {
  return <PavingCalculator />
}
