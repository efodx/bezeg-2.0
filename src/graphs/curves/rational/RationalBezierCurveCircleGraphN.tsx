import {t} from "../../../localization";
import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {CountSetter} from "../../../inputs/CountSetter";
import {LessonAction} from "../../../learning/model";

export const MIN_CIRCLE_PIECES = 3;
export const MAX_CIRCLE_PIECES = 12;


class RationalBezierCurveGraph extends BaseRationalCurveGraph<BaseGraphStates> {
    defaultPreset(): any {
        return [];
    }

    override initialize() {
        if (this.jxgCurves.length === 0) {
            this.generateCurves(3);
        }
        this.boardUpdate();
    }

    protected override prepareLessonDefaultScene(): void {
        // Importing [] disposes every piece and its points, so the three default pieces are generated from a clean board.
        super.prepareLessonDefaultScene();
        if (this.jxgCurves.length === 0) {
            this.generateCurves(3);
        }
        this.refreshWorkspace();
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'circle-pieces') {
            const count = action.count;
            if (typeof count !== 'number' || !Number.isInteger(count) || count < MIN_CIRCLE_PIECES || count > MAX_CIRCLE_PIECES) {
                throw new Error(`The number of circle pieces must be a whole number from ${MIN_CIRCLE_PIECES} to ${MAX_CIRCLE_PIECES}.`);
            }
            this.setN(count);
            return;
        }
        super.applyLessonAction(action);
    }

    override getGraphCommands(): JSX.Element[] {
        // The minimum is 3: for n = 2 the half-angle is pi/2, cos(pi/2) is about 0, so the middle weight vanishes
        // and the middle control point r / cos(alpha) lies at about 1e16 (a point at infinity).
        return this.state.initialized ? super.getGraphCommands().concat(
            <div key={`circle-pieces-${this.workspaceRevision}`}>
                <div>{t("number_of_curves")}</div>
                <CountSetter onPlus={() => this.setN(this.jxgCurves.length + 1)} onCenter={() => 1}
                             n={this.jxgCurves.length}
                             onMinus={() => this.setN(this.jxgCurves.length - 1)}
                             min={MIN_CIRCLE_PIECES} max={MAX_CIRCLE_PIECES}></CountSetter></div>
        ) : [];
    }

    private generateCurves(n: number) {
        const r = 3;
        const alpha = Math.PI / n;
        const R = r / Math.cos(alpha);
        const evenPoints = [];
        const oddPoints = [];
        for (let i = 0; i <= n; i++) {
            evenPoints.push([r * Math.sin(2 * i * alpha), -r * Math.cos(2 * i * alpha)]);
            oddPoints.push([R * Math.sin((2 * i + 1) * alpha), -R * Math.cos((2 * i + 1) * alpha)]);
        }
        // n=2 is degenerate (middle points at infinity), hence MIN_CIRCLE_PIECES = 3.

        for (let i = 0; i <= n - 1; i++) {
            const p1 = evenPoints[i];
            const p2 = oddPoints[i];
            const p3 = evenPoints[i + 1];
            const w = [1, Math.cos(alpha), 1];
            this.createRationalJSXBezierCurve([p1, p2, p3], w);
        }
        this.boardUpdate();
    }

    private setN(n: number) {
        if (n < MIN_CIRCLE_PIECES || n > MAX_CIRCLE_PIECES) {
            return;
        }
        this.board.suspendUpdate();
        try {
            this.disposeFigureScene();
            this.generateCurves(n);
        } finally {
            this.board.unsuspendUpdate();
        }
        this.refreshWorkspace();
    }
}

export default RationalBezierCurveGraph;
