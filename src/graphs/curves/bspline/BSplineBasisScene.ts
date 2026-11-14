import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {multiplicity, validateKnotVector} from "../../../bezeg/impl/curve/bspline";
import {basisCurveColor, GraphPalette} from "../../styles/GraphPalette";
import {allValuesAt, BasisSamples, clampToDomain, domainNote, lastIndexOf, parameterView, readoutLines, sampleBasis} from "./bsplineBasisModel";
import {bindMovablePointCursor} from "../../base/bindMovablePointCursor";

interface SceneSettings {
    board: Board;
    /** Read lazily on every draw: the scene state is the only copy of the data. */
    knots: () => readonly number[];
    degree: () => number;
    /** The raw parameter of the slider. */
    position: () => number;
    normalized: () => boolean;
    fontSize: () => number;
    /** A drag of knot `index` to the raw value; the model decides. The scene redraws from the state either way. */
    onKnotDrag: (index: number, raw: number) => void;
}

const MARKER_BASE = -0.1;
const MARKER_STEP = -0.07;

/**
 * The owned elements of the B-spline basis plot: one curve per basis function, a marker and a vertical rule at the slider
 * parameter, one draggable marker and one value label per knot, the readout text and the domain text. A scene is built for one
 * basis-function count and knot count; a change of either builds a new scene. Equal knots stack their markers downwards, so every
 * repeated knot stays reachable. {@link dispose} removes every element and releases the language subscription.
 */
