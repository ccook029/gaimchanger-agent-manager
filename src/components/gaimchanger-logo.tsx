/**
 * Gaimchanger Golf logo — the "G" swoosh mark.
 * Colors: Black + Pantone 4525 C (gold #B5A36B)
 */

export function GaimchangerLogo({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer swoosh */}
      <path
        d="M75 20C60 8 38 8 23 20C8 32 5 52 15 68C25 84 48 90 65 82C72 78 77 72 80 65L60 65C56 72 48 76 40 74C28 71 20 58 23 45C26 32 38 24 52 26C60 28 66 33 70 40L50 40L50 52L85 52C87 45 87 37 84 30C82 26 79 23 75 20Z"
        fill="#B5A36B"
      />
      {/* Inner swoosh accent */}
      <path
        d="M75 20C72 17 68 15 64 14C58 12 51 12 45 14C38 16 32 20 28 26C22 34 20 44 22 54C24 62 29 69 36 74C43 79 52 80 60 78C66 76 71 72 75 67L72 67C68 73 62 77 55 78C47 79 39 76 34 70C28 64 26 55 28 46C30 37 36 30 44 27C50 25 57 25 63 28C68 30 72 34 74 39L50 39L50 53L84 53C86 46 86 38 83 31C81 27 78 23 75 20Z"
        fill="#B5A36B"
        opacity="0.6"
      />
    </svg>
  );
}

export function GaimchangerWordmark({
  className = '',
}: {
  className?: string;
}) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      <span className="text-[#B5A36B]">G</span>
      <span className="text-white">AIM</span>
      <span className="text-white ml-0.5 font-semibold tracking-wider text-[0.7em] uppercase">Changer</span>
    </span>
  );
}
