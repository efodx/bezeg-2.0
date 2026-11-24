import {useId} from 'react';
import type {KeyboardEvent} from 'react';
import {PuckFrame, useTip} from './PuckParts';

export interface TogglePuckProps {
    /** The accessible name and the visible label (the action's label). */
    label: string;
    help?: string;
    pressed: boolean;
    /** Flips the state; the caller writes it as the learner. */
    onToggle(): void;
}

/** A declared toggle action as a puck (task 05 slice 6): a switch. Space or Enter flips it, and so does a click anywhere on its body. */
export function TogglePuck(props: TogglePuckProps) {
    const {label, pressed, onToggle} = props;
    const tip = useTip();
    const tipId = useId();
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            if (!event.repeat) onToggle();
        }
    };
    return <PuckFrame label={label} help={props.help} locked={false} lockReason="" tip={tip.shown ? props.help : undefined} tipId={tipId} className="puck-toggle">
        <div {...tip.handlers} className="puck-body puck-toggle-body" role="switch" tabIndex={0} aria-label={label} aria-checked={pressed}
             aria-describedby={tip.shown ? tipId : undefined} onClick={onToggle} onKeyDown={onKeyDown}>
            <span className="puck-switch" aria-hidden="true"><span className="puck-switch-thumb"/></span>
        </div>
    </PuckFrame>;
}
