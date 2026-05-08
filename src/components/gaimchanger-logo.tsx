/**
 * Gaimchanger Golf logo components — uses actual brand logo images.
 * Horizontal: header nav bar
 * Stacked: homepage hero, larger displays
 */

import Image from 'next/image';

export function GaimchangerLogoHorizontal({
  height = 36,
  className = '',
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center bg-white rounded-md px-3 py-1.5 ${className}`}
    >
      <Image
        src="/GAIM CHANGER LOGO-Transparent-02.png"
        alt="Gaimchanger Golf"
        width={Math.round(height * 5.5)}
        height={height}
        priority
      />
    </div>
  );
}

export function GaimchangerLogoStacked({
  height = 80,
  className = '',
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center bg-white rounded-xl px-6 py-4 shadow-lg shadow-[#B5A36B]/10 ${className}`}
    >
      <Image
        src="/GAIM CHANGER LOGO-Transparent-03.png"
        alt="Gaimchanger Golf"
        width={Math.round(height * 1.4)}
        height={height}
        priority
      />
    </div>
  );
}
