/** Unit-circle points and frames for the trigonometry kernel. Pure; all coordinates are computed doubles. */
import {
    addAngles, Angle, angleFromHalfDegrees, halfTurn, reflectInXAxis, reflectInYAxis, toRadians,
} from './angle';

export type Point = readonly [number, number];

/** (cos, sin) of the angle: the point at arc length theta on the unit circle. */
export const pointOnCircle = (a: Angle): Point => {
    const t = toRadians(a);
    return [Math.cos(t), Math.sin(t)];
};

/** Arc length r*theta for the angle (in [0, 2pi)) on a circle of radius r. */
export const arcLength = (a: Angle, r: number): number => r * toRadians(a);

/** Images of e1 and e2 under rotation by the angle: (cos, sin) and (-sin, cos). */
export const rotationFrame = (a: Angle): readonly [Point, Point] => {
    const [c, s] = pointOnCircle(a);
    return [[c, s], [-s, c]];
};

export type SymmetricImages = {
    readonly xAxis: Angle;
    readonly yAxis: Angle;
    readonly origin: Angle;
};

/** Angles of the three symmetric images, by integer operations 720-h, 360-h, h+360. */
export const symmetricImages = (a: Angle): SymmetricImages => ({
    xAxis: reflectInXAxis(a),
    yAxis: reflectInYAxis(a),
    origin: halfTurn(a),
});

/** Point at angle a+b (integer sum of half-degrees). */
export const sumPoint = (a: Angle, b: Angle): Point => pointOnCircle(addAngles(a, b));

/** Point (cos b, sin b) expressed in the frame rotated by a: cos b * e1' + sin b * e2'. */
export const pointInRotatedFrame = (a: Angle, b: Angle): Point => {
    const [e1, e2] = rotationFrame(a);
    const [c, s] = pointOnCircle(b);
    return [c * e1[0] + s * e2[0], c * e1[1] + s * e2[1]];
};

export const allAngles = (): Angle[] => Array.from({length: 720}, (_, h) => angleFromHalfDegrees(h));
