import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {formatCount} from "../../combinatorics/combinatoricsModel";

/** Pointer tolerance in screen pixels around a handle; JSXGraph adds `HIT_SLACK` and tests both sides, so a touch zone is over 44 px across. */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
export const HIT_SLACK = 2;

/** An exact count for display: the digits of the `bigint`, grouped for the current language. The only place separators are added. */
export const countText = (value: bigint): string => formatCount(value, currentLanguage());

/** A small whole number for display (the typographic minus in a negative one, the language's own digits). */
export const smallText = (value: number): string => formatNumber(value, currentLanguage(), 0);

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** A non-negative whole number as superscript digits (a power on the board, where there is no markup). */
export const superscript = (value: number): string => String(value).split("").map(digit => SUPERSCRIPTS[Number(digit)]).join("");

export const pointText = (x: number, y: number): string => t("combinatorics_point_format", {value0: smallText(x), value1: smallText(y)});

export const binomText = (n: number, k: number): string => t("combinatorics_binom_format", {value0: smallText(n), value1: smallText(k)});

export const listText = (items: readonly string[]): string => items.join(t("combinatorics_list_separator"));

export const stepRightText = (): string => t("combinatorics_step_right");
export const stepUpText = (): string => t("combinatorics_step_up");

/** A route string from the model (R and U) shown with the language's step letters. */
export const routeLetters = (route: string): string =>
    route.split("").map(letter => (letter === "R" ? stepRightText() : stepUpText())).join("");

/** The expansion of `(x + c)^n` as board and readout text. */
export const binomialText = (n: number, c: number): string =>
    `(x ${c < 0 ? "−" : "+"} ${smallText(Math.abs(c))})${superscript(n)}`;

/** An owned set of board objects and listeners: everything a graph creates goes through `own`, and `dispose` removes it all. */
export class SceneObjects {
    private objects: JXG.GeometryElement[] = [];
    private listeners: Array<() => void> = [];

    own<E extends JXG.GeometryElement>(element: E): E {
        this.objects.push(element);
        return element;
    }

    listen(off: () => void): void {
        this.listeners.push(off);
    }

    objectCount(): number { return this.objects.length; }
    listenerCount(): number { return this.listeners.length; }

    /** Removes the listeners, then the objects, newest first; safe to call twice and after the board is gone. */
    dispose(board: JXG.Board | undefined): void {
        for (const off of this.listeners.splice(0)) off();
        if (board) {
            const alive = this.objects.filter(object => board.objectsList.includes(object)).reverse();
            if (alive.length) board.removeObject(alive);
        }
        this.objects = [];
    }
}

/** Curve data with NaN between pieces: one merged curve draws many separate polylines. */
export interface Poly {
    readonly x: number[];
    readonly y: number[];
}

export const emptyPoly = (): Poly => ({x: [], y: []});

export function addPolyline(poly: Poly, points: readonly (readonly [number, number])[]): void {
    if (poly.x.length > 0) {
        poly.x.push(NaN);
        poly.y.push(NaN);
    }
    for (const [x, y] of points) {
        poly.x.push(x);
        poly.y.push(y);
    }
}

/** The corners of a closed box around a label at (x, y). */
export const boxPoints = (x: number, y: number, halfWidth: number, halfHeight: number): [number, number][] =>
    [[x - halfWidth, y - halfHeight], [x + halfWidth, y - halfHeight], [x + halfWidth, y + halfHeight], [x - halfWidth, y + halfHeight], [x - halfWidth, y - halfHeight]];
