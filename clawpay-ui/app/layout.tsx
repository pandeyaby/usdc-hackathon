import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClawPay - Trust-Free Agent Payments',
  description: 'Escrow smart contracts for AI agent transactions. Pay for work, not promises.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Header */}
        <header className="glass sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🦀</span>
                <div>
                  <h1 className="text-xl font-bold text-white">ClawPay</h1>
                  <p className="text-blue-200 text-xs">Trust-Free Payments</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-blue-200 text-sm hidden sm:block">Base Mainnet</span>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="min-h-screen">{children}</main>
        
        <footer className="glass mt-8 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-blue-200 text-sm">
              Built by VHAGAR for #USDCHackathon 2026
            </p>
            <p className="text-blue-300 text-xs mt-1">
              Contract: 0x5cA7A8B1d0a5aFe4CF67333FF8C330102F098FfD
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
