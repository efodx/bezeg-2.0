import type {Board, GeometryElement, Point} from "jsxgraph";
import {GraphPalette} from "../../styles/GraphPalette";
import {
    arcLength, CatalogueSelection, enclosedArea, PARAMETRIC_CATALOGUE, ParametricCurveId, polarRadius, sourceOf, Velocity, velocityAt,
} from "./parametricCatalogue";

interface SceneSettings {
    board: Board;
    curve: ParametricCurveId;
    /** Read lazily on every draw, so a change of radius or parameter needs no listener and no rebuild. */
    radius: () => number;
    parameter: () => number;
    /** False draws the trace only from the domain start to the parameter (a lesson prediction step). */
    traceFull: () => boolean;
}

/**
 * The owned elements of one catalogue curve: the trace, the moving point, the velocity vector, the radius ray (polar
 * curves) and the rolling circle (cycloid). Every element is created here and removed by {@link dispose}. The numbers
 * (velocity, ray, arc length, area) are {@link values}; the graph shows them as Odčitki rows, not as board text.
 */
export class ParametricScene {
    private readonly board: Board;
    /** The catalogue curve this scene was built for; another curve needs a new scene. */
    readonly curve: ParametricCurveId;
    private elements: GeometryElement[] = [];
    private readonly named: Partial<Record<'curve' | 'velocity' | 'ray' | 'circle', GeometryElement>> = {};
    private disposed = false;
    private measureKey = '';
    private measures = {length: 0, area: 0};

    constructor(private readonly settings: SceneSettings) {
        this.board = settings.board;
        this.curve = settings.curve;
        try {
            this.build();
        } catch (error) {
            // A partly built scene still owns what it created and its language subscription.
            this.dispose();
            throw error;
        }
    }

    ownedElements(): readonly GeometryElement[] {
        return this.elements;
    }

    private selection(): CatalogueSelection {
        return {curve: this.curve, radius: this.settings.radius()};
    }

    /** Arc length and area of the whole trace, recomputed only when the radius changes. */
    private wholeMeasures() {
        const selection = this.selection();
        const key = `${selection.curve}:${selection.radius}`;
        if (key !== this.measureKey) {
            this.measureKey = key;
            this.measures = {length: arcLength(selection), area: enclosedArea(selection)};
        }
        return this.measures;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private build() {
        const entry = PARAMETRIC_CATALOGUE[this.curve];
        const [t0, t1] = entry.domain;
        const polar = entry.kind === 'polar';
        const cycloid = this.curve === 'cycloid';
        const auxiliary = {visible: false, fixed: true, withLabel: false, highlight: false, name: ''};
        const current = () => velocityAt(this.selection(), this.settings.parameter());
        const moving = () => current().status === 'moving';

        this.named.curve = this.create('curve', [
            (u: number) => sourceOf(this.selection()).at(u).point[0],
            (u: number) => sourceOf(this.selection()).at(u).point[1],
            t0, () => this.settings.traceFull() ? t1 : this.settings.parameter(),
        ], {visible: () => this.settings.traceFull() || this.settings.parameter() > t0,
            fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.primaryCurve, strokeWidth: 2.5});

        const origin = this.create<Point>('point', [0, 0], auxiliary);
        const marker = this.create<Point>('point', [() => current().point[0], () => current().point[1]], {
            ...auxiliary, visible: true, size: 4, strokeColor: GraphPalette.primaryCurve, fillColor: GraphPalette.primaryCurve,
        });
        const tip = this.create<Point>('point', [
            () => { const v = current(); return v.status === 'moving' ? v.point[0] + v.vector[0] : NaN; },
            () => { const v = current(); return v.status === 'moving' ? v.point[1] + v.vector[1] : NaN; },
        ], auxiliary);
        // The velocity arrow is dashed, so it is told apart from the radius ray without colour.
        this.named.velocity = this.create('segment', [marker, tip], {
            fixed: true, highlight: false, withLabel: false, lastArrow: {type: 2, size: 6}, strokeWidth: 2.5,
            strokeColor: GraphPalette.comparisonCurve, dash: 2, visible: moving,
        });

        if (polar) {
            this.named.ray = this.create('segment', [origin, marker], {
                fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, dash: 3,
            });
        }
        if (cycloid) {
            const centre = this.create<Point>('point', [() => this.selection().radius * this.settings.parameter(), () => this.selection().radius],
                {...auxiliary, visible: true, size: 2, strokeColor: GraphPalette.constructionAccent, fillColor: GraphPalette.constructionAccent});
            this.named.circle = this.create('circle', [centre, () => this.selection().radius], {
                fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.constructionAccent, strokeWidth: 2,
                dash: 3, fillColor: 'none', fillOpacity: 0,
            });
            this.create('segment', [centre, marker], {
                fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.constructionAccent, strokeWidth: 1.5,
            });
        }

    }

    /**
     * The numbers the Odčitki card shows (they were the board caption lines): the velocity (or the stopped state), the ray radius of polar
     * curves (rho, signed), the arc length of the whole trace and the area.
     */
    values(): {velocity: Velocity; ray: number | undefined; length: number; area: number} {
        const selection = this.selection();
        const parameter = this.settings.parameter();
        const polar = PARAMETRIC_CATALOGUE[this.curve].kind === 'polar';
        const {length, area} = this.wholeMeasures();
        return {velocity: velocityAt(selection, parameter), ray: polar ? polarRadius(selection, parameter) : undefined, length, area};
    }

    /** A drawn element by the graph's legend id; the pieces are created in `build`. */
    element(id: 'curve' | 'velocity' | 'ray' | 'circle'): GeometryElement | undefined {
        return this.named[id];
    }

    /** Removes every owned element (later ones first). Idempotent. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const present = this.elements.filter(element => this.board.objectsList.includes(element)).reverse();
        this.elements = [];
        // JSXGraph's SVG renderer keeps an arrow's <marker> in <defs> after removeObject; the scene is rebuilt on every import.
        const markers = present.flatMap(element => {
            const nodes = element as unknown as {rendNodeTriangleStart?: Element | null; rendNodeTriangleEnd?: Element | null};
            return [nodes.rendNodeTriangleStart, nodes.rendNodeTriangleEnd];
        }).filter((node): node is Element => !!node);
        if (present.length) this.board.removeObject(present);
        for (const marker of markers) marker.remove();
    }
}
