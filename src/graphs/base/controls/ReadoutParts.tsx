import React, {useLayoutEffect, useRef, useState} from "react";
import "./ReadoutParts.css";

/** Extra `data-*` hooks that a graph's tests or clips read. */
export type DataHooks = Record<`data-${string}`, string>;

/** A readout row: `id` is the `data-readout` hook. With a `label` the row is a term and its value; without, one sentence. */
export type ReadoutListRow = { id: string; value: React.ReactNode; label?: React.ReactNode };

/**
 * The readout list. Labelled rows render as a `dl` (the function readout's look); rows that are a whole translated
 * sentence render as a `ul` with one item each, so the visible text stays as authored. `label` names the list.
 */
export function ReadoutList(props: { label: string; rows: readonly ReadoutListRow[]; hooks?: DataHooks }) {
    const {label, rows, hooks} = props;
    if (rows.length > 0 && rows.every(row => row.label !== undefined)) {
        return <dl className="readout-list" aria-label={label} {...hooks}>
            {rows.map(row => <div key={row.id} className="readout-list-row" data-readout={row.id}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
            </div>)}
        </dl>;
    }
    return <ul className="readout-list readout-list-sentences" aria-label={label} {...hooks}>
        {rows.map(row => <li key={row.id} data-readout={row.id}>{row.value}</li>)}
    </ul>;
}

/** The readout heading above a group of results. */
export function ReadoutHeading(props: { children: React.ReactNode }) {
    return <h3 className="inspector-reveals-title">{props.children}</h3>;
}

/** Muted help or caveat text under a readout: plain text, no `role="note"`. */
export function ReadoutHelp(props: { children: React.ReactNode; hooks?: DataHooks }) {
    return <p className="inspector-help" {...props.hooks}>{props.children}</p>;
}

/**
 * Wraps a wide or tall readout table. It takes a tab stop and a name only while it actually scrolls (sideways, or down when a
 * caller caps its height with `--readout-scroll-max`). The size is measured
 * after every render and whenever the wrapper or one of its children changes size, so content that grows inside a
 * fixed-width wrapper (new rows, a language switch, larger text) is noticed too.
 */
export function ReadoutScrollTable(props: { label: string; children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [scrolls, setScrolls] = useState(false);
    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;
        const measure = () => setScrolls(node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight);
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        Array.from(node.children).forEach(child => observer.observe(child));
        return () => observer.disconnect();
    });
    return <div ref={ref} className="readout-scroll-table" data-scrolls={scrolls ? "true" : "false"}
                {...(scrolls ? {tabIndex: 0, role: "region", "aria-label": props.label} : {})}>{props.children}</div>;
}
