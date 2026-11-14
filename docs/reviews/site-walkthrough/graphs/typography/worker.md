# Typography (C4) worker notes

- Default: `GraphSession.createBoard` and `createAuxiliaryBoard` call `applyBoardTextDefaults(board)` (`src/graphs/styles/BoardText.ts`), which sets `board.options.text.cssDefaultStyle` and `highlightCssDefaultStyle`. JSXGraph 1.14 deep-copies `JXG.Options` into `board.options` per board, so no global mutation. Boards made by tests with `JSXGraph.initBoard` directly are not covered.
- `display: 'internal'` SVG text also takes `cssDefaultStyle` (observed: Arial before, Literata after), so no CSS rule in `App.css` was needed.
- Export: plain HTML labels are exported as SVG `<text>` with the computed `font-family` (`SvgMathLabels.ts:156`), so they follow the stack with no change; internal SVG text is cloned with its style attribute. No export code changed; one test added.
- Fixed literal `fontSize` values (68 lines, file:line) are listed in `.command-logs/sizes.txt` (regenerate: search `fontSize: <number>` under `src/graphs`, excluding tests). Not changed.
- No screenshots taken.
