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
    <Image
      src="/logo-horizontal.png"
      alt="Gaimchanger Golf"
      width={Math.round(height * 5.5)}
      height={height}
      className={className}
      priority
    />
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
    <Image
      src="/logo-stacked.png"
      alt="Gaimchanger Golf"
      width={Math.round(height * 1.4)}
      height={height}
      className={className}
      priority
    />
  );
}
