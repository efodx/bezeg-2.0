import React from "react";

/**
 * A keyboard-accessible inspector group that can be collapsed. The open state belongs to the browser's `<details>`
 * element, so it survives tab switches (the inspector keeps hidden tabs mounted) and graph re-renders while the
 * demonstration stays open, and a newly opened demonstration starts from `defaultOpen`. Toggling it is UI-only: it
 * never touches the graph.
 */
export function InspectorDisclosure(props: React.PropsWithChildren<{
    title: React.ReactNode,
    defaultOpen?: boolean,
    className?: string,
    /** Called when the browser opens or closes the group. */
    onToggle?: (open: boolean) => void,
}>) {
    return <details className={`inspector-disclosure${props.className ? ` ${props.className}` : ""}`} open={props.defaultOpen || undefined}
                    onToggle={props.onToggle && (event => props.onToggle?.(event.currentTarget.open))}>
        <summary>{props.title}</summary>
        <div className="inspector-disclosure-body">{props.children}</div>
    </details>;
}
