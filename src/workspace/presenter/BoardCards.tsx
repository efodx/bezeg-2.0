// The card presenter of the board workspace (task 03): renders the cards a graph's declaration asks for over the board.
// Measure (hidden layer) -> layoutBoard -> CardShell. Design: docs/reviews/ux-picks-app-wide/03-layout-design.md.
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {currentLanguage, useT} from '../../localization';
import {CardShell, type BoardPoint} from '../cards/CardShell';
import {
  applyDrop, dropTarget, layoutBoard,
  type CardInput, type DropIndex, type LayoutInput, type LayoutResult, type Placement, type Rect, type Size,
} from '../layout/boardLayout';
import {
  loadBoardLayout, resetCard, saveBoardLayout, setFold, setPlacement, type StoredBoardLayout,
} from '../layout/storedLayout';
import {MeasurePassContext} from '../cards/MeasurePass';
import {useMeasuredCards, type MeasureOptions} from '../layout/useMeasuredCards';
import {moreBarHeight} from '../layout/measureCards';
import {holdHeight, type HeldHeight} from '../layout/holdHeight';
import {ToolsBody, ToolsHeadActions} from '../cards/ToolsBody';
import {LessonCardBody} from '../cards/LessonCardBody';
import {PuckOwnershipContext} from '../../graphs/base/controls/PuckOwnership';
import {PuckStrip, estimateStrip, puckParameters, wrappedStripHeight} from '../pucks/PuckStrip';
import {buildCardSpecs, lessonCardSpec, toolsCardSpec, LESSON_ID, READOUTS_ID, TOOLS_ID, type PresentedGraph} from './cardSpecs';
import type {ToolsSection, WorkspaceCardHost} from './cardHost';
import {COLUMN_MAX_FRACTION, GAP, MAX_SPAN} from './layoutConstants';
import './presenter.css';

export interface BoardCardsProps {
  graph: PresentedGraph;
  /** What the workspace hands the layer: Orodja's panels and Presentation's fold. */
  host: WorkspaceCardHost;
  /** Overrides the open lesson frame's highlighted row and note ids (`host.frame.highlight`). Tests inject. */
  highlight?: readonly string[];
  /** Resolves when fonts and formulas inside the measure layer are final (default: fonts and MathJax). Tests inject. */
  whenReady?: MeasureOptions['whenReady'];
}

type Placed = LayoutResult['cards'][number];
interface Drag { id: string; target: DropIndex | 'free'; first: BoardPoint | null }

const NO_WIDTHS: Readonly<Record<string, number>> = {};
const noop = () => undefined;
const keySet = (joined: string): ReadonlySet<string> => new Set(joined === '' ? [] : joined.split('|'));
const stableDiffers = (a: readonly Placed[], b: readonly Placed[]) => JSON.stringify(a) !== JSON.stringify(b);

/** A stable default: a fresh `[]` per render would rerun specs, inputs and layoutBoard on every render, each drag move included. */
const NO_HIGHLIGHT: readonly string[] = [];

/** First view: two cards start open on a board at least this wide, one below (04-design section 9). */
const BUDGET_WIDE_BOARD = 1200;

/** The Povrni row of the lesson card (GuidedLesson.css `.guided-lesson-card .guided-lesson-restore-row`): always there, so a cut keeps it. */
const LESSON_RESTORE_ROW = 32;

/** Live cards render from the host in the shown card and are read there; they have no hidden measure copy. */
const isLive = (id: string) => id === TOOLS_ID || id === LESSON_ID;

/** Orodja sections a used control can name (`ParameterBase.section` when `placement` is `tools`). */
const TOOLS_SECTIONS: readonly ToolsSection[] = ['edit', 'display', 'save'];

