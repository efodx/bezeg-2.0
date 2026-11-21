/**
 * UX picks prototype (boardText): tags a legend row drawn as a JSXGraph text so the board-text card can lift it. The card reads the
 * tagged node's innerHTML; `index` keeps the rows' order. Not for axis names or labels on objects.
 */
export function markBoardLegend(text: unknown, index: number): void {
    const apply = (): void => {
        const node = (text as {rendNode?: Element | null} | null)?.rendNode;
        if (!node) return;
        if (!node.hasAttribute('data-board-legend')) node.setAttribute('data-board-legend', '');
        node.setAttribute('data-board-legend-order', String(index));
    };
    apply();
    // A re-render may replace the node; re-apply after every update of the text (the listener dies with the element).
    (text as {on?: (event: string, fn: () => void) => void} | null)?.on?.('update', apply);
}
