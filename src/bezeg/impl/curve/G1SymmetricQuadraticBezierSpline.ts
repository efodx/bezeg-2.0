import {QuadraticJoinedSpline} from "./quadratic-joined-spline";

/** Each join sits on its segment at the user-editable fraction b[j] (default the midpoint), giving G1 continuity. */
export class G1SymmetricQuadraticBezierSpline extends QuadraticJoinedSpline {

    protected joinWeights(_l: number, j: number): readonly [number, number] {
        return [1 - this.b[j], this.b[j]];
    }

    override generateBezierCurves() {
        // One parameter per join; regenerating resets them to the midpoint.
        this.b = new Array(Math.max(0, this.points.length - 3)).fill(0.5);
        super.generateBezierCurves();
    }
}
