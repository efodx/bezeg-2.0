import {GraphPalette} from "../../styles/GraphPalette";
import {PointStyles} from "../../styles/PointStyles";
import {SegmentStyles} from "../../styles/SegmentStyles";
import BaseGraph from "../../base/BaseGraph";
import {SizeContext} from "../../context/SizeContext";

function withName(name: string) {
    return {...PointStyles.default, name: name};
}

function withColor(color: string) {
    return {...SegmentStyles.controlPolygon, color: color};
}

function withRadius(r: number) {
    const label = PointStyles.default.label;
    label!.anchorY = "auto";
    label!.anchorX = "auto";
    return {radius: r, color: GraphPalette.constructionAccent, label: label, name: "$$a$$"};
}

export class IzpeljavaGraf extends BaseGraph<any, any> {
    private unsubscribeMoveListener?: () => void;
    private sourcePoint?: JXG.Point;
    private derivedPoint?: JXG.Point;
    private sourceAngle?: JXG.Angle;


    defaultPreset(): string {
        return "";
    }

    initialize(): void {
        this.unsubscribeMoveListener?.();
        this.unsubscribeMoveListener = undefined;
        const r = 1;
        const x = 0.4;
        const s = -0.75;
        const S = this.board.create('point', [0, s], withName("$$S$$"));
        const p0 = this.board.create('point', [() => Math.sqrt(r ** 2 - S.Y() ** 2), 0], withName("$$p_0$$"));
        const p1 = this.board.create('point', [0, 1], withName("$$p_1$$"));
        const p2 = this.board.create('point', [() => -Math.sqrt(r ** 2 - S.Y() ** 2), 0], withName("$$p_2$$"));
        const O = this.board.create('point', [() => 0, () => 0], withName("$$O$$"));
        const X = this.board.create('point', [() => 0, () => 1 + S.Y()], withName("$$T$$"));

        const circle = this.board.create('circle', [S, 1], {
            strokeWidth: () => SizeContext.strokeWidth
        });


        const segment = this.board.create('segment', [S, p1], withColor(GraphPalette.constructionLevels[0]));
        const segment2 = this.board.create('segment', [S, p2], withColor(GraphPalette.constructionLevels[0]));
        const segment3 = this.board.create('segment', [S, p0], withColor(GraphPalette.constructionLevels[0]));
        const segment4 = this.board.create('segment', [p2, p1], withColor(GraphPalette.constructionLevels[0]));
        const segment5 = this.board.create('segment', [p0, p1], withColor(GraphPalette.constructionLevels[0]));
        const segment6 = this.board.create('segment', [p2, p0], withColor(GraphPalette.constructionLevels[0]));

        const angle1 = this.board.create('angle', [O, p0, S], withRadius(0.4)) as JXG.Angle;
        const angle2 = this.board.create('angle', [O, p1, p0], withRadius(0.4));

        this.sourcePoint = S;
        this.derivedPoint = p1;
        this.sourceAngle = angle1;
        this.subscribeConstructionUpdate();

    }

    protected override captureFigureRuntimeState(): unknown {
        return {sourceY: this.sourcePoint?.Y() ?? -0.75};
    }

    protected override restoreFigureRuntimeState(runtimeState: unknown): void {
        const sourceY = (runtimeState as {sourceY?: number} | undefined)?.sourceY;
        if (typeof sourceY !== "number" || !Number.isFinite(sourceY) || !this.sourcePoint || !this.derivedPoint || !this.sourceAngle) return;
        this.unsubscribeMoveListener?.();
        this.unsubscribeMoveListener = undefined;
        this.sourcePoint.moveTo([0, sourceY]);
        this.board.update();
        this.updateConstruction(this.sourcePoint, this.derivedPoint, this.sourceAngle);
        this.subscribeConstructionUpdate();
    }

    protected override disposeFigureScene(): void {
        this.unsubscribeMoveListener?.();
        this.unsubscribeMoveListener = undefined;
        this.sourcePoint = undefined;
        this.derivedPoint = undefined;
        this.sourceAngle = undefined;
    }

    private subscribeConstructionUpdate(): void {
        if (!this.sourcePoint || !this.derivedPoint || !this.sourceAngle) return;
        const sourcePoint = this.sourcePoint;
        const derivedPoint = this.derivedPoint;
        const sourceAngle = this.sourceAngle;
        this.unsubscribeMoveListener = this.getActiveGraphSession()?.on('move', () => {
            this.updateConstruction(sourcePoint, derivedPoint, sourceAngle);
        });
    }

    private updateConstruction(sourcePoint: JXG.Point, derivedPoint: JXG.Point, sourceAngle: JXG.Angle): void {
        sourcePoint.moveTo([0, sourcePoint.Y()]);
        // @ts-ignore
        const alpha = sourceAngle.Value('radian');
        derivedPoint.moveTo([0, 1 * (1 - Math.pow(Math.sin(alpha), 2)) / Math.sin(alpha)]);
    }

    override presets(): string | undefined {
        return "izpeljava-graf";
    }
}
