# Task 4 F4 worker note

F4 done. Production: Accumulation:302, ArcLength:161,179, AreaBetweenCurves:188,206,222, Darboux:267, DefiniteIntegral:187,213, Quadrature:213 (destructures -> this.model); DensityArea:151,185 (stateSnapshot -> this.model).
Tests: removed `expect(graph.state).toMatchObject(graph.model)` (the preceding `toEqual(graph.model)` already asserts values) in DefiniteIntegral, Darboux, Accumulation, AreaBetweenCurves, ArcLength; removed `replaceState({...state,...model})` syncs (DefiniteIntegral x2, AreaBetweenCurves x1); AreaBetweenCurves.test 385/389 now drive `apply(mode/parameter)`; 438/440 read graph.model. Test titles lost ", with the flat state following it".
Unit: 11 files, 202 passed (.command-logs/2026-11-07T06-02-07-921Z-25972-ad261c0f.log). Typecheck passed. Grep clean (only "never this.state" comments).
