/** Circles touch when the squared centre distance is at most the squared radius sum (closed). */
export function circlesTouch(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
  const dx = x1 - x2
  const dy = y1 - y2
  const s = r1 + r2
  return dx * dx + dy * dy <= s * s
}
