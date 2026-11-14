const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { determineScope, findLastFullRun, isDocumentationPath, main } = require('./ci-change-scope.cjs');

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function withRepo(run) {
  const root = fs.mkdtempSync(path.join(process.cwd(), '.ci-change-scope-test-'));
  try {
    git(['init', '-b', 'main'], root);
    git(['config', 'user.name', 'CI scope tests'], root);
    git(['config', 'user.email', 'ci-scope@example.invalid'], root);
    run({ root, write, commit: (message) => { git(['add', '-A'], root); git(['commit', '-m', message], root); return git(['rev-parse', 'HEAD'], root); } });
  } finally {
    try {
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
    } catch (error) {
      if (error.code !== 'EPERM') throw error;
      fs.chmodSync(root, 0o700);
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
    }
  }

  function write(relativePath, contents) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contents);
  }
}

const pr = (root, base, head) => determineScope({
  eventName: 'pull_request',
  eventPayload: { pull_request: { base: { sha: base }, head: { sha: head } } },
  cwd: root,
});

test('recognizes only the exact documentation allowlist', () => {
  for (const file of ['docs/README.md', 'docs/nested/topic.md', 'README.md', 'AGENTS.md', 'CLAUDE.md', 'DESIGN.md', 'GLOSSARY.md',
    'docs/guide.txt', 'docs/README.MD', 'docs/reviews/x/shot.png', 'docs/controls/a.webp', 'docs/tasks/y/notes.txt']) {
    assert.equal(isDocumentationPath(file), true, file);
  }
  for (const file of ['docs\\anything.md', 'src/README.md', 'src/x.css', '.github/workflows/build.yml', 'package.json', 'README.txt',
    'docs/reviews/x/guided-example-inventory.json', 'docs/prototypes/bezier-patches/teapot-data.js', 'docs/a.cjs', 'docs/a.ts',
    'docs/specs/school-function-graphs-lessons.md']) {
    assert.equal(isDocumentationPath(file), false, file);
  }
});

test('every docs/ file a unit test or smoke spec names stays outside the documentation allowlist', () => {
  const repo = path.resolve(__dirname, '..');
  const named = new Set();
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'node_modules') visit(full); continue; }
      // Perf tests write their raw output under docs/; they read nothing there.
      if (!/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name) || /\.perf\.test\./.test(entry.name)) continue;
      // A quoted path is a read or an import; a path in a comment is not.
      for (const match of fs.readFileSync(full, 'utf8').matchAll(/['"`](?:\.\.\/)*(docs\/[\w./-]+\.\w+)['"`]/g)) named.add(match[1]);
    }
  };
  visit(path.join(repo, 'src'));
  visit(path.join(repo, 'tests'));
  assert.ok(named.size > 0, 'the scan found the known docs/ reads');
  for (const file of named) assert.equal(isDocumentationPath(file), false, `${file} is read by a test but treated as documentation`);
});

test('selects documentation-only for a PR using the true merge base', () => {
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const base = commit('base');
    git(['checkout', '-b', 'feature'], root);
    write('docs/guide.md', 'guide\n');
    const head = commit('docs change');
    git(['checkout', 'main'], root);
    write('src/app.js', 'unrelated base movement\n');
    commit('advance target');
    assert.equal(pr(root, git(['rev-parse', 'main'], root), head).fullVerification, false);
    assert.equal(pr(root, base, head).fullVerification, false);
  });
});

test('selects full verification for application or mixed PR changes', () => {
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const base = commit('base');
    write('docs/guide.md', 'guide\n');
    write('src/app.js', 'code\n');
    const head = commit('mixed');
    const decision = pr(root, base, head);
    assert.equal(decision.fullVerification, true);
    assert.match(decision.reason, /src\/app\.js/);
  });
});

test('includes deletions and both sides of renames conservatively', () => {
  withRepo(({ root, write, commit }) => {
    write('docs/remove.md', 'remove me\n');
    write('docs/old.md', 'rename me\n');
    const base = commit('base docs');
    fs.rmSync(path.join(root, 'docs/remove.md'));
    fs.mkdirSync(path.join(root, 'src'));
    fs.renameSync(path.join(root, 'docs/old.md'), path.join(root, 'src/moved.md'));
    const head = commit('delete and move');
    const decision = pr(root, base, head);
    assert.equal(decision.fullVerification, true);
    assert.deepEqual(decision.changedPaths.sort(), ['docs/old.md', 'docs/remove.md', 'src/moved.md']);
  });
});

