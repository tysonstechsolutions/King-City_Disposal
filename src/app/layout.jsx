import './globals.css'
import { config } from '../config'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'

export const metadata = {
  title: config.seo.title,
  description: config.seo.description,
  keywords: config.seo.keywords.join(', '),
  openGraph: {
    title: config.seo.title,
    description: config.seo.description,
    type: 'website',
    locale: 'en_US',
    siteName: config.businessName,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <ChatbotWidget />
      </body>
    </html>
  )
}
