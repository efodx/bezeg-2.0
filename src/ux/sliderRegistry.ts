/** Mounted shared sliders, for prototypes that drive parameters from the board (c4). */
export interface RegisteredSlider {
    label: string;
    min: number;
    max: number;
    step: number;
    value(): number;
    set(value: number): void;
    inert(): boolean;
    element(): HTMLElement | null;
    decimals: number;
}

const sliders = new Set<RegisteredSlider>();

export function registerSlider(entry: RegisteredSlider): () => void {
    sliders.add(entry);
    return () => { sliders.delete(entry); };
}

/** Sliders a student could use right now: shown, enabled and with a real range. */
export function usableSliders(): RegisteredSlider[] {
    return [...sliders].filter(entry => {
        const element = entry.element();
        if (!element || !element.isConnected || entry.inert() || !(entry.max > entry.min)) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    });
}
