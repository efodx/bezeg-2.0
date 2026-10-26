import {expect, it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {GUIDED_EXAMPLE_PREVIEW_IDS, getGuidedExamplePreviewCopy, resolveGuidedExamplePreview} from './guidedExamplePreviews';
import {retainedExampleHomes} from './retainedExamples';
import {resolveGuidedExample} from './guidedExamples';

interface InventoryEntry {
    id: string;
    demonstrationId: string;
    path: string;
    sceneFingerprint: string;
    actions: string[];
    expected?: unknown;
}

interface Capture extends InventoryEntry {
    file: string;
    sha256: string;
    width: number;
    height: number;
    initialFrame: {firstFrame: boolean; backNavigationDisabled: boolean; stableAcrossMs: number};
    framing: {boardOnly: boolean; guidedLessonOverlayHidden: boolean};
    captureEvidence: {servedBuildVerified: boolean; pageErrors: string[]};
}

it('publishes every exact prepared scene with checked PNG bytes and bilingual resolver media', () => {
    const destination = resolve('src/images/learning/examples');
    const inventory: {examples: InventoryEntry[]} = JSON.parse(readFileSync(
        resolve('docs/reviews/illustrated-chapter-examples/capture-inventory.json'), 'utf8'));
    const manifest: {captures: Capture[]; fingerprints: {inventory: string}; sourceRevision: string} = JSON.parse(
        readFileSync(resolve(destination, 'manifest.json'), 'utf8'));
    const ids = retainedExampleHomes.map(home => home[0]).sort();
    expect(inventory.examples.map(entry => entry.id).sort()).toEqual(ids);
    expect(manifest.captures.map(entry => entry.id).sort()).toEqual(ids);
    expect(readdirSync(destination).filter(file => file.endsWith('.png')).sort()).toEqual(ids.map(id => `${id}.png`).sort());
    expect(manifest.sourceRevision).toMatch(/^[a-f0-9]{40}$/);
    const inventoryHash = createHash('sha256');
    for (const entry of [...inventory.examples].sort((a, b) => a.id.localeCompare(b.id))) {
        inventoryHash.update(JSON.stringify({id: entry.id, demonstrationId: entry.demonstrationId, path: entry.path,
            sceneFingerprint: entry.sceneFingerprint, actions: entry.actions || [], expected: entry.expected || null}));
        inventoryHash.update('\0');
    }
    expect(manifest.fingerprints.inventory).toBe(inventoryHash.digest('hex'));

    for (const [id, chapterId, sectionId, demonstrationId, , , path] of retainedExampleHomes) {
        const entry = inventory.examples.find(item => item.id === id);
        const capture = manifest.captures.find(item => item.id === id);
        expect(entry, id).toBeDefined();
        expect(capture, id).toBeDefined();
        if (!entry || !capture) throw new Error(`${id}: missing scene mapping`);
        const example = resolveGuidedExample(new URL(path, 'https://bezeg.invalid').search, demonstrationId);
        expect(example?.owner).toMatchObject({chapterId, sectionId});
        if (!example) throw new Error(`${id}: missing prepared example`);
        const step = example.lesson.steps[0];
        const fingerprint = createHash('sha256').update(JSON.stringify({demonstrationId, stepId: step.id,
            actions: step.scene?.actions, firstFrame: step.frames?.[0] ?? null})).digest('hex');
        expect(entry).toMatchObject({id, demonstrationId, path, sceneFingerprint: fingerprint});
        expect(entry.actions).toEqual(step.scene?.actions.map(action => `${action.kind}: ${JSON.stringify(action)}`));
        expect(capture).toMatchObject({id, demonstrationId, path, sceneFingerprint: fingerprint,
            actions: entry.actions, file: `${id}.png`, width: 840, height: 520,
            initialFrame: {firstFrame: true, backNavigationDisabled: true, stableAcrossMs: 250},
            framing: {boardOnly: true, guidedLessonOverlayHidden: true},
            captureEvidence: {servedBuildVerified: true, pageErrors: []}});
        const png = readFileSync(resolve(destination, capture.file));
        expect(png.subarray(0, 8).toString('hex'), id).toBe('89504e470d0a1a0a');
        expect([png.readUInt32BE(16), png.readUInt32BE(20)], id).toEqual([840, 520]);
        expect(createHash('sha256').update(png).digest('hex'), id).toBe(capture.sha256);
        for (const language of ['sl', 'en'] as const) {
            const preview = resolveGuidedExamplePreview(id, demonstrationId, language);
            expect(preview?.src, `${id}/${language}`).toBeTruthy();
            expect(preview?.alt.trim(), `${id}/${language}`).toBeTruthy();
            expect(preview?.caption.trim(), `${id}/${language}`).toBeTruthy();
        }
    }
});

it('has bilingual preview copy for every retained example and keeps special scenes specific', () => {
    expect(GUIDED_EXAMPLE_PREVIEW_IDS).toHaveLength(56);
    expect(new Set(GUIDED_EXAMPLE_PREVIEW_IDS).size).toBe(56);
    expect([...GUIDED_EXAMPLE_PREVIEW_IDS].sort()).toEqual(retainedExampleHomes.map(home => home[0]).sort());

    for (const [id, , , demonstrationId] of retainedExampleHomes) {
        const copy = getGuidedExamplePreviewCopy(id, demonstrationId);
        expect(copy, `${id} should have explicit preview copy`).toBeDefined();
        expect(copy?.alt.sl.trim(), `${id} Slovenian alt`).not.toBe('');
        expect(copy?.alt.en.trim(), `${id} English alt`).not.toBe('');
        expect(copy?.caption.sl.trim(), `${id} Slovenian caption`).not.toBe('');
        expect(copy?.caption.en.trim(), `${id} English caption`).not.toBe('');
    }

    const workedJoin = getGuidedExamplePreviewCopy('splines.worked-join.spline-c1.parabola-derivatives', 'spline-c1');
    expect(workedJoin?.alt.en).toContain('parabolic');
    expect(workedJoin?.caption.en).toContain('derivatives');
    const workedWeight = getGuidedExamplePreviewCopy('foundations.worked-weight.bernstein.degree-comparison', 'bernstein');
    expect(workedWeight?.alt.en).toContain('three quadratic Bernstein basis functions');
    expect(workedWeight?.caption.en).toContain('middle weight peaks at the interval midpoint');
    expect(workedWeight?.caption.en).toContain('stacked view is off');
    expect(workedWeight?.caption.en).not.toContain('degree three');
    expect(workedWeight?.alt.sl).toContain('treh kvadratnih Bernsteinovih baznih funkcij');
    expect(workedWeight?.caption.sl).toContain('naloženi prikaz je izklopljen');
});
