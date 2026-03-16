import type { Metadata } from 'next';
import Link from 'next/link';
import { GaimchangerLogo, GaimchangerWordmark } from '@/components/gaimchanger-logo';
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
        <header className="sticky top-0 z-50 border-b border-neutral-800/60 bg-[#0a0a0a]/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3 group">
                <GaimchangerLogo size={36} />
                <div className="flex items-baseline gap-2">
                  <GaimchangerWordmark className="text-xl" />
                  <span className="text-neutral-600 text-xs font-medium tracking-widest uppercase">HQ</span>
                </div>
              </Link>
              <nav className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm text-neutral-400 hover:text-[#B5A36B] transition-colors"
                >
                  Corporate HQ
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm text-neutral-400 hover:text-[#B5A36B] transition-colors"
                >
                  Operations
                </Link>
                <a
                  href="https://gaimchangergolf.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-400 hover:text-[#B5A36B] transition-colors"
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
