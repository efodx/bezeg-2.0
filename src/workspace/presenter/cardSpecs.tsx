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
}

export const READOUTS_ID = 'readouts';
export const LEGEND_ID = 'legend';
export const sectionCardId = (id: string): string => `section:${id}`;

const PRIORITY = {legend: 1, section: 2, readouts: 3} as const;

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
      id: LEGEND_ID, title: message('shell_card_legend'), priority: PRIORITY.legend, defaultAnchor: 'br', defaultOrder: 0,
      shape: shown.map(({entry}) => entry.id).join(','),
      body: <LegendBody legend={legend} drawnObject={drawnObject} linkedIds={linked}/>,
    });
  }

  (declaration.sections ?? []).forEach((section, index) => {
    const parameters = (declaration.parameters ?? []).filter(parameter => parameter.section === section.id);
    const actions = (declaration.actions ?? []).filter(action => action.section === section.id);
    specs.push({
      id: sectionCardId(section.id), title: section.title, priority: PRIORITY.section, defaultAnchor: 'tl', defaultOrder: index,
      shape: `${section.body.length};${parameters.map(parameter => parameter.key).join(',')};${actions.map(action => action.id).join(',')}`,
      body: <SectionBody blocks={section.body} parameters={parameters} actions={actions}
        read={key => graph.parameters?.read(key)} write={(key, value) => { graph.parameters?.write(key, value, 'learner'); }}
        perform={id => graph.performAction(id)}/>,
    });
  });
  return specs;
}
