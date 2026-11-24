import {useId, useRef} from 'react';
import type {KeyboardEvent} from 'react';
import {PuckFrame, useTip} from './PuckParts';

export interface ChoicePuckOption {
    readonly value: string;
    /** The accessible name of the segment. */
    readonly label: string;
    /** The text shown in the segment (default the label). */
    readonly text?: string;
}

export interface ChoicePuckProps {
    /** The accessible name of the group and the visible label (the parameter's label). */
    label: string;
    help?: string;
    options: readonly ChoicePuckOption[];
    value: string;
    /** Selects an option; the caller writes it as the learner. */
    onSelect(value: string): void;
}

/** Segments whose texts fit one row of the puck; longer texts stack. */
const ROW_CHARS = 16;

/** A declared choice of at most four options as a puck (task 05 slice 6): a segmented control. Arrow keys move and select. */
export function ChoicePuck(props: ChoicePuckProps) {
    const {options, value, onSelect} = props;
    const tip = useTip();
    const tipId = useId();
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const selected = Math.max(0, options.findIndex(option => option.value === value));
    const stacked = options.reduce((sum, option) => sum + (option.text ?? option.label).length, 0) > ROW_CHARS;
    const move = (to: number) => {
        const index = (to + options.length) % options.length;
        onSelect(options[index].value);
        refs.current[index]?.focus();
    };
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const key = event.key;
        if (key === 'ArrowRight' || key === 'ArrowDown') move(selected + 1);
        else if (key === 'ArrowLeft' || key === 'ArrowUp') move(selected - 1);
        else if (key === 'Home') move(0);
        else if (key === 'End') move(options.length - 1);
        else return;
        event.preventDefault();
    };
    return <PuckFrame label={props.label} help={props.help} locked={false} lockReason="" tip={tip.shown ? props.help : undefined} tipId={tipId} className="puck-choice">
        <div {...tip.handlers} className={`puck-segments${stacked ? ' is-stacked' : ''}`} role="radiogroup" aria-label={props.label}
             aria-describedby={tip.shown ? tipId : undefined} onKeyDown={onKeyDown}>
            {options.map((option, index) => <button key={option.value} ref={element => { refs.current[index] = element; }} type="button" role="radio" data-value={option.value}
                className="puck-segment" aria-checked={index === selected} aria-label={option.label} title={option.label}
                tabIndex={index === selected ? 0 : -1} onClick={() => { if (index !== selected) onSelect(option.value); }}>{option.text ?? option.label}</button>)}
        </div>
    </PuckFrame>;
}
