/** UX challenge lane B prototype switches: `?ux=b1,b2`. Read from the live URL so a deep link decides. */
export type UxFlag = 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8' | 'b9' | 'b10' | 'b11' | 'b12' | 'b13' | 'b14' | 'b15' | 'b16' | 'b17' | 'b18' | 'b19' | 'b20' | 'b21';

const STORAGE_KEY = 'bezeg-uxlab-b-flags';

function readFlags(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    const param = new URLSearchParams(window.location.search).get('ux');
    if (param !== null) {
        try { window.sessionStorage.setItem(STORAGE_KEY, param); } catch { /* private mode */ }
        return new Set(param.split(',').map(part => part.trim()).filter(Boolean));
    }
    return new Set();
}

export function uxEnabled(flag: UxFlag): boolean {
    return readFlags().has(flag);
}

export function uxFlags(): string[] {
    return [...readFlags()];
}

declare global {
    interface Window {
        __uxLesson?: {capabilities: import('../learning/model').LessonGraphCapabilities; session: unknown};
    }
}
