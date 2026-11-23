// The card presenter of the board workspace (task 03): renders the cards a graph's declaration asks for over the board.
// Measure (hidden layer) -> layoutBoard -> CardShell. Design: docs/reviews/ux-picks-app-wide/03-layout-design.md.
import {useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
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
import {ToolsBody, ToolsHeadActions} from '../cards/ToolsBody';
import {buildCardSpecs, toolsCardSpec, READOUTS_ID, TOOLS_ID, type PresentedGraph} from './cardSpecs';
import type {ToolsSection, WorkspaceCardHost} from './cardHost';
import {COLUMN_MAX_FRACTION, GAP, MAX_SPAN} from './layoutConstants';
import './presenter.css';

export interface BoardCardsProps {
  graph: PresentedGraph;
  /** What the workspace hands the layer: Orodja's panels and Presentation's fold. */
  host: WorkspaceCardHost;
  /** The lesson frame's highlighted row and note ids. TODO(task 07): fed from the active frame once the host can reach it. */
  highlight?: readonly string[];
  /** Resolves when fonts and formulas inside the measure layer are final (default: fonts and MathJax). Tests inject. */
  whenReady?: MeasureOptions['whenReady'];
}

type Placed = LayoutResult['cards'][number];
interface Drag { id: string; target: DropIndex | 'free'; first: BoardPoint | null }

const NO_WIDTHS: Readonly<Record<string, number>> = {};
const noop = () => undefined;
const stableDiffers = (a: readonly Placed[], b: readonly Placed[]) => JSON.stringify(a) !== JSON.stringify(b);

/** A stable default: a fresh `[]` per render would rerun specs, inputs and layoutBoard on every render, each drag move included. */
const NO_HIGHLIGHT: readonly string[] = [];

/** First view: two cards start open on a board at least this wide, one below (04-design section 9). */
const BUDGET_WIDE_BOARD = 1200;

export function BoardCards({graph, host, highlight = NO_HIGHLIGHT, whenReady}: BoardCardsProps) {
  const t = useT(); // a language switch re-renders the cards
  useSyncExternalStore(graph.store.subscribe, () => graph.store.getVersion());
  const declaration = graph.getDeclaration();
  const declared = declaration !== undefined;
  const language = currentLanguage();
  // Every graph has Orodja; a declared one adds the cards its declaration asks for. Specs hold the layout facts only: Orodja's live
  // panels come from the host on each render (below), never from this memo.
  const specs = useMemo(() => [...(declaration ? buildCardSpecs(graph, declaration, highlight) : []), toolsCardSpec(declared)],
    [declaration, declared, graph, highlight]);

  const [stored, setStored] = useState<StoredBoardLayout>(() => loadBoardLayout());
  const [board, setBoard] = useState<Size>({w: 0, h: 0});
  const [ready, setReady] = useState(false);
  // The last layout that was final (measured for the current content and every width assigned). It stays on screen while a
  // fold, language or highlight change measures again, so nothing in between is painted and the swap is one glide.
  const [stable, setStable] = useState<readonly Placed[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [widthState, setWidthState] = useState<{key: string; widths: Readonly<Record<string, number>>}>({key: '', widths: NO_WIDTHS});
  const layerRef = useRef<HTMLDivElement>(null);
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
  const effectiveFolds = useMemo(() => presentedFold === undefined ? stored.folds : {...stored.folds, [TOOLS_ID]: presentedFold},
    [stored.folds, presentedFold]);
  const contentKey = `${shapeKey}|${highlight.join(',')}|${JSON.stringify(effectiveFolds)}`;
  // Fixed widths belong to the arrangement they were assigned for: a new arrangement or content measures from scratch.
  // A fold changes the column width (it counts open cards only), so it ends the widths assigned under the old fold state:
  // a card folded at load would otherwise be measured at the narrow column and stay that wide once unfolded.
  const widthsKey = `${shapeKey}|${placementKey}|${JSON.stringify(effectiveFolds)}`;
  const widths = widthState.key === widthsKey ? widthState.widths : NO_WIDTHS;

  // Orodja is live: it never waits for the measure pass. It renders in the first commit and is read from the shown card.
  const items = specs.map(spec => spec.id === TOOLS_ID ? {id: spec.id, node: null, live: true as const} : ({
    id: spec.id,
    width: widths[spec.id],
    node: <CardShell id={spec.id} title={spec.title} measure folded={false} onFold={noop} onReset={noop} onDragMove={noop} onDrop={noop} onDragCancel={noop}><MeasurePassContext.Provider value={true}>{spec.body}</MeasurePassContext.Provider></CardShell>,
  }));
  const {layer: measureLayer, measured, settled, measureLive} = useMeasuredCards(items, {contentKey, whenReady});

  const inputs = useMemo<CardInput[]>(() => {
    const byId = new Map((measured ?? []).map(card => [card.id, card]));
    return specs.flatMap(spec => {
      const card = byId.get(spec.id);
      return card ? [{...card, priority: spec.priority, defaultAnchor: spec.defaultAnchor, defaultOrder: spec.defaultOrder, defaultFolded: spec.defaultFolded}] : [];
    });
  }, [measured, specs]);
  // First-view budget (04-design section 9): lesson, readouts, tools; an undeclared graph has only Orodja, which starts open.
  const budget = useMemo(() => ({open: board.w >= BUDGET_WIDE_BOARD ? 2 : 1, order: declared ? ['lesson', READOUTS_ID, TOOLS_ID] : [TOOLS_ID]}),
    [board.w, declared]);
  const layoutInput: LayoutInput = {
    board, cards: inputs, stored: stored.placements, storedFolds: effectiveFolds, budget,
    maxSpan: MAX_SPAN, columnMaxFraction: COLUMN_MAX_FRACTION, gap: GAP,
  };
  const laidOut = board.w > 0 && board.h > 0 && inputs.length > 0;
  const base: LayoutResult | null = laidOut ? layoutBoard(layoutInput) : null;

  // Second measurement: a card whose assigned width differs from its natural one is measured again at that width, once,
  // before anything is shown. Widths are only ever added for an arrangement, so this settles.
  // Derived during render (a state update before commit, not an effect), so nothing unsettled is ever painted.
  let pending = !settled;
  if (base && settled) {
    const next: Record<string, number> = {...widths};
    let changed = false;
    for (const placed of base.cards) {
      if (placed.id === TOOLS_ID) continue; // live: read at its shown width, never assigned one
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
    if (id === TOOLS_ID && host.toolsFolded !== undefined) host.setToolsFolded(folded);
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
  // Where the dragged card would land, drawn under the cards when a drop would dock it; a free drop floats and shows none.
  const ghost = final && drag && drag.target !== 'free' ? preview.cards.find(card => card.id === drag.id)?.rect ?? null : null;
  // Before the first final layout only Orodja is shown: placed from what has been read of it, or unpositioned (no rect) while the board
  // or the card is not measured yet. It keeps one element throughout, so its panels never remount.
  const provisional = (base?.cards ?? []).filter(card => card.id === TOOLS_ID);
  const shown = final ? preview.cards : stable.length > 0 ? stable : provisional;
  if (final && stableDiffers(stable, preview.cards)) setStable(preview.cards);
  const toolsPlaced = shown.find(card => card.id === TOOLS_ID);

  // Read Orodja from the shown card before paint; a changed reading re-renders synchronously. Folded, its body is hidden and says
  // nothing about its size, so the last reading stands.
  useLayoutEffect(() => {
    const element = layerRef.current?.querySelector<HTMLElement>(`[data-card-id="${TOOLS_ID}"]`) ?? null;
    if (element && !toolsPlaced?.folded) measureLive(TOOLS_ID, element);
  });
  return <>
    {measureLayer}
    <div ref={layerRef} className="board-cards-layer" data-board-cards-layer="">
      {ghost && <div className="board-card-ghost" data-board-drop-target="" aria-hidden="true"
        style={{width: ghost.w, height: ghost.h, transform: `translate(${ghost.x}px, ${ghost.y}px)`}}/>}
      {[...shown, ...(toolsPlaced ? [] : [null])].map(placed => {
        const spec = specs.find(entry => entry.id === (placed?.id ?? TOOLS_ID));
        if (!spec) return null;
        const dragging = placed !== null && drag?.id === placed.id;
        const own = placed && dragging ? base?.cards.find(card => card.id === placed.id) ?? placed : placed;
        const isTools = spec.id === TOOLS_ID;
        return <CardShell key={spec.id} id={spec.id} title={spec.title} keepMounted={isTools} role={isTools ? 'complementary' : 'region'} label={isTools ? t('demonstration_tools') : undefined} rect={own?.rect} folded={own?.folded ?? false} cut={own?.cut}
          headActions={isTools ? <ToolsHeadActions section={host.tools.section} onChoose={chooseToolsSection}/> : undefined}
          onFold={folded => setToolsOrCardFold(spec.id, folded)}
          onReset={() => commit(resetCard(stored, spec.id))}
          onPickup={point => { pickupRef.current = point ? {id: spec.id, point} : null; }}
          onDragMove={pointer => onDragMove(spec.id, pointer)}
          onDrop={pointer => onDrop(spec.id, pointer)}
          onDragCancel={() => { pickupRef.current = null; setDrag(null); }}>
          {isTools ? <ToolsBody panels={host.tools.panels} section={host.tools.section} declared={declared} locked={host.tools.locked}/> : spec.body}
        </CardShell>;
      })}
    </div>
  </>;
}
