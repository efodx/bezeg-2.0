/** A card's natural height held at the largest reading seen for one `key` (lesson, board size, language). A new key starts over. */
export interface HeldHeight { key: string; height: number }

/** Pure: the held record after reading `height` under `key`. Within one key the height never shrinks; a new key takes the reading. */
export function holdHeight(held: HeldHeight | undefined, key: string, height: number): HeldHeight {
  if (held && held.key === key && held.height >= height) return held;
  return {key, height: held && held.key === key ? Math.max(held.height, height) : height};
}
