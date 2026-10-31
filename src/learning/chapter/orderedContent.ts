import type {LocalizedText} from '../model';

export type OrderedChapterFigure = Readonly<{src: string; alt: LocalizedText; caption: LocalizedText}>;

/** One reader-visible item in a chapter section. Example IDs are registry IDs, never array positions. */
export type OrderedChapterContent<TText = LocalizedText, TFigure = OrderedChapterFigure> =
    | {kind: 'paragraph'; text: TText; links?: readonly {label: string; href: string}[]}
    | {kind: 'formula'; latex: string; label?: TText}
    | {kind: 'figure'; figure: TFigure}
    | {kind: 'example'; exampleId: string};

export type PlaygroundContent = {kind: 'playground'; mode: 'draw' | 'inspect'};

export function exampleReferences<TText, TFigure>(content: readonly (OrderedChapterContent<TText, TFigure> | PlaygroundContent)[]): string[] {
    return content.filter((block): block is Extract<OrderedChapterContent<TText, TFigure>, {kind: 'example'}> => block.kind === 'example')
        .map(block => block.exampleId);
}

export type OrderedContentIssue = Readonly<{kind: 'unknown-reference' | 'duplicate-reference'; exampleId: string}>;

/** Checks an authored section against its available registry entries. */
export function validateOrderedChapterContent<TText, TFigure>(
    content: readonly (OrderedChapterContent<TText, TFigure> | PlaygroundContent)[],
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

export function hasEquivalentExampleOrder<TText, TFigure>(
    sl: readonly (OrderedChapterContent<TText, TFigure> | PlaygroundContent)[],
    en: readonly (OrderedChapterContent<TText, TFigure> | PlaygroundContent)[],
): boolean {
    return JSON.stringify(exampleReferences(sl)) === JSON.stringify(exampleReferences(en));
}

