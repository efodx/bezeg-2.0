/**
 * UX-challenge prototype flags (lane A). `?ux=a1,a2` switches prototypes on for the current page; without the
 * parameter the app behaves exactly as on master. The URL is the only source, so a link without the flag is the
 * comparison baseline.
 */
export type UxFlag = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9';

export function uxFlags(): ReadonlySet<string> {
    if (typeof window === 'undefined') return new Set();
    const raw = new URLSearchParams(window.location.search).get('ux');
    if (!raw) return new Set();
    return new Set(raw.split(/[,\s]+/).filter(Boolean));
}

export function uxEnabled(flag: UxFlag): boolean {
    return uxFlags().has(flag);
}

/** The prototypes that read the shared parameter registry. */
export function parameterRegistryWanted(): boolean {
    const flags = uxFlags();
    return flags.has('a1') || flags.has('a3') || flags.has('a4');
}
