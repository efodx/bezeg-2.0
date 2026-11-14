import {readdirSync, readFileSync} from 'node:fs';
import {join, relative, sep} from 'node:path';
import {describe, expect, it} from 'vitest';

/** Static check (movable-points spec, stage 1): reads sources under src/graphs, mounts nothing. */
const ROOT = join(__dirname, '..');

function sources(dir: string): string[] {
    return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sources(path);
        return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

const files = sources(ROOT).map(path => ({name: relative(ROOT, path).split(sep).join('/'), text: readFileSync(path, 'utf8')}));

/** A rebuilt hovered point never fires out; a scene may reset a stale pointer cursor with one guarded line. That is not a hover binding. */
const STALE_POINTER_RESET = /cursor === ["']pointer["']\)? [^\n]*\.style\.cursor = ["']default["']/g;

/** Files that may write style.cursor themselves, with the reason. */
const CURSOR_WRITERS: Record<string, string> = {
    'base/bindMovablePointCursor.ts': 'the shared binding',
    'curves/object/AbstractJXGPointControlledCurve.ts': 'move and resize cursors from the pointer position over the bounding box, not a point hover',
};

/** Files that register a drag handler on a point without naming the binding, with the reason. */
const DRAG_WITHOUT_BINDING: Record<string, string> = {
    'curves/object/ModelPointBinding.ts': 'binds a model point to a board point made by AbstractJXGPointControlledCurve (binds the cursor)',
    'curves/bspline/BSplineBlossomScene.ts': 'points come from AbstractJXGPointControlledCurve, which binds the cursor',
    'curves/bspline/BSplineExtractionScene.ts': 'points come from AbstractJXGPointControlledCurve, which binds the cursor',
    'curves/bspline/BSplineInsertionScene.ts': 'points come from AbstractJXGPointControlledCurve, which binds the cursor',
    'curves/bspline/BSplineNurbsScene.ts': 'points come from AbstractJXGPointControlledCurve, which binds the cursor',
    'curves/bspline/DeBoorScene.ts': 'points come from AbstractJXGPointControlledCurve, which binds the cursor',
};

describe('movable point hover cursor, static', () => {
    it('no source writes style.cursor outside the binding or the allow-list', () => {
        const offenders = files.filter(f => /\.style\.cursor\s*=/.test(f.text.replace(STALE_POINTER_RESET, '')) && !(f.name in CURSOR_WRITERS)).map(f => f.name);
        expect(offenders).toEqual([]);
    });

    it('every source that registers a point drag handler reaches the binding or is allow-listed', () => {
        const offenders = files
            .filter(f => /\.on\(\s*["']drag["']/.test(f.text) && !/bindMovablePointCursor|createMovablePoint/.test(f.text) && !(f.name in DRAG_WITHOUT_BINDING))
            .map(f => f.name);
        expect(offenders).toEqual([]);
    });
});