test('documentation-only deletions and renames remain documentation-only', () => {
  withRepo(({ root, write, commit }) => {
    write('docs/remove.md', 'remove me\n');
    write('docs/old.md', 'rename me\n');
    const base = commit('base docs');
    fs.rmSync(path.join(root, 'docs/remove.md'));
    fs.renameSync(path.join(root, 'docs/old.md'), path.join(root, 'docs/new.md'));
    const head = commit('documentation deletion and rename');
    const decision = pr(root, base, head);
    assert.equal(decision.fullVerification, false);
    assert.deepEqual(decision.changedPaths.sort(), ['docs/new.md', 'docs/old.md', 'docs/remove.md']);
  });
});

test('malformed event files fall back to full verification and still write the summary', () => {
  withRepo(({ root, write }) => {
    const eventPath = path.join(root, 'event.json');
    const outputPath = path.join(root, 'github-output.txt');
    const summaryPath = path.join(root, 'github-summary.md');
    write('event.json', '{broken');
    const decision = main({
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: summaryPath,
    });
    assert.equal(decision.fullVerification, true);
    assert.match(fs.readFileSync(outputPath, 'utf8'), /full_verification=true/);
    assert.match(fs.readFileSync(summaryPath, 'utf8'), /Full verification/);
  });
});

test('unreadable event files fall back to full verification', () => {
  withRepo(({ root }) => {
    const decision = main({
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_EVENT_PATH: path.join(root, 'missing-event.json'),
    });
    assert.equal(decision.fullVerification, true);
    assert.match(decision.reason, /could not be read/);
  });
});

test('uses the complete multi-commit push range', () => {
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const before = commit('before');
    write('docs/one.md', 'first\n');
    commit('first docs commit');
    write('docs/two.md', 'second\n');
    const after = commit('second docs commit');
    const decision = determineScope({ eventName: 'push', before, after, cwd: root, lookupLastFullRun: greenLookup });
    assert.equal(decision.fullVerification, false);
    assert.deepEqual(decision.changedPaths.sort(), ['docs/one.md', 'docs/two.md']);
  });
});

const greenLookup = () => ({ id: 100, headSha: 'a'.repeat(40), conclusion: 'success' });

function docsPush(lookupLastFullRun, changed = 'docs/guide.md') {
  let decision;
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const before = commit('base');
    write(changed, 'change\n');
    const after = commit('change');
    decision = determineScope({ eventName: 'push', before, after, cwd: root, lookupLastFullRun });
  });
  return decision;
}

test('docs-only push is allowed when the previous full run succeeded', () => {
  assert.equal(docsPush(greenLookup).fullVerification, false);
});

test('docs-only push selects full verification when the previous full run failed', () => {
  const decision = docsPush(() => ({ id: 42475921993, headSha: 'b'.repeat(40), conclusion: 'failure' }));
  assert.equal(decision.fullVerification, true);
  assert.match(decision.reason, /42475921993/);
  assert.match(decision.reason, new RegExp('b'.repeat(40)));
  assert.match(decision.reason, /failure/);
});

test('docs-only push selects full verification when the lookup fails or finds nothing', () => {
  assert.equal(docsPush(() => { throw new Error('API 500'); }).fullVerification, true);
  assert.equal(docsPush(() => null).fullVerification, true);
  assert.equal(docsPush(undefined).fullVerification, true);
});

test('non-docs push does not consult the lookup', () => {
  const decision = docsPush(() => { throw new Error('must not be called'); }, 'src/app.js');
  assert.equal(decision.fullVerification, true);
  assert.match(decision.reason, /src\/app\.js/);
});