export class BSplineBasisScene {
    private readonly board: Board;
    readonly functionCount: number;
    readonly knotCount: number;
    private elements: GeometryElement[] = [];
    private curves: (GeometryElement & {dataX: number[]; dataY: number[]})[] = [];
    private markers: Point[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;
    private cacheKey?: {knots: readonly number[]; degree: number};
    private cacheValue?: BasisSamples;

    constructor(private readonly settings: SceneSettings) {
        this.board = settings.board;
        this.knotCount = settings.knots().length;
        this.functionCount = Math.max(0, lastIndexOf(settings.knots(), settings.degree()) + 1);
        try {
            this.build();
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    ownedElements(): readonly GeometryElement[] { return this.elements; }
    curveElements(): readonly (GeometryElement & {dataX: number[]; dataY: number[]})[] { return this.curves; }
    markerElements(): readonly Point[] { return this.markers; }

    /** Whether this scene has the shape (function and knot count) the state now asks for. */
    fits(knots: readonly number[], degree: number): boolean {
        return knots.length === this.knotCount && lastIndexOf(knots, degree) + 1 === this.functionCount;
    }

    /** True when the state holds a vector the kernel accepts; an invalid one draws nothing. */
    private valid(): boolean {
        const knots = this.settings.knots();
        const degree = this.settings.degree();
        const n = lastIndexOf(knots, degree);
        return n >= degree && validateKnotVector(knots, degree, n).ok;
    }

    /** Samples of all functions, recomputed only when the state's knot array or degree is replaced (a slider move reuses them). */
    private samples(): BasisSamples {
        const knots = this.settings.knots();
        const degree = this.settings.degree();
        if (!this.cacheKey || this.cacheKey.knots !== knots || this.cacheKey.degree !== degree) {
            this.cacheKey = {knots, degree};
            this.cacheValue = sampleBasis(knots, degree);
        }
        return this.cacheValue!;
    }

    private view() {
        return parameterView(this.settings.knots(), this.settings.degree(), this.settings.normalized());
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    /** Display coordinate and height of the marker of knot `index`; repeated knots stack downwards. */
    private markerSpot(index: number): [number, number] {
        const knots = this.settings.knots();
        let rank = 0;
        while (index - rank - 1 >= 0 && knots[index - rank - 1] === knots[index]) rank++;
        return [this.view().toDisplay(knots[index]), MARKER_BASE + MARKER_STEP * rank];
    }

    private build() {
        const quiet = {fixed: true, highlight: false, withLabel: false};
        const degree = this.settings.degree();
        const fixedAt = () => this.settings.knots().length === this.knotCount;

        // Layers, lowest first: functions, slider rule and dots, knot markers and labels, texts.
        for (let i = 0; i < this.functionCount; i++) {
            const curve = this.create<GeometryElement & {dataX: number[]; dataY: number[]; updateDataArray: () => void}>('curve', [[], []],
                {...quiet, strokeColor: basisCurveColor(i), strokeWidth: 2.5});
            curve.updateDataArray = () => {
                const samples = this.valid() ? this.samples() : {t: [], columns: []};
                const view = this.view();
                curve.dataX = samples.t.map(raw => view.toDisplay(raw));
                curve.dataY = samples.columns[i] ? [...samples.columns[i]] : [];
            };
            this.curves.push(curve);
        }

        const atT = () => this.valid() ? this.view().toDisplay(clampToDomain(this.settings.knots(), degree, this.settings.position())) : NaN;
        // Explicit end points: a segment made from coordinate arrays leaves its two implicit points on the board after removal.
        const hidden = {...quiet, visible: false, name: '', size: 0};
        const foot = this.create<Point>('point', [atT, 0], hidden);
        const top = this.create<Point>('point', [atT, 1], hidden);
        this.create('segment', [foot, top], {...quiet, strokeColor: GraphPalette.label, strokeWidth: 1.5, dash: 2});
        for (let i = 0; i < this.functionCount; i++) {
            const height = () => {
                const values = this.valid() ? allValuesAt(this.settings.knots(), this.settings.degree(), this.settings.position()) : undefined;
                return values && fixedAt() ? values[i] : NaN;
            };
            this.create('point', [atT, height], {...quiet, name: '', size: 4, strokeColor: basisCurveColor(i), fillColor: basisCurveColor(i)});
        }

        for (let i = 0; i < this.knotCount; i++) {
            const [x, y] = this.markerSpot(i);
            const marker = this.create<Point>('point', [x, y], {
                name: '', withLabel: false, size: 5, face: '<>', strokeColor: GraphPalette.pointOutline, fillColor: GraphPalette.label,
                highlight: true, fixed: this.settings.normalized(),
            });
            bindMovablePointCursor(marker, this.board);
            marker.on('drag', () => {
                // A released scene's marker may still receive an event: it must not write the state of its successor.
                if (this.disposed) return;
                this.settings.onKnotDrag(i, this.view().toRaw(marker.X()));
                this.sync();
            });
            this.markers.push(marker);
            // The value label sits under the first marker of a run of equal knots and names the multiplicity.
            const labelText = () => {
                const knots = this.settings.knots();
                const mult = multiplicity(knots, knots[i]);
                const shown = formatNumber(this.view().toDisplay(knots[i]), currentLanguage(), 2);
                return mult > 1 ? `${shown} (×${mult})` : shown;
            };
            const first = () => this.settings.knots()[i - 1] !== this.settings.knots()[i];
            this.create<Text>('text', [() => this.markerSpot(i)[0], () => MARKER_BASE + MARKER_STEP * (multiplicity(this.settings.knots(), this.settings.knots()[i]) - 1) - 0.03, labelText], {
                anchorX: 'middle', anchorY: 'top', fixed: true, highlight: false, useMathJax: false, fontSize: () => this.settings.fontSize() - 2,
                strokeColor: GraphPalette.label, visible: () => i === 0 || first(),
            });
        }

        const box = () => this.board.getBoundingBox();
        this.create<Text>('text', [
            () => box()[0] + 0.02 * (box()[2] - box()[0]),
            () => box()[1] - 0.02 * (box()[1] - box()[3]),
            () => this.readoutText().split("\n").join("<br>"),
        ], {anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false, fontSize: () => this.settings.fontSize(),
            strokeColor: GraphPalette.label});
        this.create<Text>('text', [
            () => box()[2] - 0.02 * (box()[2] - box()[0]),
            () => box()[3] + 0.04 * (box()[1] - box()[3]),
            () => this.domainText(),
        ], {anchorX: 'right', anchorY: 'bottom', fixed: true, highlight: false, useMathJax: false, fontSize: () => this.settings.fontSize() - 2,
            strokeColor: GraphPalette.label});

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && this.board.renderer) this.board.update();
        });
    }

    /** The readout lines as one text: the k + 1 active values and their sum. */
    readoutText(): string {
        return readoutLines(this.settings.knots(), this.settings.degree(), this.settings.position(), this.settings.normalized(), currentLanguage()).join("\n");
    }

    domainText(): string {
        return domainNote(this.settings.knots(), this.settings.degree(), this.settings.normalized(), currentLanguage());
    }

    /** Moves each marker to the state (after a drag, a typed edit, a rejected drag or a Preset that kept the shape) and updates its lock. */
    sync(): void {
        if (this.settings.knots().length !== this.knotCount) return;
        const locked = this.settings.normalized();
        this.markers.forEach((marker, i) => {
            const [x, y] = this.markerSpot(i);
            if (marker.X() !== x || marker.Y() !== y) marker.moveTo([x, y]);
            if (marker.getAttribute('fixed') !== locked) marker.setAttribute({fixed: locked});
        });
    }

    /** Removes every owned element (later ones first) and releases the language subscription. Idempotent. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        // A removed point never fires "out": do not leave the board showing its hover cursor.
        if (this.board.containerObj?.style.cursor === 'pointer') this.board.containerObj.style.cursor = 'default';
        this.stopLanguageUpdates?.();
        this.stopLanguageUpdates = undefined;
        const present = this.elements.filter(element => this.board.objectsList.includes(element)).reverse();
        this.elements = [];
        this.curves = [];
        this.markers = [];
        if (present.length) this.board.removeObject(present);
    }
}
