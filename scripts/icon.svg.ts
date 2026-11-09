/**
 * Appikonen som SVG. `safe` är andelen av ytan som motivet får ta (maskable-ikoner
 * beskärs av Android, så där hålls motivet inom den inre "säkra zonen").
 */
export function iconSvg(size: number, { safe = 0.78, rounded = true } = {}): string {
  const bg = '#16171b';
  const inner = size * safe;
  const off = (size - inner) / 2;
  const cell = inner / 3;
  const r = rounded ? size * 0.18 : 0;
  const lines = [1, 2]
    .map((k) => {
      const p = off + k * cell;
      return `<path d="M${p} ${off}V${off + inner}M${off} ${p}H${off + inner}" stroke="#3a3e49" stroke-width="${size * 0.012}"/>`;
    })
    .join('');
  const digit = (col: number, row: number, d: number, fill: string, weight = 500) =>
    `<text x="${off + (col + 0.5) * cell}" y="${off + (row + 0.5) * cell}" dy="0.35em" text-anchor="middle"
      font-family="Inter, Roboto, 'Segoe UI', Arial, sans-serif" font-size="${cell * 0.62}" font-weight="${weight}" fill="${fill}">${d}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>
  <rect x="${off + cell}" y="${off + cell}" width="${cell}" height="${cell}" fill="#2f5aa3"/>
  ${lines}
  <rect x="${off}" y="${off}" width="${inner}" height="${inner}" rx="${size * 0.02}" fill="none" stroke="#8a909e" stroke-width="${size * 0.028}"/>
  ${digit(0, 0, 5, '#d9d9dc')}
  ${digit(2, 0, 3, '#6ea0ff')}
  ${digit(1, 1, 9, '#ffffff', 600)}
  ${digit(0, 2, 7, '#6ea0ff')}
  ${digit(2, 2, 1, '#d9d9dc')}
</svg>`;
}