test('findLastFullRun skips docs-only, in-progress and current runs', () => {
  const skipped = [{ name: 'scope', conclusion: 'success' }, { name: 'checks', conclusion: 'skipped' }, { name: 'unit', conclusion: 'skipped' }];
  const ran = [{ name: 'scope', conclusion: 'success' }, { name: 'checks', conclusion: 'success' }, { name: 'unit', conclusion: 'failure' }];
  const runs = [
    { id: 60, status: 'completed', conclusion: 'success', head_sha: 'current', event: 'push' },
    { id: 50, status: 'in_progress', conclusion: null, head_sha: 'busy', event: 'push' },
    { id: 40, status: 'completed', conclusion: 'success', head_sha: 'docs', event: 'push' },
    { id: 35, status: 'completed', conclusion: 'cancelled', head_sha: 'cancelled-docs', event: 'push' },
    { id: 20, status: 'completed', conclusion: 'failure', head_sha: 'red', event: 'push' },
    { id: 10, status: 'completed', conclusion: 'success', head_sha: 'old', event: 'push' },
  ];
  const jobs = { 60: ran, 50: ran, 40: skipped, 35: skipped, 20: ran, 10: ran };
  const api = { listRuns: () => runs, listJobs: (id) => jobs[id] };
  assert.deepEqual(findLastFullRun({ api, currentRunId: '60' }), { id: 20, headSha: 'red', conclusion: 'failure' });
  assert.equal(findLastFullRun({ api, currentRunId: '60', limit: 3 }), null);
});

test('findLastFullRun returns a cancelled full run, so its unverified code selects full verification', () => {
  const cancelledJobs = [{ name: 'scope', conclusion: 'success' }, { name: 'checks', conclusion: 'success' }, { name: 'unit', conclusion: 'cancelled' }];
  const runs = [
    { id: 30, status: 'completed', conclusion: 'cancelled', head_sha: 'cancel', event: 'push' },
    { id: 10, status: 'completed', conclusion: 'success', head_sha: 'old', event: 'push' },
  ];
  const api = { listRuns: () => runs, listJobs: () => cancelledJobs };
  assert.deepEqual(findLastFullRun({ api, currentRunId: '40' }), { id: 30, headSha: 'cancel', conclusion: 'cancelled' });
  assert.equal(docsPush(() => findLastFullRun({ api, currentRunId: '40' })).fullVerification, true);
});

test('manual dispatch, empty diffs, and unavailable comparison history select full verification', () => {
  withRepo(({ root, write, commit }) => {
    write('docs/guide.md', 'same tree\n');
    const head = commit('docs');
    assert.equal(determineScope({ eventName: 'workflow_dispatch', cwd: root }).fullVerification, true);
    assert.equal(determineScope({ eventName: 'push', before: head, after: head, cwd: root }).fullVerification, true);
    assert.equal(determineScope({ eventName: 'push', before: 'missing-before', after: head, cwd: root }).fullVerification, true);
    assert.equal(determineScope({ eventName: 'pull_request', eventPayload: {}, cwd: root }).fullVerification, true);
  });
});

// Guided-lesson rows (Phase 6): which rows of tests/guided-lessons.smoke.spec.cjs the hosted shards walk.
const { REPRESENTATIVE_LESSON_IDS } = require('./ci-change-scope.cjs');
const repoRoot = path.resolve(__dirname, '..');
const specIds = new Set([...fs.readFileSync(path.join(repoRoot, 'tests/guided-lessons.smoke.spec.cjs'), 'utf8').matchAll(/\bid: '([a-z0-9-]+)'/g)].map((match) => match[1]));

function lessonsFor(files) {
  let decision;
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const base = commit('base');
    for (const [file, contents] of Object.entries(files)) write(file, contents);
    decision = pr(root, base, commit('change'));
  });
  return decision.lessons;
}

test('every representative lesson id is a row of the lesson spec, with an Exit row among them', () => {
  assert.ok(REPRESENTATIVE_LESSON_IDS.length >= 20 && REPRESENTATIVE_LESSON_IDS.length <= 25, String(REPRESENTATIVE_LESSON_IDS.length));
  for (const id of REPRESENTATIVE_LESSON_IDS) assert.ok(specIds.has(id), id);
  assert.ok(REPRESENTATIVE_LESSON_IDS.includes('linear-function'));
  assert.equal(new Set(REPRESENTATIVE_LESSON_IDS).size, REPRESENTATIVE_LESSON_IDS.length);
});

test('lesson runtime, shared layout and smoke helper changes walk every lesson row', () => {
  for (const file of ['src/learning/runtime/lessonSession.ts', 'src/graphs/base/BaseGraph.ts', 'tests/lesson-smoke-helpers.cjs',
    'tests/lesson-experience-checks.cjs', 'tests/guided-lessons.smoke.spec.cjs', 'playwright.config.cjs', 'package.json',
    '.github/workflows/browser-smoke.yml']) {
    const lessons = lessonsFor({ [file]: 'x\n' });
    assert.equal(lessons.all, true, file);
    assert.equal(lessons.ids, null, file);
  }
});

