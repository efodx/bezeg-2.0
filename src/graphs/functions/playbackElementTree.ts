/**
 * Test helper for the functions graphs' controls: finds a playback button in a collected element tree (by component name or
 * host tag) whether it is a plain `<button>` or one of the three buttons of a shared `PlaybackButtons` element. The shared
 * element's buttons are shaped like host buttons (`aria-disabled`, `onClick` gated on the block, like the component does).
 */
import {t} from "../../localization";

type Elements = Record<string, any[]>;

const PLAYBACK_ACTIONS = ['next-step', 'play-pause', 'reset'] as const;

function sharedButton(props: any, action: typeof PLAYBACK_ACTIONS[number]) {
    const [block, run] = {
        'next-step': [props.nextBlock, props.onNext],
        'play-pause': [props.playBlock, props.onPlayPause],
        'reset': [props.resetBlock, props.onReset],
    }[action];
    return {props: {'data-action': action, 'aria-disabled': block !== undefined, onClick: () => { if (!block) run(); },
        children: {'next-step': props.nextLabel, 'play-pause': props.playing ? t("pause") : t("play"), 'reset': props.resetLabel ?? t("reset")}[action]}};
}

export function playbackButton(found: Elements, action: string) {
    const shared = found.PlaybackButtons?.[0]?.props;
    if (shared && PLAYBACK_ACTIONS.some(name => name === action)) return sharedButton(shared, action as typeof PLAYBACK_ACTIONS[number]);
    return found.button?.find((element: any) => element.props['data-action'] === action);
}

/** The data-action of every button, the shared playback buttons first as in the markup. */
export function buttonActions(found: Elements): string[] {
    return [...(found.PlaybackButtons ? PLAYBACK_ACTIONS : []), ...(found.button ?? []).map((button: any) => button.props['data-action'])];
}
