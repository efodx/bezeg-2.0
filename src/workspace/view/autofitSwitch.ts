// The global "Samodejno" (auto-fit) switch of the view director (task 07): one value for every graph, kept in localStorage.
export const AUTOFIT_STORAGE_KEY = 'bezeg.view.autofit';

export interface AutofitSwitch {
    get(): boolean;
    set(on: boolean): void;
    subscribe(listener: () => void): () => void;
}

/** Default on; a storage that throws or holds anything but "off" reads as on. */
export function createAutofitSwitch(storage: () => Pick<Storage, 'getItem' | 'setItem'> | undefined = () => {
    try { return globalThis.localStorage; } catch { return undefined; }
}): AutofitSwitch {
    const listeners = new Set<() => void>();
    let memory = true;
    const read = (): boolean => {
        try {
            const stored = storage()?.getItem(AUTOFIT_STORAGE_KEY);
            return stored === null || stored === undefined ? memory : stored !== 'off';
        } catch {
            return memory;
        }
    };
    return {
        get: read,
        set(on) {
            memory = on;
            try { storage()?.setItem(AUTOFIT_STORAGE_KEY, on ? 'on' : 'off'); } catch { /* the choice lasts for this session */ }
            for (const listener of [...listeners]) listener();
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
}

/** The app's one switch. */
export const autofitSwitch: AutofitSwitch = createAutofitSwitch();
