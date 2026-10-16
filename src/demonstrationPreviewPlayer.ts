import type {DemonstrationMotionAsset} from './demonstrationMotionAssets';

export type DemonstrationPreviewActivation = {
    demonstrationId: string;
    asset: DemonstrationMotionAsset;
    generation: number;
    explicit: boolean;
};

/** Tracks the single requested clip in a collection without depending on a graph or the DOM. */
export class DemonstrationPreviewPlayer {
    private generation = 0;
    private current: DemonstrationPreviewActivation | null = null;

    activate(demonstrationId: string, asset: DemonstrationMotionAsset, explicit: boolean): DemonstrationPreviewActivation {
        const activation = {demonstrationId, asset, generation: ++this.generation, explicit};
        this.current = activation;
        return activation;
    }

    stop(demonstrationId?: string, generation?: number): boolean {
        if (!this.current || (demonstrationId && this.current.demonstrationId !== demonstrationId)
            || (generation !== undefined && this.current.generation !== generation)) return false;
        this.current = null;
        return true;
    }

    isCurrent(demonstrationId: string, generation: number): boolean {
        return this.current?.demonstrationId === demonstrationId && this.current.generation === generation;
    }

    get active(): DemonstrationPreviewActivation | null {
        return this.current;
    }
}

export function shouldAutomaticallyPlayPreview(reducedMotion: boolean, hasMotion: boolean, alreadyPlayedOnEntry: boolean): boolean {
    return hasMotion && !reducedMotion && !alreadyPlayedOnEntry;
}

export function isFocusLeavingPreviewCard(contains: (target: EventTarget | null) => boolean, nextTarget: EventTarget | null): boolean {
    return !contains(nextTarget);
}

/** Resolve play() safely: a delayed rejection from a replaced clip cannot stop its successor. */
export async function playPreviewSafely(
    player: DemonstrationPreviewPlayer,
    activation: DemonstrationPreviewActivation,
    play: () => Promise<void>,
    onFailure: () => void,
): Promise<void> {
    try {
        await play();
    } catch {
        if (player.isCurrent(activation.demonstrationId, activation.generation)) onFailure();
    }
}
