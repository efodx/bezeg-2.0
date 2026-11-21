/**
 * UX challenge lane C prototype flags. `?ux=c1,c2` switches prototypes on; the choice is kept for the tab
 * (sessionStorage) so in-app navigation keeps it, and `?ux=off` (or an empty `?ux=`) switches everything off.
 */
const STORAGE_KEY = 'bezeg-ux-flags';

function readStored(): string | null {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function writeStored(value: string | null): void {
    try {
        if (value === null) sessionStorage.removeItem(STORAGE_KEY);
        else sessionStorage.setItem(STORAGE_KEY, value);
    } catch { /* storage may be unavailable */ }
}

export function uxFlags(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    const param = new URLSearchParams(window.location.search).get('ux');
    let raw: string | null;
    if (param !== null) {
        raw = param === 'off' ? '' : param;
        writeStored(raw === '' ? null : raw);
    } else {
        raw = readStored();
    }
    return new Set((raw ?? '').split(',').map(part => part.trim().toLowerCase()).filter(Boolean));
}

export function uxEnabled(id: string): boolean {
    return uxFlags().has(id);
}
