import React, {useEffect, useRef} from "react";
import {useT} from "../../../localization";

/**
 * The imperative link between the board overlay and the details list, as {@link ArcSpeedPlotController}: the graph owns one,
 * the overlay pushes the long readout lines, and the mounted `<ul>` gets `<li>` text written directly, so a drag renders no
 * React. A push with unchanged text writes nothing.
 */
export class ArcDetailsController {
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

/** The long readouts of the arc-length demonstration; its items are written by the controller, not by React. */
export function ArcDetails(props: { controller: ArcDetailsController }) {
    const t = useT();
    const list = useRef<HTMLUListElement>(null);
    const {controller} = props;
    useEffect(() => (list.current ? controller.register(list.current) : undefined), [controller]);
    return <ul className="inspector-help" aria-label={t("arcparam_details_aria")} data-testid="arc-details" ref={list}/>;
}
