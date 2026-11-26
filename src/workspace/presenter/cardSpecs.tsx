// What cards a graph's declaration gives the board: ids, titles, default places and bodies. Pure of layout.
import type {ReactNode} from 'react';
import {message, type Message} from '../../localization';
import type {GraphDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import type {Anchor} from '../layout/boardLayout';
import {LegendBody, isLegendHidden, shownLegendEntries} from '../cards/LegendBody';
import {ReadoutsBody} from '../cards/ReadoutsBody';
import {SectionBody} from '../cards/SectionBody';

export type PresentedGraph = BaseGraph<BaseGraphState>;

export interface CardSpec {
  id: string;
  title: Message;
  /** Lower folds first when a column is too tall (design rule 5). */
  priority: number;
  defaultAnchor: Anchor;
  defaultOrder: number;
  body: ReactNode;
  /** Changes when the card's rows, entries or blocks change, not when a value does. */
  shape: string;
  /** Starts folded when no stored fold, frame or budget decides (Legenda, `section:` cards). */
  defaultFolded?: boolean;
}

export const READOUTS_ID = 'readouts';
export const LEGEND_ID = 'legend';
export const TOOLS_ID = 'tools';
export const LESSON_ID = 'lesson';
export const sectionCardId = (id: string): string => `section:${id}`;

// Odčitki outranks Orodja (spec: lesson, then Odčitki, then Orodja): under height pressure Orodja folds before Odčitki;
// a column's last open card never folds, so an undeclared graph's only Orodja card stays open.
const PRIORITY = {legend: 1, section: 2, tools: 2.5, readouts: 3} as const;

/** The Orodja card (task 04): every graph has one. It is a live item: it has no measure copy and no body here; the presenter renders
 *  the live panels from the host on every render and reads the card's size from the shown card. */
export function toolsCardSpec(declared: boolean): CardSpec {
  return {
    id: TOOLS_ID, title: message('shell_card_tools'), priority: PRIORITY.tools, defaultAnchor: 'tr', defaultOrder: 1,
    shape: `tools;${declared ? 'declared' : 'undeclared'}`,
    body: null,
  };
}

/** The lesson card (task 04 slice 3b): present while a lesson is active, never folded for height (priority Infinity). Live like Orodja:
 *  the presenter renders the host's lesson slot in the shown card and reads its size there; `body` is unused. */
export function lessonCardSpec(): CardSpec {
  return {id: LESSON_ID, title: message('shell_card_lesson'), priority: Infinity, defaultAnchor: 'tl', defaultOrder: -1, shape: 'lesson', body: null};
}

/** The cards the declaration asks for in the graph's current state, in a fixed order (readouts, legend, sections). */
export function buildCardSpecs(graph: PresentedGraph, declaration: GraphDeclaration, highlight: readonly string[]): CardSpec[] {
  const specs: CardSpec[] = [];
  const legend = declaration.legend ?? [];
  const drawnObject = (id: string) => graph.drawnObject(id);
  const linked = new Set<string>();
  for (const group of declaration.readouts ?? []) for (const row of group.rows) if (row.legend !== undefined) linked.add(row.legend);

  const groups = declaration.readouts ?? [];
  const notes = declaration.notes ?? [];
  if (groups.some(group => group.rows.length > 0) || declaration.formula || notes.length > 0) {
    specs.push({
      id: READOUTS_ID, title: message('shell_card_readouts'), priority: PRIORITY.readouts, defaultAnchor: 'tr', defaultOrder: 0,
      shape: `${declaration.formula ? 'formula' : ''};${groups.map(group => `${group.id}:${group.rows.map(row => row.id).join(',')}`).join('|')};${notes.map(note => note.id).join(',')}`,
      body: <ReadoutsBody formula={declaration.formula} groups={groups} notes={notes} highlight={highlight} legend={legend} drawnObject={drawnObject}/>,
    });
  }

  const shown = shownLegendEntries(legend, drawnObject, linked);
  if (!isLegendHidden(shown)) {
    specs.push({
      // Owner, 2026-11-26: Legenda starts open where it fits; as the lowest priority it is the first card a full column folds (rule 5).
      id: LEGEND_ID, title: message('shell_card_legend'), priority: PRIORITY.legend, defaultAnchor: 'br', defaultOrder: 0,
      shape: shown.map(({entry}) => entry.id).join(','),
      body: <LegendBody legend={legend} drawnObject={drawnObject} linkedIds={linked}/>,
    });
  }

  (declaration.sections ?? []).forEach((section, index) => {
    const parameters = (declaration.parameters ?? []).filter(parameter => parameter.section === section.id);
    const actions = (declaration.actions ?? []).filter(action => action.section === section.id);
    specs.push({
      id: sectionCardId(section.id), title: section.title, priority: PRIORITY.section, defaultAnchor: 'tl', defaultOrder: index, defaultFolded: true,
      shape: `${section.body.length};${parameters.map(parameter => parameter.key).join(',')};${actions.map(action => action.id).join(',')}`,
      body: <SectionBody blocks={section.body} parameters={parameters} actions={actions}
        read={key => graph.parameters?.read(key)} write={(key, value) => { graph.parameters?.write(key, value, 'learner'); }}
        perform={id => graph.performAction(id)}/>,
    });
  });
  return specs;
}
