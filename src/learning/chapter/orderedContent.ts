import type {LocalizedText} from '../model';

/** One reader-visible item in a chapter section. Example IDs are registry IDs, never array positions. */
export type OrderedChapterContent<TText = LocalizedText> =
    | {kind: 'paragraph'; text: TText; links?: readonly {label: TText; href: string}[]}
    | {kind: 'formula'; latex: string; label?: TText}
    | {kind: 'example'; exampleId: string};

/** A lazily loaded interactive block. Only the listed playground and mode pairs exist. */
export type PlaygroundContent =
    | {kind: 'playground'; playground: 'bezier-drawing'; mode: 'draw' | 'inspect'}
    | {kind: 'playground'; playground: 'collisions'; mode: 'run' | 'inspect' | 'polygons'};

export function exampleReferences<TText>(content: readonly (OrderedChapterContent<TText> | PlaygroundContent)[]): string[] {
    return content.filter((block): block is Extract<OrderedChapterContent<TText>, {kind: 'example'}> => block.kind === 'example')
        .map(block => block.exampleId);
}

export type OrderedContentIssue = Readonly<{kind: 'unknown-reference' | 'duplicate-reference'; exampleId: string}>;

/** Checks an authored section against its available registry entries. */
export function validateOrderedChapterContent<TText>(
    content: readonly (OrderedChapterContent<TText> | PlaygroundContent)[],
    knownExampleIds: ReadonlySet<string>,
): OrderedContentIssue[] {
    const seen = new Set<string>();
    const issues: OrderedContentIssue[] = [];
    for (const exampleId of exampleReferences(content)) {
        if (!knownExampleIds.has(exampleId)) issues.push({kind: 'unknown-reference', exampleId});
        if (seen.has(exampleId)) issues.push({kind: 'duplicate-reference', exampleId});
        seen.add(exampleId);
    }
    return issues;
}

export function hasEquivalentExampleOrder<TText>(
    sl: readonly (OrderedChapterContent<TText> | PlaygroundContent)[],
    en: readonly (OrderedChapterContent<TText> | PlaygroundContent)[],
): boolean {
    return JSON.stringify(exampleReferences(sl)) === JSON.stringify(exampleReferences(en));
}

