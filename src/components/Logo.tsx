// Logotipo de Publisolar recreado como SVG (marca de pétalos + wordmark).
// Autocontenido, nítido a cualquier tamaño y en la paleta de marca.

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** Solo la marca (cluster de pétalos oro/naranja/verde). */
export function LogoMark({ size = 40, className = '' }: LogoMarkProps) {
  // Cada pétalo es una elipse rotada alrededor del centro (24,24).
  const petalos: { angle: number; fill: string }[] = [
    { angle: -52, fill: '#f2b705' }, // oro
    { angle: -2, fill: '#f6c445' },  // oro claro
    { angle: 52, fill: '#e0900c' },  // naranja
    { angle: 112, fill: '#8cc34a' }, // verde claro
    { angle: 168, fill: '#55892e' }, // verde
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {petalos.map((p, i) => (
        <ellipse
          key={i}
          cx="24"
          cy="12.5"
          rx="6.3"
          ry="10.5"
          fill={p.fill}
          transform={`rotate(${p.angle} 24 24)`}
        />
      ))}
      <circle cx="24" cy="24" r="4.4" fill="#fff" />
      <circle cx="24" cy="24" r="2.6" fill="#f2b705" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  withText?: boolean;
  /** true = fondo oscuro: el texto "Publi" se vuelve blanco */
  light?: boolean;
  className?: string;
}

/** Logo completo: marca + wordmark "Publisolar / paneles solares". */
export function Logo({ size = 40, withText = true, light = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {withText && (
        <div className="leading-none">
          <div className="font-extrabold tracking-tight" style={{ fontSize: size * 0.62 }}>
            <span className={light ? 'text-white' : 'text-charcoal'}>Publi</span>
            <span className="text-brand-500">solar</span>
          </div>
          <div
            className={`uppercase tracking-[0.25em] ${light ? 'text-white/70' : 'text-gray-400'}`}
            style={{ fontSize: size * 0.16, marginTop: size * 0.06 }}
          >
            paneles solares
          </div>
        </div>
      )}
    </div>
  );
}
