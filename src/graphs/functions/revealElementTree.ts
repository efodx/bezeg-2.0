/**
 * Test helper: finds a shared `RevealButton` element in a collected element tree and shapes it like the host button it renders
 * (`data-action`, `data-revealed`, the swapped label as children, `onClick`), so control tests read it as before.
 */
type Elements = Record<string, any[]>;

export function revealButton(found: Elements, action: string) {
    const element = found.RevealButton?.find((candidate: any) => candidate.props.action === action);
    if (!element) return undefined;
    const {revealed, showLabel, hideLabel, onToggle} = element.props;
    return {props: {'data-action': action, 'data-revealed': revealed, children: revealed ? hideLabel : showLabel, onClick: onToggle}};
}

/** The actions of every `RevealButton` in the tree. */
export function revealActions(found: Elements): string[] {
    return (found.RevealButton ?? []).map((element: any) => element.props.action);
}