test('a lesson content change walks exactly the rows it mentions', () => {
  const lessons = lessonsFor({ 'src/learning/content/x.ts': "export const a = ['bisection', \"farin\", 'not-a-lesson'];\n" });
  assert.equal(lessons.all, false);
  assert.deepEqual([...lessons.ids].sort(), ['bisection', 'farin']);
  assert.match(lessons.grep, /^\(Lesson\|on\) \((farin\|bisection|bisection\|farin)\) \|\(.+\) $/);
});

test('a scoped run keeps the spec standalone describes that no row reaches', () => {
  const lessons = lessonsFor({ 'src/learning/content/x.ts': "export const a = ['bisection'];\n" });
  assert.ok(lessons.extras.includes('Bernstein extras'), lessons.extras.join(', '));
  assert.ok(lessons.extras.includes('Observation flow'), lessons.extras.join(', '));
  assert.ok(!lessons.extras.includes('Shared lesson runtime'));
  assert.ok(lessons.grep.includes('|(') && lessons.grep.includes('Observation flow'));
});

test('a content file that mentions no row, or an unreadable one, walks every row', () => {
  assert.equal(lessonsFor({ 'src/learning/content/helper.ts': 'export const a = 1;\n' }).all, true);
});

test('an unrelated application change walks the representative rows', () => {
  const lessons = lessonsFor({ 'src/components/Unrelated.tsx': 'x\n', 'src/learning/content/x.test.ts': "'bisection'\n" });
  assert.equal(lessons.all, false);
  assert.deepEqual(lessons.ids, REPRESENTATIVE_LESSON_IDS);
});

test('content changes beside an unrelated application change add to the representative rows', () => {
  const lessons = lessonsFor({ 'src/components/Unrelated.tsx': 'x\n', 'src/learning/content/x.ts': "'polygon-area'\n" });
  assert.deepEqual([...lessons.ids].sort(), [...new Set([...REPRESENTATIVE_LESSON_IDS, 'polygon-area'])].sort());
});

test('documentation-only, dispatch and undecidable scopes keep their behaviour', () => {
  const docs = (() => { let d; withRepo(({ root, write, commit }) => { write('README.md', 'a\n'); const b = commit('b'); write('docs/a.md', 'x\n'); d = pr(root, b, commit('c')); }); return d; })();
  assert.equal(docs.fullVerification, false);
  assert.equal(docs.lessons.all, true);
  const dispatch = determineScope({ eventName: 'workflow_dispatch' });
  assert.equal(dispatch.lessons.all, true);
  assert.equal(determineScope({ eventName: 'push', before: 'missing', after: 'missing' }).lessons.all, true);
});

test('main writes the lesson_grep output and a summary line naming the decision', () => {
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const base = commit('base');
    write('src/components/Unrelated.tsx', 'x\n');
    const head = commit('change');
    const dir = fs.mkdtempSync(path.join(root, 'out-'));
    const event = path.join(dir, 'event.json');
    const output = path.join(dir, 'output');
    const summary = path.join(dir, 'summary');
    fs.writeFileSync(event, JSON.stringify({ pull_request: { base: { sha: base }, head: { sha: head } } }));
    const cwd = process.cwd();
    process.chdir(root);
    try {
      main({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_EVENT_PATH: event, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary });
    } finally {
      process.chdir(cwd);
    }
    assert.match(fs.readFileSync(output, 'utf8'), /^lesson_grep=\(Lesson\|on\) \(bernstein\|/m);
    assert.match(fs.readFileSync(summary, 'utf8'), new RegExp(`Guided lesson rows: ${REPRESENTATIVE_LESSON_IDS.length} representative`));
  });
});

// Catalog sweeps (phase 7): which rotation slice and base the unit shards get.
function codePush({ lookupLastVerifiedRun, runNumber = 23, verifiedIs = 'before' }) {
  let decision;
  let shas;
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const verified = commit('verified');
    write('src/a.ts', 'a\n');
    const before = commit('cancelled push');
    write('src/b.ts', 'b\n');
    const after = commit('this push');
    shas = { verified, before, after };
    const lookup = lookupLastVerifiedRun && (() => lookupLastVerifiedRun(shas[verifiedIs] ?? verifiedIs));
    decision = determineScope({ eventName: 'push', before, after, cwd: root, runNumber, lookupLastVerifiedRun: lookup });
  });
  return { decision, shas };
}

const verifiedRun = (conclusion = 'success') => (headSha) => ({ id: 7, headSha, conclusion });

