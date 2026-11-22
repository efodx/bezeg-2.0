# voronoi (compgeo/voronoi; DegenerateSitesGraph inherits) - done
Files: src/graphs/compgeo/VoronoiGraph.tsx (workspaceUx), VoronoiControls.tsx (ToolSections, pick-gated text, exported siteList/vertexTextOf/fourPointText), src/learning/content/compgeoGuidedLessons.ts (frame ux pattern + voronoi frames; point-in-polygon below if done).
Declared ids: groups diagram (sites, vertices, edges, rays, lines, bounded, unbounded), vertex-list (vertex-N), query (query-point, nearest), triangle (triangle-vertex, triangle-sites). Notes: collinear, construction, four-incircle/vertices/diagonal-*/verdict. Legend (drawn only): diagram, delaunay, query. pucks: [] (no sliders). No readoutHelp/sections/formula.
Tool sections: voronoi-modes, voronoi-triangles, voronoi-construct, voronoi-query, voronoi-reset (h3 keeps inspector-reveals-title class). No section help (graph had none).
Removed under pick: count list, vertex list, query-at/nearest, construction text, collinear and four-point text, selected-vertex sentence. Alerts (refusal, wrong count, mode refused) and the live region stay.
Frames ux: vor-cell (open), vor-diagram expl (vertices, edges, rays) / obs open, vor-dual expl (triangle-vertex) / obs open, vor-explore expl (nearest) / obs open.
Inline strings: "točka", "najbližje mesto", "V1..", "središče trikotnika P..", "enako oddaljeno od mesti". Count names reuse vor_count_* keys with the ": {value0}" tail stripped.
Contract gaps: catalog texts are sentences with a value inside, no name/value split; construction progress is a sentence (note), not a row.
Checks: tsc clean; unit VoronoiGraph.host, DegenerateSites.host, compgeoGuidedLessons pass; no page errors in none/picks/1024/walk. Card values match none shot (7,7,8,5,2,5).
Defects: not checked off-diagram (refusal) state, four-point mode visually.
