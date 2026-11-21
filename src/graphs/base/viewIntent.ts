/**
 * Marks who asked for a board view change, for the ux-picks "Board makes room" prototype (src/uxPicks/room): a call that
 * carries no mark is told apart by JSXGraph's own third argument. Inert unless the prototype reads it.
 */
export type ViewIntent = 'graph' | 'user';
let intent: ViewIntent | null = null;

export function withViewIntent<T>(kind: ViewIntent, run: () => T): T {
    const before = intent;
    intent = kind;
    try { return run(); } finally { intent = before; }
}

export function currentViewIntent(): ViewIntent | null { return intent; }