test('a code push rotates the sweeps from the last verified master commit, so a cancelled push stays in the diff', () => {
  const { decision, shas } = codePush({ lookupLastVerifiedRun: verifiedRun(), verifiedIs: 'verified' });
  assert.equal(decision.sweeps.rotation, '2/7');
  assert.equal(decision.sweeps.base, shas.verified);
  assert.match(decision.sweeps.reason, /rotation slice 2\/7/);
});

test('a code push checks every sweep entry when the last verified run is red, missing or unknown, or the run number is', () => {
  for (const lookupLastVerifiedRun of [verifiedRun('failure'), () => null, () => { throw new Error('API 500'); }]) {
    const { decision } = codePush({ lookupLastVerifiedRun });
    assert.deepEqual([decision.sweeps.rotation, decision.sweeps.base], ['', ''], decision.sweeps.reason);
  }
  assert.equal(codePush({ lookupLastVerifiedRun: verifiedRun(), verifiedIs: 'f'.repeat(40) }).decision.sweeps.rotation, '');
  assert.equal(codePush({ lookupLastVerifiedRun: verifiedRun(), verifiedIs: 'after', runNumber: 23 }).decision.sweeps.rotation, '2/7',
    'the pushed head itself is an ancestor of itself');
  assert.equal(codePush({ lookupLastVerifiedRun: verifiedRun() }).decision.sweeps.rotation, '2/7');
  for (const runNumber of ['', null, 'x']) {
    assert.equal(codePush({ lookupLastVerifiedRun: verifiedRun(), runNumber }).decision.sweeps.rotation, '', String(runNumber));
  }
  assert.equal(codePush({}).decision.sweeps.rotation, '');
});

test('a pull request rotates from its merge base; docs-only, dispatch and the daily schedule check every entry', () => {
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const base = commit('base');
    write('src/a.ts', 'a\n');
    const head = commit('change');
    const decision = determineScope({ eventName: 'pull_request', eventPayload: { pull_request: { base: { sha: base }, head: { sha: head } } }, cwd: root, runNumber: '15' });
    assert.deepEqual([decision.sweeps.rotation, decision.sweeps.base], ['1/7', base]);
  });
  const daily = determineScope({ eventName: 'schedule' });
  assert.equal(daily.fullVerification, true);
  assert.equal(daily.sweeps.rotation, '');
  assert.equal(daily.lessons.all, true);
  assert.equal(determineScope({ eventName: 'workflow_dispatch', runNumber: 3 }).sweeps.rotation, '');
  assert.equal(docsPush(greenLookup).sweeps.rotation, '');
});

test('findLastFullRun with skipCancelled passes over cancelled runs to the latest finished one', () => {
  const ran = [{ name: 'checks', conclusion: 'success' }, { name: 'unit', conclusion: 'cancelled' }];
  const runs = [
    { id: 30, status: 'completed', conclusion: 'cancelled', head_sha: 'cancel', event: 'push' },
    { id: 20, status: 'completed', conclusion: 'success', head_sha: 'daily', event: 'schedule' },
  ];
  const api = { listRuns: () => runs, listJobs: () => ran };
  assert.deepEqual(findLastFullRun({ api, currentRunId: '40', skipCancelled: true }), { id: 20, headSha: 'daily', conclusion: 'success' });
});

test('main writes the sweep outputs and a catalog sweep summary line', () => {
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const base = commit('base');
    write('src/components/Unrelated.tsx', 'x\n');
    const head = commit('change');
    const dir = fs.mkdtempSync(path.join(root, 'out-'));
    const event = path.join(dir, 'event.json');
    const output = path.join(dir, 'output');
    const summary = path.join(dir, 'summary');
    fs.writeFileSync(event, JSON.stringify({ pull_request: { base: { sha: base }, head: { sha: head } } }));
    const cwd = process.cwd();
    process.chdir(root);
    try {
      main({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_EVENT_PATH: event, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary, GITHUB_RUN_NUMBER: '8' });
    } finally {
      process.chdir(cwd);
    }
    const written = fs.readFileSync(output, 'utf8');
    assert.match(written, /^sweep_rotation=1\/7$/m);
    assert.match(written, new RegExp(`^sweep_base=${base}$`, 'm'));
    assert.match(fs.readFileSync(summary, 'utf8'), /Catalog sweeps: sample, entries reached since [0-9a-f]{12}, rotation slice 1\/7\./);
  });
});
