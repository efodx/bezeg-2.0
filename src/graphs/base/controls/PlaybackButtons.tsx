import React, {useContext, useLayoutEffect, useRef, useState, useSyncExternalStore} from "react";
import {createPortal} from "react-dom";
import {PlaybackSlotContext} from "../PlaybackSlotContext";
import {useT} from "../../../localization";
import {UnavailableButton} from "../../../inputs/UnavailableButton";

/** Why a playback button is unavailable; see docs/specs/playback-button-reasons.md. */
export type PlaybackBlock = 'no-more-steps' | 'playing' | 'at-start' | 'no-run' | 'reduced-motion';

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
    /** Needed with `onNext`. */
    readonly nextLabel?: string;
    /** Defaults to the shared Reset label. */
    readonly resetLabel?: string;
    readonly playing: boolean;
    /** Replaces the generic "no run" reason when the graph knows why there are no steps and what to do (for example choose a site first). */
    readonly noRunReason?: string;
    /** "graph" asks for the graph-adjacent slot under the board where the workspace offers one; default "inspector". */
    readonly placement?: "graph" | "inspector";
    /** A continuous run has no step: leave `onNext` out and the Next step button is not shown. */
    readonly onNext?: () => void;
    readonly onPlayPause: () => void;
    /** Left out when the graph has no run reset; the Reset button is then not shown. */
    readonly onReset?: () => void;
    /** Buttons of the same group placed before the three, such as Previous. */
    readonly leading?: React.ReactNode;
    /** Further buttons of the same group, after the three. */
    readonly children?: React.ReactNode;
}

/**
 * The next step, play or pause, and reset buttons of an iteration graph. A blocked button stays focusable (aria-disabled, not
 * disabled), because a focused button must not lose focus when it becomes unavailable, and it says why it is blocked: in its
 * title, in its description, and in the status line once pressed.
 */
export function PlaybackButtons({groupLabel, className, nextLabel, resetLabel, playing, noRunReason, placement = "inspector", nextBlock, playBlock, resetBlock,
                                    onNext, onPlayPause, onReset, leading, children}: PlaybackButtonsProps) {
    const t = useT();
    const slot = useContext(PlaybackSlotContext);
    const slotElement = placement === "graph" ? slot.element : null;
    // A one-flag store keeps the claim result out of effect-driven state; the claim itself is the workspace's.
    const [claimed] = useState(() => {
        let value = false;
        const listeners = new Set<() => void>();
        return {
            get: () => value,
            subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
            set: (next: boolean) => { value = next; listeners.forEach(listener => listener()); },
        };
    });
    const inSlot = useSyncExternalStore(claimed.subscribe, claimed.get);
    // One instance, moved: claiming the slot never remounts this component; only its group (and status line) change parent.
    useLayoutEffect(() => {
        if (!slotElement) return;
        const release = slot.claim();
        if (!release) {
            if (import.meta.env.DEV) console.warn("PlaybackButtons: the graph playback slot is already claimed; rendering inline.");
            return;
        }
        claimed.set(true);
        return () => { release(); claimed.set(false); };
    }, [slotElement, slot, claimed]);
    // Moving between inspector and slot re-creates the group's DOM; a button that had focus keeps it, by its data-action.
    const group = useRef<HTMLDivElement>(null);
    const focusedAction = useRef<string>();
    const wasInSlot = useRef(inSlot);
    useLayoutEffect(() => {
        if (wasInSlot.current === inSlot) return;
        wasInSlot.current = inSlot;
        const action = focusedAction.current;
        if (!action || (document.activeElement && document.activeElement !== document.body)) return;
        group.current?.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus();
    }, [inSlot]);
    const [pressed, setPressed] = useState<PlaybackAction>();
    const reasons: Record<PlaybackBlock, string> = {
        'no-more-steps': t("playback_block_no_more_steps"),
        'playing': t("playback_block_playing"),
        'at-start': t("playback_block_at_start"),
        'no-run': noRunReason ?? t("playback_block_no_run"),
        'reduced-motion': t("playback_block_reduced_motion"),
    };
    const all: readonly {action: PlaybackAction, block: PlaybackBlock | undefined, label: string, run: (() => void) | undefined}[] = [
        {action: 'next-step', block: nextBlock, label: nextLabel ?? "", run: onNext},
        {action: 'play-pause', block: playBlock, label: playing ? t("pause") : t("play"), run: onPlayPause},
        {action: 'reset', block: resetBlock, label: resetLabel ?? t("reset"), run: onReset},
    ];
    const buttons = all.flatMap(({run, ...rest}) => run ? [{...rest, run}] : []);
    const shownBlock = buttons.find(button => button.action === pressed)?.block;
    const content = <>
        <div className={className ? `${className} inspector-playback` : "inspector-playback"} role="group" aria-label={groupLabel} ref={group}
             onFocus={event => { focusedAction.current = (event.target as HTMLElement).dataset.action; }}
             onBlur={event => { if (event.relatedTarget) focusedAction.current = undefined; }}>
            {leading}
            {buttons.map(({action, block, label, run}) =>
                <UnavailableButton key={action} data-action={action} data-playing={action === 'play-pause' ? String(playing) : undefined} reason={block && reasons[block]} onPress={() => { setPressed(undefined); run(); }}
                                   onBlockedPress={() => setPressed(action)}>{label}</UnavailableButton>)}
            {children}
        </div>
        <div role="status" aria-live="polite">
            {shownBlock && <p className="inspector-help" data-playback-reason={shownBlock}>{reasons[shownBlock]}</p>}
        </div>
    </>;
    return inSlot && slotElement ? createPortal(content, slotElement) : content;
}
