// ============================================
// RECEIPT PAGE LAYOUT - Private/NoIndex
// ============================================
// Prevents Google from indexing customer receipt pages

export const metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  title: 'Payment Receipt',
}

export default function ReceiptLayout({ children }) {
  return children
}
