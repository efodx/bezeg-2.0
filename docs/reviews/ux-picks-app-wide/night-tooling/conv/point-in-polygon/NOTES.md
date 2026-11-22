# point-in-polygon (compgeo/point-in-polygon) - done
Files: src/graphs/compgeo/PointInPolygonGraph.tsx; src/learning/content/compgeoGuidedLessons.ts (pointInPolygon lesson frames; shares the frame ux pattern added for voronoi).
Declared: group verdict ("Poizvedbena točka q"): location, crossings, even-odd, winding, nonzero. Notes: values-hidden, message (open / too few), boundary, not-simple. Legend (drawn only): query, ray + crossing (ray overlay and located), winding-up / winding-down (winding overlay and located). pucks: [] (no sliders).
Sections: pip-query, pip-examples (the example help paragraph stays as p.inspector-help). PointListInput is already a ToolSection.
Removed under pick: the visible status text; the live region (StatusLive) stays.
Frames ux: pip-drag expl (location), ray-reveal expl (crossings, location), boundary expl (crossings, location), winding expl (crossings, winding), pentagram expl (crossings, winding), observations and explore open only; pip-predict none (values hidden).
Inline strings: "lega točke q", "znotraj"/"zunaj"/"odvisno od pravila"/"na robu", legend "presečišče poltraka z robom", "rob, ovojno +1/−1". Row names crossings/winding reuse the key with ": {value0}" stripped; even-odd and nonzero names/values split a catalog sentence at ":".
Contract gaps: sentences with embedded values (no name/value split in catalog).
Checks: tsc clean; unit PointInPolygonGraph.host, LessonActions.host, compgeoPointInPolygonLesson, compgeoGuidedLessons pass; shots none/picks 1440/1024 no errors; card values match the status text.
Defect: lesson walk reports 'director is not defined' page errors (8); the same appears on compgeo/orientation, not from this change (shared uxPicks/BaseGraph code in flight).
