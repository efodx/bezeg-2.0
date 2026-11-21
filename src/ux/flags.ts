/**
 * UX-challenge prototype flags (lane A). `?ux=a1,a2` switches prototypes on for the current page; without the
 * parameter the app behaves exactly as on master. The URL is the only source, so a link without the flag is the
 * comparison baseline.
 */
export type UxFlag = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9' | 'a10' | 'a11' | 'a12' | 'a13' | 'a14' | 'a15' | 'a16' | 'a17' | 'a18' | 'a19' | 'a20';

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
    return flags.has('a1') || flags.has('a3') || flags.has('a4') || flags.has('a6') || flags.has('a8') || flags.has('a9') || flags.has('a10') || flags.has('a11') || flags.has('a12') || flags.has('a13') || flags.has('a14') || flags.has('a15') || flags.has('a16') || flags.has('a17') || flags.has('a18') || flags.has('a19') || flags.has('a20');
}

/** `?uxAt=n`: deep links from the UX lab open a lesson n frames in (also without a prototype flag, for comparison). */
export function uxStartFrames(): number {
    if (typeof window === 'undefined') return 0;
    const value = Number(new URLSearchParams(window.location.search).get('uxAt'));
    return Number.isInteger(value) && value > 0 && value < 60 ? value : 0;
}
