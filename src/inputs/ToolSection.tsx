import React, {useState} from "react";
import {usePick} from "../uxPicks/picks";
import {ChevronDownIcon, HelpIcon} from "../uxPicks/dock/icons";

/**
 * One titled group of the tools (inspector), declared by the graph: its `title`, a stable `id`, whether it folds and its
 * section-level `help`. Nothing is guessed from the markup. Without the "toolsCard" pick it renders the plain
 * `div.inspector-group` with its `h3` and the help as a `p.inspector-help` after the children; with the pick the heading
 * gets a fold chevron (remembered per `id`) and, when there is help, a "?" that opens it under the heading.
 * A section without a `title` is a plain group (nothing to fold or label).
 */
const FOLD_PREFIX = "ux-tools-fold:";

const readFold = (id: string): boolean | null => {
    try {
        const stored = localStorage.getItem(FOLD_PREFIX + id);
        return stored === null ? null : stored === "1";
    } catch { return null; }
};
const writeFold = (id: string, folded: boolean) => {
    try { localStorage.setItem(FOLD_PREFIX + id, folded ? "1" : "0"); } catch { /* ignore */ }
};

export type ToolSectionProps = React.PropsWithChildren<{
    /** The heading. Without it the section is a plain group. */
    title?: React.ReactNode,
    /** Stable, unique among the sections of the tools; keys the stored fold. */
    id: string,
    /** Accessible name when `title` is not a string (e.g. to tell equal titles in two tabs apart). Defaults to `title`. */
    name?: string,
    /** Whether the section can fold (pick toolsCard). Default true. */
    foldable?: boolean,
    /** Section-level help: behind a "?" with the pick, a visible paragraph without it. */
    help?: React.ReactNode,
    /** Folded until the learner chooses otherwise. */
    defaultFolded?: boolean,
    /** Extra classes on the group (`inspector-group` is added for the default element). */
    className?: string,
    /** Title shown only while the toolsCard pick is on (prototype); master keeps a headingless group. */
    pickTitle?: React.ReactNode,
    /** Root element and its heading, for shapes other than `div.inspector-group > h3`: a point-list `fieldset > legend`, a card body `div.card-body > .card-title`, the reveals `div.inspector-reveals > h3.inspector-reveals-title`. `className` then replaces the default group class. */
    element?: React.ElementType,
    headingElement?: React.ElementType,
    headingClassName?: string,
    /** Ref and extra attributes of the root element. */
    rootRef?: React.Ref<HTMLElement>,
    rootProps?: Record<string, unknown>,
}>;

export function ToolSection(props: ToolSectionProps) {
    const on = usePick("toolsCard");
    const {foldable = true, help, children} = props;
    const title = props.title ?? (on ? props.pickTitle : undefined);
    const Root = props.element ?? "div";
    const className = props.element ? props.className : `inspector-group${props.className ? ` ${props.className}` : ""}`;
    const Heading = props.headingElement ?? "h3";
    if (!on || title === undefined) {
        return <Root className={className} ref={props.rootRef} {...props.rootProps}>{title !== undefined && <Heading className={props.headingClassName}>{title}</Heading>}{children}{help && <p className="inspector-help">{help}</p>}</Root>;
    }
    return <PickSection {...props} title={title} className={className} foldable={foldable} Root={Root} Heading={Heading}/>;
}

function PickSection(props: ToolSectionProps & {foldable: boolean, Root: React.ElementType, Heading: React.ElementType}) {
    const {title, id, foldable, help, children, className, Root, Heading} = props;
    const name = props.name ?? (typeof title === "string" ? title : id);
    const [stored, setStored] = useState(() => readFold(id));
    const [helpOpen, setHelpOpen] = useState(false);
    const folded = foldable && (stored ?? props.defaultFolded ?? false);
    const toggle = () => { if (!foldable) return; writeFold(id, !folded); setStored(!folded); };
    return <Root className={className} ref={props.rootRef} {...props.rootProps} data-ux-folded={folded ? "" : undefined} data-ux-help-open={helpOpen ? "" : undefined}>
        <Heading className={props.headingClassName} data-ux-sec="" onClick={toggle}>
            {foldable && <button type="button" className="ux-sec-fold" aria-expanded={!folded} aria-label={`${folded ? "Pokaži" : "Skrij"} razdelek: ${name}`}
                                 onClick={event => { event.stopPropagation(); toggle(); }}><ChevronDownIcon/></button>}
            {title}
            {help && <button type="button" className="ux-sec-help" aria-expanded={helpOpen} aria-label={`Pomoč: ${name}`} title={`Pomoč: ${name}`}
                             onClick={event => { event.stopPropagation(); setHelpOpen(open => !open); }}><HelpIcon/></button>}
        </Heading>
        {help && <div className="inspector-help" data-ux-help-text="">{help}</div>}
        {children}
    </Root>;
}
