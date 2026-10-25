import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {GUIDED_LESSON_AVAILABLE_IDS} from './lessonAvailability';

/**
 * Every available guided lesson needs a browser smoke row (AGENTS.md), and `just smoke-lesson <id>` selects rows by
 * lesson id. A row's id is the line-leading `id:` property of its row object; LESSONS lists the rows that run.
 */
const spec = readFileSync(join(process.cwd(), 'tests/guided-lessons.smoke.spec.cjs'), 'utf-8');
const rowIds = [...spec.matchAll(/^\s+id: '([a-z0-9-]+)'/gm)].map(match => match[1]);
const registeredRows = (/^const LESSONS = \[([^\]]*)\];/m.exec(spec)?.[1] ?? '').split(',').map(name => name.trim()).filter(Boolean);

test('every available guided lesson has exactly one smoke row named by its lesson id', () => {
    expect(rowIds.length).toBeGreaterThan(0);
    expect([...rowIds].sort()).toEqual([...GUIDED_LESSON_AVAILABLE_IDS].sort());
});

test('every smoke row is registered in LESSONS', () => {
    expect(new Set(registeredRows).size).toBe(registeredRows.length);
    expect(registeredRows.length).toBe(rowIds.length);
});
