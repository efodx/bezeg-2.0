/**
 * The drawn De Casteljau parameter while an animation plays, for the controls that show it. Playback reports here
 * instead of writing the scene store, so a playing frame re-renders only those controls and not the whole workspace.
 * `undefined` means no run is reporting, and the controls show the scene-store `t`. The owning graph clears it when
 * playback leaves the "playing" state; there is nothing to dispose (listeners are removed by their subscribers).
 */
export class LiveParameter {
    private value?: number;
    private readonly listeners = new Set<() => void>();

    report(value: number | undefined): void {
        if (value === this.value) return;
        this.value = value;
        this.listeners.forEach(listener => listener());
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };

    getSnapshot = (): number | undefined => this.value;
}
