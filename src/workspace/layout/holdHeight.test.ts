import {describe, expect, it} from 'vitest';
import {holdHeight} from './holdHeight';

describe('holdHeight', () => {
  it('keeps the largest height within one key, so a shorter frame does not shrink the card', () => {
    const first = holdHeight(undefined, 'a', 300);
    const taller = holdHeight(first, 'a', 420);
    const shorter = holdHeight(taller, 'a', 250);
    expect(first.height).toBe(300);
    expect(taller.height).toBe(420);
    expect(shorter.height).toBe(420);
  });

  it('starts over when the key changes (lesson, board size, language)', () => {
    const held = holdHeight(undefined, 'a', 420);
    expect(holdHeight(held, 'b', 250).height).toBe(250);
  });
});
