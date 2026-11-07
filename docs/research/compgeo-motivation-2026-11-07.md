# Motivating computational geometry with real uses

Date: 2026-11-07. Question (owner): which real-life uses could motivate the computational-geometry chapters, as the drawing playground motivates the Bézier chapter? Outcome: the owner chose collision detection ([collision playground spec](../specs/collision-playground.md)). The other uses are kept here for later openers and chapter prose.

## Uses by lesson

| Lesson | Use | Source and caveat |
| --- | --- | --- |
| A4 convex hull | Animal home ranges as the minimum convex polygon around GPS-collar fixes. One outlier inflates the range | [ArcGIS tutorial](https://learn.arcgis.com/en/projects/model-animal-home-range), [Geography Realm](https://www.geographyrealm.com/gis-home-range/): many ecologists now prefer kernel density |
| A4 | Counting fingers: the hull of a hand outline, with convexity defects between fingers (OpenCV `convexityDefects`) | [Example project](https://www.github.com/kostasthanos/Hand-Detection-and-Finger-Counting) |
| A3 point in polygon | Geofencing, finding which municipality a GPS point lies in, hit-testing, SVG `fill-rule` | Standard; not researched further |
| A2 shoelace | Land area from boundary coordinates ("surveyor's formula") | Standard |
| B1 ear clipping | Filled map polygons on WebGL maps. Mapbox `earcut` uses modified ear slicing and was built for Mapbox GL | [mapbox/earcut](https://github.com/mapbox/earcut): its own README claims "fastest" |
| B1 art gallery | Placing guards and cameras. Klee asked the question in 1973, Chvátal published 1975, Fisk's 1978 proof is in *Proofs from THE BOOK* | [Art gallery problem](https://en.wikipedia.org/wiki/Art_gallery_problem) |
| B3 Delaunay | Terrain TINs from lidar; Delaunay avoids thin triangles | [Tinfour](https://awesome.ecosyste.ms/projects/github.com%2Fgwlucastrig%2Ftinfour) |
| B4 Voronoi | John Snow's 1854 cholera map. Deaths cluster in the Broad Street pump's region, and the 1855 version drew that pump's area | [Science History Institute](https://sciencehistory.org/distillations/john-snow-hunts-the-blue-death), [Esri on the mythology](https://www.esri.com/arcgis-blog/products/arcgis-pro/mapping/something-in-the-water-the-mythology-of-snows-map-of-cholera): the pump-handle story is largely myth |
| B4 | Thiessen polygons for basin rainfall: A. H. Thiessen, "Precipitation averages for large areas", *Monthly Weather Review* 39(7), 1911 | [Alfred H. Thiessen](https://en.wikipedia.org/wiki/Alfred_H._Thiessen): page range given as 1082–1084 or 1082–1089 |
| C2 Bentley–Ottmann | GIS map overlay (road and river crossings). The 1979 paper names printed-circuit design | [Bowdoin lecture](https://tildesites.bowdoin.edu/~ltoma/teaching/cs3250-CompGeom/spring18/Lectures/cg-orthosegmintersect.pdf): no source tied it to production DRC tools |
| C3–C4 | Scanline polygon filling | Standard |
| C6 closest pair | Air-traffic near-miss warning (textbook motivation) | dBCKO |

## Parked: the town-map opener

One map where the reader places shops, schools and pharmacies, draws a district and sketches roads and a river. Later reveals add:

- the hull around all places;
- Voronoi "nearest place" regions under a draggable pin (Snow's map);
- point in district and district area;
- the district's triangles (earcut);
- road–river crossings (Bentley–Ottmann).

A candidate opener for the triangulation and Voronoi chapter; not scheduled.
