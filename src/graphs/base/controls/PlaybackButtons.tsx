import React, {useId, useState} from "react";
import {useT} from "../../../localization";

/** Why a playback button is unavailable; see docs/specs/playback-button-reasons.md. */
export type PlaybackBlock = 'no-more-steps' | 'playing' | 'at-start' | 'no-run';

export interface PlaybackBlocks {
    readonly nextBlock: PlaybackBlock | undefined;
    readonly playBlock: PlaybackBlock | undefined;
    readonly resetBlock: PlaybackBlock | undefined;
}

export interface PlaybackPosition {
    /** The input gives something to step through. Defaults to true. */
    readonly ready?: boolean;
    readonly atStart: boolean;
    readonly atEnd: boolean;
    readonly playing: boolean;
    /** Next step stays available during playback. Defaults to false. */
    readonly stepsWhilePlaying?: boolean;
}

export function playbackBlocks({ready = true, atStart, atEnd, playing, stepsWhilePlaying = false}: PlaybackPosition): PlaybackBlocks {
    if (!ready) return {nextBlock: 'no-run', playBlock: 'no-run', resetBlock: 'no-run'};
    const nextWaits = playing && !stepsWhilePlaying ? 'playing' as const : undefined;
    return {
        nextBlock: atEnd ? 'no-more-steps' : nextWaits,
        playBlock: atEnd && !playing ? 'no-more-steps' : undefined,
        resetBlock: atStart && !playing ? 'at-start' : undefined,
    };
}

type PlaybackAction = 'next-step' | 'play-pause' | 'reset';

interface PlaybackButtonsProps extends Partial<PlaybackBlocks> {
    readonly groupLabel: string;
    /** Added to the group's `inspector-playback` class. */
    readonly className?: string;
    readonly nextLabel: string;
    /** Defaults to the shared Reset label. */
    readonly resetLabel?: string;
    readonly playing: boolean;
    readonly onNext: () => void;
    readonly onPlayPause: () => void;
    readonly onReset: () => void;
}

/**
 * The next step, play or pause, and reset buttons of an iteration graph. A blocked button stays focusable (aria-disabled, not
 * disabled), because a focused button must not lose focus when it becomes unavailable, and it says why it is blocked: in its
 * title, in its description, and in the status line once pressed.
 */
export function PlaybackButtons({groupLabel, className, nextLabel, resetLabel, playing, nextBlock, playBlock, resetBlock,
                                    onNext, onPlayPause, onReset}: PlaybackButtonsProps) {
    const t = useT();
    const id = useId();
    const [pressed, setPressed] = useState<PlaybackAction>();
    const reasons: Record<PlaybackBlock, string> = {
        'no-more-steps': t("playback_block_no_more_steps"),
        'playing': t("playback_block_playing"),
        'at-start': t("playback_block_at_start"),
        'no-run': t("playback_block_no_run"),
    };
    const buttons: readonly {action: PlaybackAction, block: PlaybackBlock | undefined, label: string, run: () => void}[] = [
        {action: 'next-step', block: nextBlock, label: nextLabel, run: onNext},
        {action: 'play-pause', block: playBlock, label: playing ? t("pause") : t("play"), run: onPlayPause},
        {action: 'reset', block: resetBlock, label: resetLabel ?? t("reset"), run: onReset},
    ];
    const shownBlock = buttons.find(button => button.action === pressed)?.block;
    return <>
        <div className={className ? `${className} inspector-playback` : "inspector-playback"} role="group" aria-label={groupLabel}>
            {buttons.map(({action, block, label, run}) =>
                <button key={action} type="button" data-action={action} aria-disabled={block !== undefined}
                        title={block && reasons[block]} aria-describedby={block && `${id}-${action}`}
                        onClick={() => {
                            setPressed(block ? action : undefined);
                            if (!block) run();
                        }}>{label}</button>)}
            {buttons.map(({action, block}) => block && <span key={action} id={`${id}-${action}`} hidden>{reasons[block]}</span>)}
        </div>
        <div role="status" aria-live="polite">
            {shownBlock && <p className="inspector-help" data-playback-reason={shownBlock}>{reasons[shownBlock]}</p>}
        </div>
    </>;
}
