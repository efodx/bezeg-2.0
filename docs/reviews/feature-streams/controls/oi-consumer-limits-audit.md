# Consumer-limits audit: importPresetData vs collection check (point-set, functions, patches, projective)

Contract: anything `importPresetData` throws on or cannot draw is refused by `check` or `consumerRefusal` first.
Result: 0 GAP, 26 override sites OK. Functions audited by sampling (see Not verified).

## Point-set / compgeo (src/graphs/compgeo)
| Graph (importPresetData) | Can throw / reject | Collection covers | Class |
|---|---|---|---|
| PointSetGraph.tsx:506 (+ ~10 subclasses without override) | none (serialize + setState) | pointSetPresetCollection: mode, limits, integer grid, closed | OK |
| BentleyOttmannGraph.tsx:215 | kernel invariant throws (bentleyOttmann.ts:147,190) | check mode=segments, 12 segs, 2^10; `checkBentleyOttmannInput` refuses overlap/degenerate into emptyRun | OK |
| FortuneGraph.tsx:246 | kernel internal-error throws (fortune.ts:165-524) | mode=points, 12 sites, 2^10; fortuneTrace refuses to emptyRun (length 0) | OK |
| IntervalSweepGraph.tsx:214 | none (checkIntervals refuses) | mode=intervals, 10, row check | OK |
| EarClippingGraph.tsx:221 | earClipping.ts:52 >40 vertices | limit 40 = EAR_CLIPPING_MAX_VERTICES; asClosedPolygon coerces mode | OK |
| MonotonePartitionGraph.tsx:238 (+MonotoneTriangulation) | classifyVertices RangeErrors | trace refuses n<3, collinear, not-simple before it | OK |
| HullTraceGraph.tsx:235 / HullRobustnessGraph.tsx:370 | runHullTrace try/catch -> empty | default limit 40 = HULL_TRACE_MAX_POINTS | OK |
| DelaunayGraph.tsx:300 | lawsonTrace try/catch -> NO_RUN; >40 throws | limit 40 = DELAUNAY_MAX_POINTS | OK |
| VoronoiGraph.tsx:791 | voronoiFromDelaunay refuses dup/>40 | limit 40; mode falls back to sites | OK |
| TriangulationGraph.tsx:370 | throws on bad triangle list | collection: triangulationRejection; absent list refused (stricter than import) | OK |
| TraceCurvePairGraph.tsx:210 (BezierHulls, BezierClipping) | curvePairNets undefined unless 6/8 points | curvePairPresetCollection isCurvePairModel | OK |

## Functions (src/graphs/functions)
| BaseFunctionGraph.tsx:277 (45 graphs) | commitModel only | functionCollection(parse): model module parser is authority | OK |
| IterativeFunctionGraph.tsx:119 | normalizeIterationModel clamps step | parser | OK |
| Correlation:247, Epicycle:203, Quadrature:112 | none (analyzeEpicycle has no throw) | parseXModel | OK |

## Patches (src/graphs/patches)
| TensorPatchGraph.tsx:201 (+Join/DeCasteljau/Derivatives/Subdivision via stateOf) | silent return on wrong tag | patchCollection: single entry, tag must match key, degrees, net length, finite triples, ranges | OK |
| TriangularPatchGraph.tsx:161 | same | u+v<=1, n degree | OK |
| CoonsPatchGraph.tsx:86 | same | coonsPresetCollection: 4 pts each, COONS_COORDINATE_LIMIT, linked corners | OK |
Note: Tensor/Triangular accept unbounded finite coordinates; overflow lands in `surfaceUnavailable` (BaseSurfaceGraph:155), not a throw.
Note: PATCH_STATE_FIELDS is shared, so patch-tensor accepts join/subdivision fields and drops them silently (harmless).

## Projective (src/graphs/projective)
| CrossRatio:171, Pascal:245, PolePolar:228, FivePoint:261, ThreeViews:168 | none; degenerate scenes are statuses | parseXModel: ranges, reachability, permutation, distinct a/b/t | OK |

## Not verified
- Functions: 45 graphs, parsers and scene builders not each read; only Base, Iterative, Epicycle, Quadrature, Correlation.
- TraceCurvePairGraph:213 clamps the step with the current `this.state` clip tolerance, not the incoming graphState's; clamp only, not a throw.
- Voronoi/Delaunay exactness at coordinate 2^25 (BigInt rational assumed).
