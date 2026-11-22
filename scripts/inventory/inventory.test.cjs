'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {run} = require('./inventory.cjs');

const FILES = {
    'src/localization/sl.ts': 'export const sl = {"a_label": "Stopnja n", "b_label": "Točka x", "legend_a": "Krivulja"};\n',
    'src/localization/en.ts': 'export const en = {"a_label": "Degree n", "b_label": "Point x", "legend_a": "Curve"};\n',
    'src/inputs/Slider.tsx': 'export default function Slider(props: {}) { return null; }\n',
    'src/graphs/base/BaseGraph.tsx': 'export default abstract class BaseGraph {}\n',
    'src/graphs/base/BaseFunctionGraph.tsx': [
        "import BaseGraph from './BaseGraph';",
        "import Slider from '../../inputs/Slider';",
        'export default abstract class BaseFunctionGraph extends BaseGraph {',
        '    shared() { return <Slider label={t("b_label")} min={0} max={1}/>; }',
        '}',
    ].join('\n'),
    'src/graphs/demo/runtime.ts': [
        'export const demoGraphLoaders = {',
        "    'plain-one': () => import('./PlainGraph').then(m => () => new m.PlainGraph()),",
        "    'based-one': () => import('./BasedGraph').then(m => () => new m.BasedGraph()),",
        "    'based-two': () => import('./BasedTwoGraph').then(m => () => new m.default()),",
        '} as const;',
    ].join('\n'),
    'src/graphs/demo/PlainGraph.tsx': [
        "import BaseGraph from '../base/BaseGraph';",
        "import Slider from '../../inputs/Slider';",
        'export class PlainGraph extends BaseGraph {',
        '    protected renderControls() {',
        '        return <Slider customText={t("a_label")} min={1} max={9} step={1}/>;',
        '    }',
        '    protected renderLegend() {',
        '        return <Legend items={[{id: "c", label: t("legend_a")}]}/>;',
        '    }',
        '    protected renderReadout() {',
        '        return <p>Hello there</p>;',
        '    }',
        '    protected parameterBindings() {',
        '        return {"plain-a": {read: () => 1, apply: () => {}}};',
        '    }',
        '}',
    ].join('\n'),
    'src/graphs/demo/BasedGraph.tsx': "import BaseFunctionGraph from '../base/BaseFunctionGraph';\nexport class BasedGraph extends BaseFunctionGraph {}\n",
    'src/graphs/demo/BasedTwoGraph.tsx': "import BaseFunctionGraph from '../base/BaseFunctionGraph';\nexport default class BasedTwoGraph extends BaseFunctionGraph {}\n",
    'src/graphs/demo/BasedGraph.test.tsx': "import {BasedGraph} from './BasedGraph';\n",
    'src/learning/content/demoGuidedLessons.ts': [
        'const step = (content) => ({...content, frames: [frame(`${content.id}-explanation`, "explanation")]});',
        'const lesson = {',
        "    demonstrationId: 'plain-one',",
        '    steps: [step({id: "s1", title: "Prvi", explanation: "Spremeni Stopnja n in opazuj."})],',
        '};',
    ].join('\n'),
};

test('inventory reports registrations, controls, bases, lessons and components for a fixture repository', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bezeg-inventory-'));
    for (const [file, text] of Object.entries(FILES)) {
        fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
        fs.writeFileSync(path.join(root, file), text);
    }
    const out = path.join(root, 'out');
    const result = run({root, out});

    assert.equal(result.totals.demonstrations, 3);
    assert.deepEqual(result.demonstrations.map(d => d.id), ['based-one', 'based-two', 'plain-one']);
    const plain = result.demonstrations.find(d => d.id === 'plain-one');
    assert.equal(plain.controls.Slider, 1);
    assert.equal(plain.controls.rows[0].range, 'min=1 max=9 step=1');
    assert.equal(plain.controls.rows[0].label, 'a_label');
    assert.equal(plain.legend.entries, 1);
    assert.deepEqual(plain.bindings, ['plain-a']);
    assert.equal(plain.legacyStep, true);
    assert.equal(plain.blocker, 'legacy-step');
    assert.equal(plain.lessons[0].frames, 1);
    assert.equal(plain.a9Candidates.length, 1);
    assert.deepEqual(plain.a9Candidates[0].labels, ['Stopnja n']);
    assert.equal(plain.inlineStrings.count, 1);

    const based = result.demonstrations.find(d => d.id === 'based-one');
    assert.deepEqual(based.baseClasses, ['BaseFunctionGraph', 'BaseGraph']);
    assert.equal(based.controls.inherited, 1);
    assert.equal(based.blocker, 'shared-base');
    assert.deepEqual(based.tests, ['src/graphs/demo/BasedGraph.test.tsx']);

    // Both based demonstrations share BaseFunctionGraph, so they form one component; the plain one is alone.
    assert.deepEqual(result.components.map(c => c.size), [2, 1]);
    assert.deepEqual(result.components[0].demonstrations, ['based-one', 'based-two']);

    assert.ok(fs.existsSync(path.join(out, 'inventory.json')));
    assert.match(fs.readFileSync(path.join(out, 'inventory.md'), 'utf8'), /based-two/);
});

test('inventory output is deterministic', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bezeg-inventory-'));
    for (const [file, text] of Object.entries(FILES)) {
        fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
        fs.writeFileSync(path.join(root, file), text);
    }
    run({root, out: path.join(root, 'a')});
    run({root, out: path.join(root, 'b')});
    assert.equal(fs.readFileSync(path.join(root, 'a', 'inventory.json'), 'utf8'), fs.readFileSync(path.join(root, 'b', 'inventory.json'), 'utf8'));
});
