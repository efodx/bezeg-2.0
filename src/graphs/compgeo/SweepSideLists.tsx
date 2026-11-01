import React from "react";
import "./SweepSideLists.css";

/** One entry of the event queue. Only the head of the queue (the next event) is marked `next`. */
export interface SweepQueueEntry {
    key: string;
    /** Value of `data-queue-entry`. */
    id: string;
    /** The full text, for the accessible name and the tooltip. */
    label: string;
    /** The visible content; defaults to `label`. */
    content?: React.ReactNode;
    next: boolean;
}

/** One entry of the status. `current` entries belong to the current event. */
export interface SweepStatusEntry {
    key: string;
    /** Value of `data-status-entry`. */
    id: string;
    label: string;
    content?: React.ReactNode;
    current: boolean;
    hovered: boolean;
}

export interface SweepSideListsProps {
    /** Prefix of the `data-<prefix>-list` and `data-<prefix>-empty` attributes, e.g. `interval-sweep`. */
    prefix: string;
    queue: readonly SweepQueueEntry[];
    status: readonly SweepStatusEntry[];
    /** Called with the `id` of a status entry on hover or focus, with undefined on leave or blur. */
    onHover(id: string | undefined): void;
    text: {queueLabel: string; queueEmpty: string; queueNext: string; statusLabel: string; statusEmpty: string; statusCurrent: string};
}

/**
 * The event queue and the status of a sweep (C-7), presentational and shared by the interval and segment sweeps. The head of
 * the queue and the current entries of the status are bold with a tint, a bar and a marker, with `aria-current` and a hidden
 * text, so the mark is not colour alone. Hovering or focusing a status entry reports it to the host, which highlights it on the board.
 */
export function SweepSideLists({prefix, queue, status, onHover, text}: SweepSideListsProps) {
    const id = React.useId();
    const queueLabelId = `${id}-queue-label`;
    const statusLabelId = `${id}-status-label`;
    const attr = (name: string, value: string) => ({[`data-${prefix}-${name}`]: value});
    return <>
        <div {...attr("list", "queue")}>
            <p className="inspector-help" id={queueLabelId}>{text.queueLabel}</p>
            {queue.length === 0
                ? <p className="inspector-help" {...attr("empty", "queue")}>{text.queueEmpty}</p>
                : <ol aria-labelledby={queueLabelId} className="sweep-side-list">
                    {queue.map(entry => <li key={entry.key} data-queue-entry={entry.id}
                                            data-next={entry.next ? "" : undefined} aria-current={entry.next ? "step" : undefined}
                                            aria-label={entry.next ? `${entry.label}, ${text.queueNext}` : entry.label} title={entry.label}>
                        {entry.next && <span aria-hidden="true">▸ </span>}
                        {entry.content ?? entry.label}
                        {entry.next && <span className="visually-hidden">{text.queueNext}</span>}
                    </li>)}
                </ol>}
        </div>
        <div {...attr("list", "status")}>
            <p className="inspector-help" id={statusLabelId}>{text.statusLabel}</p>
            {status.length === 0
                ? <p className="inspector-help" {...attr("empty", "status")}>{text.statusEmpty}</p>
                : <ul aria-labelledby={statusLabelId} className="sweep-side-list">
                    {status.map(entry => <li key={entry.key} tabIndex={0} data-status-entry={entry.id}
                                             data-current={entry.current ? "" : undefined} data-hovered={entry.hovered ? "" : undefined}
                                             aria-current={entry.current ? "true" : undefined}
                                             aria-label={entry.current ? `${entry.label}, ${text.statusCurrent}` : entry.label} title={entry.label}
                                             onMouseEnter={() => onHover(entry.id)} onMouseLeave={() => onHover(undefined)}
                                             onFocus={() => onHover(entry.id)} onBlur={() => onHover(undefined)}>
                        {entry.current ? "▸ " : ""}{entry.content ?? entry.label}
                        {entry.current && <span className="visually-hidden">{text.statusCurrent}</span>}
                    </li>)}
                </ul>}
        </div>
    </>;
}
