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
import {buildCardSpecs, type PresentedGraph} from './cardSpecs';
import {COLUMN_MAX_FRACTION, GAP, MAX_SPAN} from './layoutConstants';
import './presenter.css';

export interface BoardCardsProps {
  graph: PresentedGraph;
  /** The lesson frame's highlighted row and note ids. TODO(task 07): fed from the active frame once the host can reach it. */
  highlight?: readonly string[];
  /** Resolves when fonts and formulas inside the measure layer are final (default: fonts and MathJax). Tests inject. */
  whenReady?: MeasureOptions['whenReady'];
}

interface Drag { id: string; target: DropIndex | 'free'; first: BoardPoint | null }

const NO_WIDTHS: Readonly<Record<string, number>> = {};
const noop = () => undefined;

export function BoardCards({graph, highlight = [], whenReady}: BoardCardsProps) {
  useT(); // a language switch re-renders the cards
  useSyncExternalStore(graph.store.subscribe, () => graph.store.getVersion());
  const declaration = graph.getDeclaration();
  const language = currentLanguage();
  const specs = useMemo(() => (declaration ? buildCardSpecs(graph, declaration, highlight) : []), [declaration, graph, highlight]);

  const [stored, setStored] = useState<StoredBoardLayout>(() => loadBoardLayout());
  const [board, setBoard] = useState<Size>({w: 0, h: 0});
  const [ready, setReady] = useState(false);
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
  const contentKey = `${shapeKey}|${highlight.join(',')}|${JSON.stringify(stored.folds)}`;
  // Fixed widths belong to the arrangement they were assigned for: a new arrangement or content measures from scratch.
  // A fold changes the column width (it counts open cards only), so it ends the widths assigned under the old fold state:
  // a card folded at load would otherwise be measured at the narrow column and stay that wide once unfolded.
  const widthsKey = `${shapeKey}|${placementKey}|${JSON.stringify(stored.folds)}`;
  const widths = widthState.key === widthsKey ? widthState.widths : NO_WIDTHS;

  const items = specs.map(spec => ({
    id: spec.id,
    width: widths[spec.id],
    node: <CardShell id={spec.id} title={spec.title} folded={false} onFold={noop} onReset={noop} onDragMove={noop} onDrop={noop} onDragCancel={noop}><MeasurePassContext.Provider value={true}>{spec.body}</MeasurePassContext.Provider></CardShell>,
  }));
  const {layer: measureLayer, measured, settled} = useMeasuredCards(items, {contentKey, whenReady});

  const inputs = useMemo<CardInput[]>(() => {
    const byId = new Map((measured ?? []).map(card => [card.id, card]));
    return specs.flatMap(spec => {
      const card = byId.get(spec.id);
      return card ? [{...card, priority: spec.priority, defaultAnchor: spec.defaultAnchor, defaultOrder: spec.defaultOrder}] : [];
    });
  }, [measured, specs]);
  const layoutInput: LayoutInput = {
    board, cards: inputs, stored: stored.placements, storedFolds: stored.folds,
    maxSpan: MAX_SPAN, columnMaxFraction: COLUMN_MAX_FRACTION, gap: GAP,
  };
  const laidOut = board.w > 0 && board.h > 0 && inputs.length > 0;
  const base: LayoutResult | null = laidOut ? layoutBoard(layoutInput) : null;

  // Second measurement: a card whose assigned width differs from its natural one is measured again at that width, once,
  // before anything is shown. Widths are only ever added for an arrangement, so this settles.
  // Derived during render (a state update before commit, not an effect), so nothing unsettled is ever painted.
  if (base && settled) {
    const next: Record<string, number> = {...widths};
    let changed = false;
    for (const placed of base.cards) {
      const natural = inputs.find(card => card.id === placed.id)?.natural.w ?? placed.rect.w;
      if (Math.abs(placed.rect.w - natural) > 0.5 && widths[placed.id] !== placed.rect.w) { next[placed.id] = placed.rect.w; changed = true; }
    }
    if (changed) setWidthState({key: widthsKey, widths: next});
    else if (!ready) setReady(true);
  }

  const commit = (next: StoredBoardLayout) => { setStored(next); saveBoardLayout(next); };
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

  const shown = ready && preview ? preview.cards : [];
  return <>
    {measureLayer}
    <div ref={layerRef} className="board-cards-layer" data-board-cards-layer="">
      {shown.map(placed => {
        const spec = specs.find(entry => entry.id === placed.id);
        if (!spec) return null;
        const dragging = drag?.id === placed.id;
        const own = dragging ? base?.cards.find(card => card.id === placed.id) ?? placed : placed;
        return <CardShell key={spec.id} id={spec.id} title={spec.title} rect={own.rect} folded={own.folded} cut={own.cut}
          onFold={folded => commit(setFold(stored, spec.id, folded))}
          onReset={() => commit(resetCard(stored, spec.id))}
          onPickup={point => { pickupRef.current = point ? {id: spec.id, point} : null; }}
          onDragMove={pointer => onDragMove(spec.id, pointer)}
          onDrop={pointer => onDrop(spec.id, pointer)}
          onDragCancel={() => { pickupRef.current = null; setDrag(null); }}>
          {spec.body}
        </CardShell>;
      })}
    </div>
  </>;
}