export function BoardCards({graph, host, highlight: highlightOverride, whenReady}: BoardCardsProps) {
  const t = useT(); // a language switch re-renders the cards
  useSyncExternalStore(graph.store.subscribe, () => graph.store.getVersion());
  const declaration = graph.getDeclaration();
  const declared = declaration !== undefined;
  const language = currentLanguage();
  const lessonActive = host.lesson.active;
  // The open frame's highlighted rows and notes (design section 4); the object is stable per frame, so this memoises on it.
  const frame = lessonActive ? host.frame : undefined;
  const highlight = highlightOverride ?? frame?.highlight ?? NO_HIGHLIGHT;
  // Every graph has Orodja; a declared one adds the cards its declaration asks for; an open lesson adds its card. Specs hold the layout
  // facts only: the live cards' content (Orodja's panels, the lesson slot) comes from the host on each render, never from this memo.
  const specs = useMemo(() => [
    ...(lessonActive ? [lessonCardSpec()] : []),
    ...(declaration ? buildCardSpecs(graph, declaration, highlight) : []),
    toolsCardSpec(declared),
  ], [declaration, declared, graph, highlight, lessonActive]);

  const [stored, setStored] = useState<StoredBoardLayout>(() => loadBoardLayout());
  const [board, setBoard] = useState<Size>({w: 0, h: 0});
  const [ready, setReady] = useState(false);
  // The last layout that was final (measured for the current content and every width assigned). It stays on screen while a
  // fold, language or highlight change measures again, so nothing in between is painted and the swap is one glide.
  const [stable, setStable] = useState<readonly Placed[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [widthState, setWidthState] = useState<{key: string; widths: Readonly<Record<string, number>>}>({key: '', widths: NO_WIDTHS});
  const layerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [measuredStrip, setMeasuredStrip] = useState<(Size & {slots: readonly Size[]}) | null>(null);
  const [stableStrip, setStableStrip] = useState<Rect | null>(null);
  // Where the pointer went down in the card: the free drop keeps this grab offset (not the first move's).
  const pickupRef = useRef<{id: string; point: BoardPoint} | null>(null);

  // Board size from the layer, which fills the board.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;
    const read = () => {
      const box = layer.getBoundingClientRect();
      setBoard(previous => previous.w === box.width && previous.h === box.height ? previous : {w: box.width, h: box.height});
    };
    read();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(read);
    observer.observe(layer);
    return () => observer.disconnect();
  }, []);

  // Remeasure on what changes the cards' content, not on every value: language, the declared shapes, highlights, folds.
  const shapeKey = `${language}|${specs.map(spec => `${spec.id}=${spec.shape}`).join('|')}`;
  const placementKey = JSON.stringify(stored.placements);
  // Presentation's Orodja fold overrides the stored one and is never written back.
  const presentedFold = host.toolsFolded;
  // The lesson card's fold belongs to the lesson (explore = folded chip, the lesson's own requests): it is never stored, so a later
  // lesson does not open folded. A request from the lesson wins until the learner folds or opens the card; folding keeps the frame.
  const [lessonFold, setLessonFold] = useState<boolean>();
  const request = host.lesson.foldRequest;
  const handledRequest = useRef(request?.seq);
  useEffect(() => {
    if (request && request.seq !== handledRequest.current) { handledRequest.current = request.seq; setLessonFold(request.folded); }
  }, [request]);
  const [wasActive, setWasActive] = useState(lessonActive);
  if (wasActive !== lessonActive) { setWasActive(lessonActive); if (!lessonActive) setLessonFold(undefined); }
  const lessonCardFolded = lessonActive && lessonFold === true;
  const reportCardFolded = host.lesson.reportCardFolded;
  useEffect(() => { reportCardFolded(lessonCardFolded); }, [lessonCardFolded, reportCardFolded]);
  const effectiveFolds = useMemo(() => {
    const folds = presentedFold === undefined ? stored.folds : {...stored.folds, [TOOLS_ID]: presentedFold};
    return lessonActive && lessonFold !== undefined ? {...folds, [LESSON_ID]: lessonFold} : folds;
  }, [stored.folds, presentedFold, lessonFold, lessonActive]);
  const contentKey = `${shapeKey}|${highlight.join(',')}|${JSON.stringify(effectiveFolds)}`;
  // Fixed widths belong to the arrangement they were assigned for: a new arrangement or content measures from scratch.
  // A fold changes the column width (it counts open cards only), so it ends the widths assigned under the old fold state:
  // a card folded at load would otherwise be measured at the narrow column and stay that wide once unfolded.
  const widthsKey = `${shapeKey}|${placementKey}|${JSON.stringify(effectiveFolds)}`;
  const widths = widthState.key === widthsKey ? widthState.widths : NO_WIDTHS;

  // Orodja is live: it never waits for the measure pass. It renders in the first commit and is read from the shown card.
  const items = specs.map(spec => isLive(spec.id) ? {id: spec.id, node: null, live: true as const} : ({
    id: spec.id,
    width: widths[spec.id],
    node: <CardShell id={spec.id} title={spec.title} measure folded={false} onFold={noop} onReset={noop} onDragMove={noop} onDrop={noop} onDragCancel={noop}><MeasurePassContext.Provider value={true}>{spec.body}</MeasurePassContext.Provider></CardShell>,
  }));
  const {layer: measureLayer, measured, settled, measureLive} = useMeasuredCards(items, {contentKey, whenReady});

  // Within one lesson the card does not shrink from frame to frame (Back/Next stay under the pointer): its height is held at the
  // largest reading, and starts over when the lesson, the board or the language changes.
  const [storedHeld, setLessonHeld] = useState<HeldHeight>();
  const lessonHoldKey = `${lessonActive}|${language}|${board.w}x${board.h}`;
  const lessonReading = measured?.find(card => card.id === LESSON_ID)?.natural.h;
  const lessonHeld = lessonReading === undefined ? storedHeld : holdHeight(storedHeld, lessonHoldKey, lessonReading);
  if (lessonHeld !== storedHeld) setLessonHeld(lessonHeld);
  const heldLessonHeight = lessonHeld?.height;
  const inputs = useMemo<CardInput[]>(() => {
    const byId = new Map((measured ?? []).map(card => [card.id, card]));
    const bar = moreBarHeight(); // the "Več" bar of a cut card sits under the scroll area: a cut adds it to the block it keeps
    return specs.flatMap(spec => {
      let card = byId.get(spec.id);
      if (card && spec.id === LESSON_ID && heldLessonHeight !== undefined) {
        card = {...card, natural: {...card.natural, h: heldLessonHeight}};
      }
      const reserve = spec.id === LESSON_ID ? bar + LESSON_RESTORE_ROW : bar; // the lesson's Povrni row is always there, cut or not
      return card ? [{...card, reserve, priority: spec.priority, defaultAnchor: spec.defaultAnchor, defaultOrder: spec.defaultOrder, defaultFolded: spec.defaultFolded}] : [];
    });
  }, [measured, specs, heldLessonHeight]);
  // First-view budget (04-design section 9): lesson, readouts, tools; an undeclared graph has only Orodja, which starts open.
  const budget = useMemo(() => ({open: board.w >= BUDGET_WIDE_BOARD ? 2 : 1, order: [LESSON_ID, READOUTS_ID, TOOLS_ID]}),
    [board.w]);
  // The open frame (design section 4): the cards it opens, and Orodja when a control it uses lives there. A graph without a
  // declaration names no controls, so its lesson keeps Orodja open for as long as the lesson is active, at any width.
  const usedToolsSection = useMemo(() => {
    const uses = new Set<string>(frame?.uses ?? []);
    const used = [...(declaration?.parameters ?? []), ...(declaration?.actions ?? [])].filter(control => uses.has('key' in control ? control.key : control.id));
    const inTools = used.filter(control => control.placement === 'tools');
    return {usesTools: lessonActive && (declaration === undefined || inTools.length > 0), section: inTools.map(control => control.section).find(section => TOOLS_SECTIONS.includes(section as ToolsSection)) as ToolsSection | undefined};
  }, [declaration, frame, lessonActive]);
  const frameInput = useMemo(() => lessonActive ? {open: frame?.open ?? [], usesTools: usedToolsSection.usesTools} : undefined,
    [lessonActive, frame, usedToolsSection.usesTools]);
  const toolsSectionToShow = usedToolsSection.section;
  const setToolsSection = host.tools.setSection;
  useEffect(() => { if (toolsSectionToShow) setToolsSection(toolsSectionToShow); }, [frame, toolsSectionToShow, setToolsSection]);
  // The pucks (task 05): the declared board range and count parameters the graph binds, in declared order. The strip is laid out at its
  // natural size (measured from its pucks, whose widths are constant), estimated until the first reading.
  const puckList = puckParameters(declaration, graph.parameters?.keys());
  const puckCount = puckList.length;
  const puckKeyList = puckList.map(parameter => parameter.key).join('|');
  const puckKeys = keySet(puckKeyList);
  const natural: Size | undefined = puckCount === 0 ? undefined : measuredStrip ?? estimateStrip(puckCount);
  const boardBounds = useCallback(() => {
    const box = layerRef.current?.getBoundingClientRect();
    return box ? {left: box.left, right: box.right, width: box.width} : undefined;
  }, []);
  const inputWith = (pucks: Size | undefined): LayoutInput => ({
    board, cards: inputs, stored: stored.placements, storedFolds: effectiveFolds, budget, frame: frameInput, pucks,
    maxSpan: MAX_SPAN, columnMaxFraction: COLUMN_MAX_FRACTION, gap: GAP,
  });
  const laidOut = board.w > 0 && board.h > 0 && inputs.length > 0;
  // Wider than the width the layout gives it, the strip wraps to further rows: lay out again at the wrapped height.
  const given = laidOut && natural ? layoutBoard(inputWith(natural)).pucks : null;
  const wrapped = given &&measuredStrip && given.w < measuredStrip.w ? wrappedStripHeight(measuredStrip.slots, given.w) : 0;
  const layoutInput = inputWith(natural && wrapped > natural.h ? {w: natural.w, h: wrapped} : natural);
  const base: LayoutResult | null = laidOut ? layoutBoard(layoutInput) : null;

  // Second measurement: a card whose assigned width differs from its natural one is measured again at that width, once,
  // before anything is shown. Widths are only ever added for an arrangement, so this settles.
  // Derived during render (a state update before commit, not an effect), so nothing unsettled is ever painted.
  let pending = !settled;
  if (base && settled) {
    const next: Record<string, number> = {...widths};
    let changed = false;
    for (const placed of base.cards) {
      if (isLive(placed.id)) continue; // live: read at its shown width, never assigned one
      const natural = inputs.find(card => card.id === placed.id)?.natural.w ?? placed.rect.w;
      if (Math.abs(placed.rect.w - natural) > 0.5 && widths[placed.id] !== placed.rect.w) { next[placed.id] = placed.rect.w; changed = true; }
    }
    // A card whose content is wider than its assigned width (min-content) is not retried again: the layout width wins and the
    // card's body scrolls sideways inside it (CardShell.css, `overflow-x: auto`), so content never spills over the board.
    if (changed) setWidthState({key: widthsKey, widths: next});
    else if (!ready) setReady(true);
    pending = changed;
  }

  const commit = (next: StoredBoardLayout) => { setStored(next); saveBoardLayout(next); };
  // In Presentation the header button owns Orodja's fold: it is not stored. Everywhere else a fold is the learner's stored choice.
  const setToolsOrCardFold = (id: string, folded: boolean) => {
    if (id === LESSON_ID) setLessonFold(folded);
    else if (id === TOOLS_ID && host.toolsFolded !== undefined) host.setToolsFolded(folded);
    else commit(setFold(stored, id, folded));
  };
  const chooseToolsSection = (section: ToolsSection) => {
    host.tools.setSection(section);
    setToolsOrCardFold(TOOLS_ID, false);
  };
  const folds = Object.fromEntries((base?.cards ?? []).map(card => [card.id, card.folded]));
  const dragStored = (state: Drag, rect: Rect | undefined, pointer: BoardPoint, target: DropIndex | 'free'): Record<string, Placement> => {
    const first = state.first ?? pointer;
    const freeAt = rect ? {x: rect.x + pointer.x - first.x, y: rect.y + pointer.y - first.y} : {x: pointer.x, y: pointer.y};
    return applyDrop(stored.placements, state.id, target, {defaults: inputs, freeAt});
  };
  const preview: LayoutResult | null = base && drag
    ? layoutBoard({...layoutInput, stored: dragStored(drag, base.cards.find(card => card.id === drag.id)?.rect, drag.first ?? {x: 0, y: 0}, drag.target), frozenFolds: folds})
    : base;

  const onDragMove = (id: string, pointer: BoardPoint) => {
    if (!base) return;
    const target = dropTarget(layoutInput, id, pointer);
    const pickup = pickupRef.current?.id === id ? pickupRef.current.point : null;
    setDrag(previous => ({id, target, first: previous?.id === id && previous.first ? previous.first : pickup ?? pointer}));
  };
  const onDrop = (id: string, pointer: BoardPoint) => {
    const state: Drag = {id, target: drag?.target ?? 'free', first: drag?.id === id ? drag.first : pickupRef.current?.id === id ? pickupRef.current.point : null};
    setDrag(null);
    pickupRef.current = null;
    if (!base) return;
    const target = dropTarget(layoutInput, id, pointer);
    const rect = base.cards.find(card => card.id === id)?.rect;
    const placements = dragStored(state, rect, pointer, target);
    let next = stored;
    for (const [key, placement] of Object.entries(placements)) {
      if (JSON.stringify(stored.placements[key]) !== JSON.stringify(placement)) next = setPlacement(next, key, placement);
    }
    commit(next);
  };

  const final = ready && !pending && preview !== null;
  const stripRect = final ? preview.pucks : stableStrip;
  if (final && JSON.stringify(stableStrip) !== JSON.stringify(preview.pucks)) setStableStrip(preview.pucks);
  // Where the dragged card would land, drawn under the cards when a drop would dock it; a free drop floats and shows none.
  const ghost = final && drag && drag.target !== 'free' ? preview.cards.find(card => card.id === drag.id)?.rect ?? null : null;
  // Before the first final layout only Orodja is shown: placed from what has been read of it, or unpositioned (no rect) while the board
  // or the card is not measured yet. It keeps one element throughout, so its panels never remount.
  const provisional = (base?.cards ?? []).filter(card => isLive(card.id));
  const shown = final ? preview.cards : stable.length > 0 ? stable : provisional;
  if (final && stableDiffers(stable, preview.cards)) setStable(preview.cards);
  // A live card always has its one element, placed or not: its content (panels, the lesson slot) must never be re-created.
  const liveSpecs = specs.filter(spec => isLive(spec.id));
  const entries = [...shown.map(placed => ({id: placed.id, placed: placed as Placed | null})),
    ...liveSpecs.filter(spec => !shown.some(card => card.id === spec.id)).map(spec => ({id: spec.id, placed: null as Placed | null}))];

  // The strip's natural size: its slots side by side (the strip itself is given the layout's width). Puck widths are constant, so it
  // changes with the declared parameters and the language only.
  const puckShape = `${language}|${JSON.stringify(puckList)}`;
  useLayoutEffect(() => {
    const slots = [...(stripRef.current?.querySelectorAll<HTMLElement>('.puck-slot') ?? [])];
    const w = slots.reduce((sum, slot) => sum + slot.offsetWidth, 0) + 8 * Math.max(0, slots.length - 1);
    const h = Math.max(0, ...slots.map(slot => slot.offsetHeight));
    const sizes = slots.map(slot => ({w: slot.offsetWidth, h: slot.offsetHeight}));
    if (w > 0 && h > 0) setMeasuredStrip(previous => previous && previous.w === w && previous.h === h && JSON.stringify(previous.slots) === JSON.stringify(sizes) ? previous : {w, h, slots: sizes});
  }, [puckShape]);

  // Read the live cards from the shown cards before paint; a changed reading re-renders synchronously. Folded, a body is hidden and
  // says nothing about its size, so the last reading stands.
  useLayoutEffect(() => {
    for (const spec of liveSpecs) {
      const element = layerRef.current?.querySelector<HTMLElement>(`[data-card-id="${spec.id}"]`) ?? null;
      if (element && !shown.find(card => card.id === spec.id)?.folded) measureLive(spec.id, element);
    }
  });
  // The lesson changes inside its own component (a frame, typeset formulas), which does not re-render this layer: its card is read again
  // when its content changes, so the cut follows the text instead of the reading made at the last commit. A reading that did not
  // change is ignored by `measureLive`, and only the content is watched (not the size the layout gives the card), so this settles.
  useEffect(() => {
    if (!lessonActive || typeof MutationObserver === 'undefined') return undefined;
    const element = layerRef.current?.querySelector<HTMLElement>(`[data-card-id="${LESSON_ID}"]`);
    if (!element) return undefined;
    let frameId = 0;
    const read = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => { if (!element.classList.contains('board-card--folded')) measureLive(LESSON_ID, element); });
    };
    const mutations = new MutationObserver(read);
    mutations.observe(element, {childList: true, subtree: true, characterData: true});
    return () => { cancelAnimationFrame(frameId); mutations.disconnect(); };
  }, [lessonActive, measureLive, shown.length]);
  return <>
    {measureLayer}
    <div ref={layerRef} className="board-cards-layer" data-board-cards-layer="">
      {ghost && <div className="board-card-ghost" data-board-drop-target="" aria-hidden="true"
        style={{width: ghost.w, height: ghost.h, transform: `translate(${ghost.x}px, ${ghost.y}px)`}}/>}
      {entries.map(({id, placed}) => {
        const spec = specs.find(entry => entry.id === id);
        if (!spec) return null;
        const dragging = placed !== null && drag?.id === placed.id;
        const own = placed && dragging ? base?.cards.find(card => card.id === placed.id) ?? placed : placed;
        const isTools = spec.id === TOOLS_ID;
        const isLesson = spec.id === LESSON_ID;
        return <CardShell key={spec.id} id={spec.id} title={spec.title} keepMounted={isTools || isLesson} role={isTools ? 'complementary' : 'region'} label={isTools ? t('demonstration_tools') : undefined} rect={own?.rect} folded={own?.folded ?? false} cut={own?.cut}
          headActions={isTools ? <ToolsHeadActions section={host.tools.section} onChoose={chooseToolsSection}/> : undefined}
          onFold={folded => setToolsOrCardFold(spec.id, folded)}
          onReset={() => commit(resetCard(stored, spec.id))}
          onPickup={point => { pickupRef.current = point ? {id: spec.id, point} : null; }}
          onDragMove={pointer => onDragMove(spec.id, pointer)}
          onDrop={pointer => onDrop(spec.id, pointer)}
          onDragCancel={() => { pickupRef.current = null; setDrag(null); }}>
          {isTools ? <PuckOwnershipContext.Provider value={puckKeys}><ToolsBody panels={host.tools.panels} section={host.tools.section} declared={declared} locked={host.tools.locked}/></PuckOwnershipContext.Provider>
            : isLesson ? <LessonCardBody slot={host.lesson.slot}/> : spec.body}
        </CardShell>;
      })}
      {puckCount > 0 && <PuckStrip ref={stripRef} graph={graph} parameters={puckList} actions={declaration?.actions ?? []} bounds={boardBounds} rect={stripRect}/>}
    </div>
  </>;
}
