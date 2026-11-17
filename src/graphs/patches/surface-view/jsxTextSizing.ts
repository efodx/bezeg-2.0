/**
 * JSXGraph sizes every text of a board on each full update (`Board.updateElements`), which a drawable rebuild triggers
 * through `unsuspendUpdate`. The surface view's board holds only internal texts (the hidden view3d angle readouts, the
 * empty labels of the view's hidden helper points, the infobox); the labels students read are DOM (`jsxLabels.ts`).
 * Sizing forces a style flush per text (about 34 per step), so a text is sized again only when what it renders changed.
 */

interface SizedText {
    elementClass: number;
    plaintext?: unknown;
    updateSize: () => unknown;
    evalVisProp: (name: string) => unknown;
    visPropCalc?: {visible?: unknown};
}

const OBJECT_CLASS_TEXT = 7;
const GUARDED = Symbol('textSizeGuard');

const sizeKey = (text: SizedText): string =>
    // Visibility is part of the key: a text sized while hidden measures nothing and must be sized again once shown.
    [text.plaintext, text.evalVisProp('fontsize'), text.evalVisProp('cssclass'), text.evalVisProp('display'), text.visPropCalc?.visible].join('|');

/**
 * Makes `updateSize` of each text on the board (own property of that instance, not the JSXGraph prototype) a no-op while
 * its content and font are the ones it was last sized with. Safe to call repeatedly: it guards new texts only.
 */
export function guardTextSizing(objects: readonly unknown[]): void {
    for (const object of objects as SizedText[]) {
        if (object.elementClass !== OBJECT_CLASS_TEXT || typeof object.updateSize !== 'function') continue;
        const marked = object as unknown as Record<symbol, boolean>;
        if (marked[GUARDED]) continue;
        marked[GUARDED] = true;
        const size = object.updateSize;
        let sized: string | undefined;
        object.updateSize = function (this: SizedText) {
            const key = sizeKey(this);
            if (key === sized) return this;
            sized = key;
            return size.call(this);
        };
    }
}
