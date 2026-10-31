import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {GraphPalette} from "../../styles/GraphPalette";
import {
    arcLength, CatalogueSelection, enclosedArea, PARAMETRIC_CATALOGUE, ParametricCurveId, polarRadius, sourceOf, velocityAt,
} from "./parametricCatalogue";

interface SceneSettings {
    board: Board;
    curve: ParametricCurveId;
    /** Read lazily on every draw, so a change of radius or parameter needs no listener and no rebuild. */
    radius: () => number;
    parameter: () => number;
    fontSize: () => number;
}

/**
 * The owned elements of one catalogue curve: the trace, the moving point, the velocity vector, the radius ray (polar
 * curves), the rolling circle (cycloid) and a text readout. Every element is created here and removed by {@link dispose};
 * the one subscription (language change, for board text) is released there too.
 */
export class ParametricScene {
    private readonly board: Board;
    private readonly curve: ParametricCurveId;
    private elements: GeometryElement[] = [];
    private stopLanguageUpdates?: () => void;
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

        this.create('curve', [
            (u: number) => sourceOf(this.selection()).at(u).point[0],
            (u: number) => sourceOf(this.selection()).at(u).point[1],
            t0, t1,
        ], {fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.primaryCurve, strokeWidth: 2.5});

        const origin = this.create<Point>('point', [0, 0], auxiliary);
        const marker = this.create<Point>('point', [() => current().point[0], () => current().point[1]], {
            ...auxiliary, visible: true, size: 4, strokeColor: GraphPalette.primaryCurve, fillColor: GraphPalette.primaryCurve,
        });
        const tip = this.create<Point>('point', [
            () => { const v = current(); return v.status === 'moving' ? v.point[0] + v.vector[0] : NaN; },
            () => { const v = current(); return v.status === 'moving' ? v.point[1] + v.vector[1] : NaN; },
        ], auxiliary);
        // The velocity arrow is dashed, so it is told apart from the radius ray without colour.
        this.create('segment', [marker, tip], {
            fixed: true, highlight: false, withLabel: false, lastArrow: {type: 2, size: 6}, strokeWidth: 2.5,
            strokeColor: GraphPalette.comparisonCurve, dash: 2, visible: moving,
        });

        if (polar) {
            this.create('segment', [origin, marker], {
                fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, dash: 3,
            });
        }
        if (cycloid) {
            const centre = this.create<Point>('point', [() => this.selection().radius * this.settings.parameter(), () => this.selection().radius],
                {...auxiliary, visible: true, size: 2, strokeColor: GraphPalette.constructionAccent, fillColor: GraphPalette.constructionAccent});
            this.create('circle', [centre, () => this.selection().radius], {
                fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.constructionAccent, strokeWidth: 2,
                dash: 3, fillColor: 'none', fillOpacity: 0,
            });
            this.create('segment', [centre, marker], {
                fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.constructionAccent, strokeWidth: 1.5,
            });
        }

        const box = () => this.board.getBoundingBox();
        this.create<Text>('text', [
            () => box()[0] + 0.02 * (box()[2] - box()[0]),
            () => box()[1] - 0.02 * (box()[1] - box()[3]),
            () => this.readoutText(),
        ], {
            anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false,
            fontSize: () => this.settings.fontSize(), strokeColor: () => moving() ? GraphPalette.label : GraphPalette.warningText,
        });

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && this.board.renderer) this.board.update();
        });
    }

    /** The readout lines: velocity (or the cusp status), the ray radius of polar curves, the whole arc length and the area. */
    readoutText(): string {
        const num = (value: number) => formatNumber(value, currentLanguage(), 4);
        const selection = this.selection();
        const parameter = this.settings.parameter();
        const velocity = velocityAt(selection, parameter);
        const lines: string[] = [];
        if (velocity.status === 'stopped') {
            lines.push(t("parametric_status_stopped"));
        } else {
            lines.push(t("parametric_velocity_value", {value0: num(velocity.vector[0]), value1: num(velocity.vector[1]), value2: num(velocity.speed)}));
        }
        if (PARAMETRIC_CATALOGUE[this.curve].kind === 'polar') lines.push(t("parametric_ray_value", {value0: num(polarRadius(selection, parameter))}));
        const {length, area} = this.wholeMeasures();
        lines.push(t("arc_length_value", {value0: num(length)}));
        lines.push(t("parametric_area_value", {value0: num(area)}));
        return lines.join("\n");
    }

    /** Removes every owned element (later ones first) and releases the language subscription. Idempotent. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.stopLanguageUpdates?.();
        this.stopLanguageUpdates = undefined;
        const present = this.elements.filter(element => this.board.objectsList.includes(element)).reverse();
        this.elements = [];
        if (present.length) this.board.removeObject(present);
    }
}
