// ============================================
// INVOICE PAGE LAYOUT - Private/NoIndex
// ============================================
// Prevents Google from indexing customer invoice pages

export const metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  title: 'Invoice',
}

export default function InvoiceLayout({ children }) {
  return children
}
