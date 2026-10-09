/**
 * Owns freshness for derived geometry values.
 *
 * The graph layer may notify this module when an external or mutable geometry
 * source changes, but mathematical implementations do not depend on React,
 * JSXGraph, or graph context state.
 */
class GeometryCache {
    private _revision = 0;

    get revision(): number {
        return this._revision;
    }

    invalidate(): void {
        this._revision += 1;
    }
}

export const geometryCache = new GeometryCache();
