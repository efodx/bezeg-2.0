import {t as translate} from "../../localization";
import {Hom} from "../../projective/homogeneous";
import {exactEquation} from "./polePolarText";
import {pointText} from "./polePolarModel";
import {isLineAtInfinity, PascalScene} from "./pascalModel";

type Translate = typeof translate;

export const PASCAL_POINT_NAMES = ["P₁", "P₂", "P₃"] as const;
/** The side pairs whose intersections are the Pascal points: P₁ = s₁ ∩ s₄, P₂ = s₂ ∩ s₅, P₃ = s₃ ∩ s₆. */
export const SIDE_NAMES = ["s₁", "s₂", "s₃", "s₄", "s₅", "s₆"] as const;
const PAIR_TEXT = ["s₁ ∩ s₄", "s₂ ∩ s₅", "s₃ ∩ s₆"] as const;

export type PascalKind = "collinear" | "not-collinear" | "undefined-side" | "coincident-opposite-sides";

/** The scene as readable text: what the board draws, for the inspector, the board text and assistive technology. */
export interface PascalText {
    readonly kind: PascalKind;
    /** The one-sentence state; the only text in the live region. */
    readonly status: string;
    readonly determinant?: string;
    /** One line per Pascal point (empty when the result is not ok). */
    readonly points: readonly string[];
    readonly line?: string;
    readonly hexagon: string;
}

const minus = (text: string): string => text.replace("-", "−");

export function describePascal(scene: PascalScene, t: Translate): PascalText {
    const vertex = (i: number): string => scene.names[scene.order[i % 6]];
    const hexagon = t("projective_k2_hexagon", {value0: scene.order.map(handle => scene.names[handle]).join(" ")});
    const result = scene.result;
    if (result.status === "undefined-side") {
        const first = vertex(result.side);
        const second = vertex(result.side + 1);
        return {
            kind: "undefined-side", hexagon, points: [],
            status: t("projective_k2_status_undefined_side", {value0: first, value1: second, value2: SIDE_NAMES[result.side]}),
        };
    }
    if (result.status === "coincident-opposite-sides") {
        return {
            kind: "coincident-opposite-sides", hexagon, points: [],
            status: t("projective_k2_status_coincident", {value0: SIDE_NAMES[result.pair], value1: SIDE_NAMES[result.pair + 3]}),
        };
    }
    const points = scene.pascalPoints.map((entry, i) => {
        const name = `${PASCAL_POINT_NAMES[i]} = ${PAIR_TEXT[i]}`;
        if (entry.view.kind === "ideal") {
            return t("projective_k2_point_ideal", {value0: name, value1: minus(String(entry.view.direction[0])), value2: minus(String(entry.view.direction[1]))});
        }
        const where = pointText(entry.point);
        return entry.offBox ? t("projective_k2_point_off", {value0: name, value1: where}) : t("projective_k2_point", {value0: name, value1: where});
    });
    return {
        kind: result.collinear ? "collinear" : "not-collinear", hexagon, points,
        status: result.collinear ? t("projective_k2_status_exact") : t("projective_k2_status_not_collinear", {value0: minus(String(result.determinant))}),
        determinant: result.collinear ? t("projective_k2_determinant_zero") : t("projective_k2_determinant", {value0: minus(String(result.determinant))}),
        line: lineText(result.line, result.collinear, t),
    };
}

function lineText(line: Hom | null, collinear: boolean, t: Translate): string | undefined {
    if (!collinear) return undefined;
    if (line === null) return t("projective_k2_line_none");
    return isLineAtInfinity(line) ? t("projective_k2_line_infinity") : t("projective_k2_line", {value0: exactEquation(line)});
}
