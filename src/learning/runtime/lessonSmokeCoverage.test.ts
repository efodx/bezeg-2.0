import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {GUIDED_LESSON_AVAILABLE_IDS} from './lessonAvailability';

/**
 * Every available guided lesson needs a browser smoke row (AGENTS.md), and `just smoke-lesson <id>` selects rows by
 * lesson id. A row's id is the line-leading `id:` property of its row object; LESSONS lists the rows that run.
 */
const spec = readFileSync(join(process.cwd(), 'tests/guided-lessons.smoke.spec.cjs'), 'utf-8');
const patchRowsSource = /const patchRows = \[([\s\S]*?)\n\];/m.exec(spec)?.[1] ?? '';
const patchRowIds = [...patchRowsSource.matchAll(/patchRow\(\{\s*id: '([a-z0-9-]+)'/g)].map(match => match[1]);
const rowIds = [...spec.matchAll(/^\s+id: '([a-z0-9-]+)'/gm)].map(match => match[1]).concat(patchRowIds);
const registeredRows = (/^const LESSONS = \[([^\]]*)\];/m.exec(spec)?.[1] ?? '').split(',').map(name => name.trim()).filter(Boolean);
const sectionRows = ['patch-bilinear-patch', 'patch-control-net', 'patch-boundary-iso-curves', 'patch-properties', 'patch-square-vs-triangular'];

test('every available demonstration has exactly one default smoke row and patch sections add only their explicit extras', () => {
    expect(rowIds.length).toBeGreaterThan(0);
    expect(new Set(rowIds).size).toBe(rowIds.length);
    const defaults = rowIds.filter(id => !sectionRows.includes(id));
    expect([...defaults].sort()).toEqual([...GUIDED_LESSON_AVAILABLE_IDS].sort());
    expect([...patchRowIds].filter(id => sectionRows.includes(id)).sort()).toEqual([...sectionRows].sort());
});

test('every smoke row is registered in LESSONS', () => {
    expect(new Set(registeredRows).size).toBe(registeredRows.length);
    expect(registeredRows.filter(name => name === '...patchRows')).toHaveLength(1);
    expect(registeredRows.length + patchRowIds.length - 1).toBe(rowIds.length);
});
