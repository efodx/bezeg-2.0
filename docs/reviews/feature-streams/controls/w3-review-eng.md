# Wave 3 engineering review of d0a72a48

## Medium
- src/graphs/curves/bezier/DecasteljauGraph.tsx:113 and DecasteljauGraph2.tsx:185: `session.on('down', pausePlayback)` pauses on every board press, including a pan (comment says so) and a refused edit. Decision 57 says camera changes and refused edits do not pause. Copied from ArcLengthParametrizationGraph.tsx:151 (older precedent, same deviation). Expected: pause only on a drag/accepted edit, or record the deviation in the spec.
- No test covers the new 'down' pause, the selectedCurveOption pause (DecasteljauGraph.tsx:63, Graph2:52), or BaseCurveGraph.tsx:209/217 (pause on typed edit and removePoint). Reverting those lines leaves the suite green.

## Low
- BaseCurveGraph.tsx:209/217: other accepted edits (curve-control commands such as elevate/reverse, preset load via controls) do not call pausePlayback; only typed point edits, removal, curve switch and board press do. Decision 57 coverage incomplete for De Casteljau.
- DecasteljauGraph.tsx:249-254 lesson 'parameter' action now pauses a running animation (decision 57 intent). A scene "parameter then play" sequence still works (pause then play, synchronous); a scene that sets the parameter while a run plays and expects it to keep playing changes behaviour. Record only.
- Test helpers revealElementTree.ts/playbackElementTree.ts fall back from raw button to RevealButton props; a missing button yields undefined and throws, so they do not hide absence, but tests no longer distinguish RevealButton from a hand-written button (RevealButton.test.tsx covers the markup). TaylorGraph.test dropped the `type==='button'` assertion; RevealButton.test.tsx:12 covers it.

## Cleared
1. Consumers: 23 PlaybackButtons files; onNext/onReset optional, existing callers pass both; `data-playing` added on every play-pause (harmless). Removed keys (stop, parametric_roll_play/stop, arcparam_reduced_motion/play_label/pause_label) have no remaining caller in src/tests; sl.ts/en.ts edited in lockstep. 'stop' lesson command and replayAnimation remain for lessons.
2. Lifecycle: roll driver stopped in unmount/disposeFigureScene/setCurve/import/setRadius/setParameter (ParametricCurveGraph.tsx:168,181,187,193); roll step uses setState so it does not self-pause. Decasteljau animation disposed in unmount; SettledReadout cancelled on unmount (AnimationControls). BaseGraph.pausePlayback only calls beforeFigureCapture (no override on curve graphs), safe without a run.
3. Reduced motion: block renders aria-disabled with reason; lesson-driven playRoll ignores reduced motion (unchanged, recorded).
4. RevealButton: 18 uses, labels/data-action/data-revealed kept, aria-pressed intentionally dropped (decision 59). AngleSlider props equal the three removed copies; Inscribed passes onTypedChange. Linear map toggles now checkbox switches; no src/tests locator by data-action found.
5. Assertions: new tests would fail pre-change (action lists, aria-disabled reason, rolling false after edit, mock pause call).
6. Smoke: only tests/guided-lessons.smoke.spec.cjs:2415 used arc-play-toggle; updated to data-playing. No other spec locates changed controls.

## Not verified
tsc/build/unit/smoke not run; unused `useLanguage` imports in Inscribed/Inversion panels still used (language declared elsewhere); Epicycle/collision conversions (decisions 56, 58) are not in this commit.
