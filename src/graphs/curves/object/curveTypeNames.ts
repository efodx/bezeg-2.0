/**
 * The curve type identifiers that curve Preset data stores as the first element of each `[type, dto]` entry. They are a
 * file contract: renaming one would make previously exported files fail to import. `ClassMapper` maps each to its adapter.
 */
export const CURVE_TYPE_NAMES = [
    "JSXBezierCurve", "JSXRationalBezierCurve", "JSXPHBezierCurve", "JSXGenericSplineCurve",
    "JSXQuadraticC1SplineCurve", "JSXQubicC2SplineCurve", "JSXQuadraticG1SplineCurve", "JSXSymmetricQuadraticG1SplineCurve",
] as const;

export type CurveTypeName = typeof CURVE_TYPE_NAMES[number];

export function isCurveTypeName(value: unknown): value is CurveTypeName {
    return typeof value === "string" && (CURVE_TYPE_NAMES as readonly string[]).includes(value);
}
