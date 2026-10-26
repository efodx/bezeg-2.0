import {Point} from "../../../bezeg/api/point/point";
import {assertPlanarPoints} from "../../../bezeg/impl/point/planar-guard";

/** Runtime guard shared by direct adapter calls and the preset ClassMapper seam. */
export function assertPlanarDto(dto: unknown): void {
    if (!dto || typeof dto !== "object") return;
    const fields = dto as Record<string, unknown>;
    for (const key of ["points", "hodographs", "w"]) {
        const rows = fields[key];
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
            if (Array.isArray(row) && row.length > 2 && row[2] !== 0) {
                throw new Error(`Curve DTO ${key} only supports planar points (z must be 0).`);
            }
        }
    }
}

/** Guard a live JSXGraph adapter before it serializes coordinates into its 2D file format. */
export function assertPlanarAdapter(adapter: unknown): void {
    if (!adapter || typeof adapter !== "object") return;
    const value = adapter as {
        pointControlledCurve?: {getPoints?: () => Point[]};
        getCurve?: () => {w?: Point[]};
    };
    const points = value.pointControlledCurve?.getPoints?.();
    if (points) assertPlanarPoints(points, "curve DTO conversion");
    const hodographs = value.getCurve?.()?.w;
    if (hodographs) assertPlanarPoints(hodographs, "curve DTO conversion");
}
