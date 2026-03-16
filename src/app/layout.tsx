import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gaimchanger Golf — Corporate HQ',
  description: 'AI Agent Management Platform for Gaimchanger Golf',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased bg-[#0a0a0a] text-neutral-100 min-h-screen"
      >
        <header className="sticky top-0 z-50 border-b border-neutral-800 bg-[#0a0a0a]/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#2d8a4e] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M5 3L19 7L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.3" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-white text-lg">Gaimchanger Golf</span>
                  <span className="text-neutral-500 text-sm ml-2">Corporate HQ</span>
                </div>
              </Link>
              <nav className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Corporate HQ
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Operations
                </Link>
                <a
                  href="https://gaimchangergolf.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Gaimchanger Golf
                </a>
              </nav>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
