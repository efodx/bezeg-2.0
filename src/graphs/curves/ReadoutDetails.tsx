import React, {useEffect, useRef} from "react";

/**
 * The imperative link between a board overlay and an inspector details list: the graph owns one,
 * the overlay pushes the long readout lines, and the mounted `<ul>` gets `<li>` text written directly, so a drag renders no
 * React. A push with unchanged text writes nothing.
 */
export class ReadoutDetailsController {
    private list?: HTMLUListElement;
    private lines: readonly string[] = [];

    push(lines: readonly string[]): void {
        if (lines.length === this.lines.length && lines.every((line, i) => line === this.lines[i])) return;
        this.lines = [...lines];
        this.write();
    }

    lastLines(): readonly string[] { return this.lines; }

    register(list: HTMLUListElement): () => void {
        this.list = list;
        this.write();
        return () => { if (this.list === list) this.list = undefined; };
    }

    private write(): void {
        const list = this.list;
        if (!list) return;
        while (list.children.length > this.lines.length) list.lastElementChild?.remove();
        this.lines.forEach((line, i) => {
            let item = list.children[i] as HTMLLIElement | undefined;
            if (!item) { item = list.ownerDocument.createElement("li"); list.appendChild(item); }
            if (item.textContent !== line) item.textContent = line;
        });
    }
}

/** The long readouts of a demonstration; its items are written by the controller, not by React. */
export function ReadoutDetails(props: { controller: ReadoutDetailsController; label: string; testId: string }) {
    const list = useRef<HTMLUListElement>(null);
    const {controller, label, testId} = props;
    useEffect(() => (list.current ? controller.register(list.current) : undefined), [controller]);
    return <ul className="inspector-help" aria-label={label} data-testid={testId} ref={list}/>;
}
