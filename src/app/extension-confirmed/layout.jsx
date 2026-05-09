// Confirmation page reached only after an extension is paid for. No reason
// for Google to index it; the URL is unique per session.
export const metadata = {
  title: 'Extension Confirmed',
  robots: { index: false, follow: false },
}

export default function Layout({ children }) {
  return children
}
