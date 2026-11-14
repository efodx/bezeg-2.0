# G07 graph worker notes

- Handles: the pool of 8 vertex and 16 control handles stays (no rebuild when the vertex count changes; visibility callbacks). Outline: both `visible` callbacks return false, `syncSceneToModel` returns early. No board objects are created or removed on a switch (host test asserts the owned-object count is unchanged).
- Inspector: for an outline the handles disclosure (both PointListInput lists) is replaced by one `inspector-help` paragraph (`data-testid="epicycle-outline-fixed"`).
- Analysis cache (`cacheFor`) already keys on vertices, spans, parametrization identity, so time steps, setTime and N never re-run `analyzeEpicycle`; the trace is recomputed only when N changes (or loop/parametrization change); the error readout likewise per N. Tests assert object identity of analysis and trace across time steps.
- Presets: `checkEpicycleModel` handles outline; `functionPresetCollections.ts` EPICYCLE_FIELDS lacked `outline` (derived from the circle default), so an `outline` key in scene state went to the flat rule; added `"outline"` (one line).
- Legend still lists polygon, vertices and controls for an outline (left as instructed).
- No screenshots taken.
