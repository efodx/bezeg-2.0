const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { determineScope, findLastFullRun, findLastDeployedRun, isDocumentationPath, main } = require('./ci-change-scope.cjs');

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
    // Windows can hold a just-written .git file for a moment; cleanup is best effort and never fails a test.
    for (let attempt = 0; attempt < 5 && fs.existsSync(root); attempt += 1) {
      try {
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
      } catch (error) {
        if (error.code !== 'EPERM' && error.code !== 'EBUSY') throw error;
        try { fs.chmodSync(root, 0o700); } catch { /* retried */ }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
      }
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

// Run-history fixtures: GitHub Actions run and job records, and a lookup pair built from them the way the scope job does.
const JOB_NAMES = ['scope', 'checks', 'unit (1)', 'unit (2)', 'build', 'chromium (lessons-1)', 'chromium (other-specs)', 'smoke', 'deploy'];
const jobSet = (overrides = {}) => JOB_NAMES.map((name) => ({ name, conclusion: name in overrides ? overrides[name] : 'success' }));
const allSkipped = Object.fromEntries(JOB_NAMES.map((name) => [name, 'skipped']));
const skippedExcept = (overrides) => jobSet({ ...allSkipped, ...overrides });
const DOCS_ONLY_JOBS = skippedExcept({ scope: 'success', smoke: 'success' });
const DEPLOYED_JOBS = jobSet();
const NOT_DEPLOYED_JOBS = jobSet({ deploy: 'skipped' });
const recordedRun = (id, headSha, jobs, o = {}) => ({
  run: {
    id,
    head_sha: headSha,
    head_branch: o.branch ?? 'master',
    event: o.event ?? 'push',
    status: o.status ?? 'completed',
    conclusion: 'conclusion' in o ? o.conclusion : 'success',
    run_attempt: o.attempt ?? 1,
  },
  jobs,
});

function lookupsFor(records, currentRunId = '999') {
  const ordered = [...records].sort((a, b) => b.run.id - a.run.id);
  const api = { listRuns: () => ordered.map((record) => record.run), listJobs: (id) => ordered.find((record) => record.run.id === id)?.jobs };
  return {
    lookupLastFullRun: () => findLastFullRun({ api, currentRunId }),
    lookupLastDeployedRun: () => findLastDeployedRun({ api, currentRunId }),
    lookupLastVerifiedRun: () => findLastFullRun({ api, currentRunId, skipCancelled: true }),
  };
}

// base B, runtime R, an optional unverified input X (a verification input), then three documentation commits D1, D2, H.
function standardHistory({ write, commit }, { afterRuntime } = {}) {
  write('README.md', 'base\n');
  write('src/app.ts', 'base\n');
  const B = commit('base');
  write('src/components/Unrelated.tsx', 'runtime\n');
  const R = commit('runtime');
  let X = R;
  if (afterRuntime) {
    write(afterRuntime, '{}\n');
    X = commit('verification input');
  }
  write('docs/a.md', 'a\n');
  const D1 = commit('docs 1');
  write('docs/b.md', 'b\n');
  const D2 = commit('docs 2');
  write('docs/c.md', 'c\n');
  const H = commit('docs 3');
  return { B, R, X, D1, D2, H };
}

// The decision for the documentation-only master push D2..H, after the run history `runsFor(shas)`.
function pushAfter(runsFor, { afterRuntime, extra, lookups } = {}) {
  let decision;
  let shas;
  withRepo((repo) => {
    shas = standardHistory(repo, { afterRuntime });
    if (extra) extra(repo, shas);
    const records = runsFor(shas);
    decision = determineScope({
      eventName: 'push', before: shas.D2, after: shas.H, cwd: repo.root, runNumber: 23, ...(lookups ? lookups(records) : lookupsFor(records)),
    });
  });
  return { decision, shas };
}

// "Full + deploy": the decision is full verification, which on a master push reaches the deploy gate (the `deploy` job
// requires scope.outputs.full_verification == 'true'; the workflow contract test below pins it), and no fast path.
const deployGate = (decision) => decision.fullVerification === true;

function assertFullAndDeploy({ decision }, reason) {
  assert.equal(decision.fullVerification, true, decision.reason);
  assert.equal(deployGate(decision), true);
  if (reason) assert.match(decision.reason, reason);
}

function assertFastPath({ decision }) {
  assert.equal(decision.fullVerification, false, decision.reason);
  assert.equal(deployGate(decision), false);
}

test('uses the complete multi-commit push range', () => {
  withRepo((repo) => {
    const { R, H } = standardHistory(repo);
    const records = [recordedRun(10, R, DEPLOYED_JOBS)];
    const decision = determineScope({ eventName: 'push', before: R, after: H, cwd: repo.root, ...lookupsFor(records) });
    assert.equal(decision.fullVerification, false, decision.reason);
    assert.deepEqual(decision.changedPaths.sort(), ['docs/a.md', 'docs/b.md', 'docs/c.md']);
  });
});

test('matrix: verified and most recently deployed sources both cover the current inputs -> docs fast path', () => {
  const result = pushAfter(({ R, D1, D2 }) => [
    recordedRun(10, R, DEPLOYED_JOBS), recordedRun(11, D1, DOCS_ONLY_JOBS), recordedRun(12, D2, DOCS_ONLY_JOBS),
  ]);
  assertFastPath(result);
  assert.equal(result.decision.provenance.verified.headSha, result.shas.R);
  assert.equal(result.decision.provenance.deployed.headSha, result.shas.R);
  assert.match(result.decision.reason, new RegExp(`Verified source ${result.shas.R} \\(run 10, attempt 1, push\\).*deployed source ${result.shas.R}`));
});

test('matrix: a scheduled green on the runtime plus a push deploy of it, a manual dispatch, or a docs source are all fast', () => {
  assertFastPath(pushAfter(({ R, D1 }) => [
    recordedRun(20, R, DEPLOYED_JOBS), recordedRun(30, R, NOT_DEPLOYED_JOBS, { event: 'schedule' }), recordedRun(31, D1, DOCS_ONLY_JOBS),
  ]));
  assertFastPath(pushAfter(({ R }) => [recordedRun(10, R, DEPLOYED_JOBS, { event: 'workflow_dispatch' })]));
});

test('matrix: a runtime change cancelled in scope, in checks or while unfinished, with only an older source green -> full + deploy', () => {
  const older = ({ B }) => recordedRun(10, B, DEPLOYED_JOBS);
  const cancelledScope = pushAfter((s) => [older(s), recordedRun(20, s.R, skippedExcept({ scope: 'cancelled' }), { conclusion: 'cancelled' }),
    recordedRun(21, s.D1, DOCS_ONLY_JOBS)]);
  assertFullAndDeploy(cancelledScope, /cancelled/);
  assert.equal(cancelledScope.decision.lessons.all, true, 'a recovery run walks every lesson and sweep it cannot rule out');
  assert.equal(cancelledScope.decision.sweeps.rotation, '');
  assertFullAndDeploy(pushAfter((s) => [older(s), recordedRun(20, s.R, skippedExcept({ scope: 'success', checks: 'cancelled', 'unit (1)': 'cancelled' }),
    { conclusion: 'cancelled' })]), /cancelled/);
  assertFullAndDeploy(pushAfter((s) => [older(s), recordedRun(20, s.R, jobSet({ checks: null, 'unit (1)': null, build: null, deploy: null }),
    { status: 'in_progress', conclusion: null })]), /in_progress/);
  assertFullAndDeploy(pushAfter((s) => [older(s), recordedRun(20, s.R, [{ name: 'scope', conclusion: null }], { status: 'in_progress', conclusion: null })]), /in_progress/);
  assertFullAndDeploy(pushAfter((s) => [older(s), recordedRun(20, s.R, [{ name: 'scope', conclusion: null }], { status: 'queued', conclusion: null })]), /queued/);
  assertFullAndDeploy(pushAfter((s) => [older(s), recordedRun(20, s.R, DEPLOYED_JOBS, { status: 'in_progress' })]), /in_progress/);
});

test('matrix: verified runtime whose deployment failed, was cancelled or is pending -> full + deploy', () => {
  for (const [deploy, conclusion, status] of [['failure', 'failure', 'completed'], ['cancelled', 'cancelled', 'completed'], [null, null, 'in_progress']]) {
    assertFullAndDeploy(pushAfter((s) => [recordedRun(10, s.B, DEPLOYED_JOBS), recordedRun(20, s.R, jobSet({ deploy }), { conclusion, status })]));
  }
});

test('matrix: scheduled verification of the new runtime while Pages serves older runtime -> full + deploy, recovery scope covers the runtime', () => {
  const result = pushAfter((s) => [recordedRun(10, s.B, DEPLOYED_JOBS), recordedRun(30, s.R, NOT_DEPLOYED_JOBS, { event: 'schedule' })]);
  assertFullAndDeploy(result, /deployed source/);
  assert.match(result.decision.reason, new RegExp(`Verified source ${result.shas.R}.*deployed source ${result.shas.B}`));
  assert.ok(result.decision.changedPaths.includes('src/components/Unrelated.tsx'));
  assert.equal(result.decision.lessons.all, false);
  assert.deepEqual(result.decision.lessons.ids.slice(0, 3), REPRESENTATIVE_LESSON_IDS.slice(0, 3), 'the pending runtime path selects lesson rows');
  assert.equal(result.decision.sweeps.rotation, '2/7');
  assert.equal(result.decision.sweeps.base, result.shas.R, 'sweeps start from the proven verified source, not the docs diff');
});

test('matrix: documentation-only successes after uncovered runtime establish neither verification nor deployment', () => {
  assertFullAndDeploy(pushAfter((s) => [recordedRun(10, s.B, DEPLOYED_JOBS), recordedRun(20, s.R, skippedExcept({ scope: 'cancelled' }), { conclusion: 'cancelled' }),
    recordedRun(21, s.D1, DOCS_ONLY_JOBS), recordedRun(22, s.D2, DOCS_ONLY_JOBS)]));
  assertFullAndDeploy(pushAfter((s) => [recordedRun(10, s.B, DEPLOYED_JOBS), recordedRun(30, s.R, NOT_DEPLOYED_JOBS, { event: 'schedule' }),
    recordedRun(21, s.D1, DOCS_ONLY_JOBS), recordedRun(22, s.D2, DOCS_ONLY_JOBS)]), /deployed source/);
});

test('matrix: unchanged runtime but verification inputs changed since the proven run -> full + deploy', () => {
  for (const file of ['package.json', '.github/workflows/browser-smoke.yml', 'tests/app.smoke.spec.cjs']) {
    const result = pushAfter((s) => [recordedRun(10, s.R, DEPLOYED_JOBS)], { afterRuntime: file });
    assertFullAndDeploy(result, new RegExp(file.replaceAll('.', '\\.')));
    assert.deepEqual(result.decision.changedPaths.includes(file), true);
  }
});

test('matrix: a red latest full run is not searched past for an older green', () => {
  const result = pushAfter((s) => [recordedRun(10, s.R, DEPLOYED_JOBS), recordedRun(20, s.R, jobSet({ 'unit (2)': 'failure', 'chromium (lessons-1)': 'skipped', deploy: 'skipped' }),
    { conclusion: 'failure' })]);
  assertFullAndDeploy(result, /run 20.*failure/);
  assert.doesNotMatch(result.decision.reason, /run 10/);
});

test('matrix: missing API, jobs or source commit -> full + deploy', () => {
  const throwing = () => { throw new Error('API 500'); };
  assertFullAndDeploy(pushAfter(() => [], { lookups: () => ({ lookupLastFullRun: throwing, lookupLastDeployedRun: throwing }) }));
  assertFullAndDeploy(pushAfter(() => []));
  assertFullAndDeploy(pushAfter((s) => [recordedRun(10, s.R, [])]));
  assertFullAndDeploy(pushAfter((s) => [{ run: recordedRun(10, s.R, []).run, jobs: undefined }]));
  const unknown = 'f'.repeat(40);
  const record = { id: 10, headSha: unknown, attempt: 1, event: 'push' };
  assertFullAndDeploy(pushAfter(() => [], { lookups: () => ({
    lookupLastFullRun: () => ({ ...record, conclusion: 'success', verified: true }), lookupLastDeployedRun: () => record }) }), /could not be determined/);
  const { decision } = pushAfter((s) => [recordedRun(10, s.R, DEPLOYED_JOBS)], { lookups: (records) => ({ ...lookupsFor(records), lookupLastDeployedRun: () => null }) });
  assert.equal(decision.fullVerification, true);
  assert.equal(pushAfter((s) => [recordedRun(10, s.R, DEPLOYED_JOBS)], { lookups: () => ({}) }).decision.fullVerification, true);
});

test('matrix: a non-ancestor verified or deployed source -> full + deploy', () => {
  const side = ({ root, write, commit }, { B }) => {
    git(['checkout', '-b', 'side', B], root);
    write('docs/side.md', 'side\n');
    const S = commit('side docs');
    git(['checkout', 'main'], root);
    return S;
  };
  let S;
  const extra = (repo, shas) => { S = side(repo, shas); };
  assertFullAndDeploy(pushAfter(() => [recordedRun(10, S, DEPLOYED_JOBS)], { extra }));
  // A verified source on the side branch with a deployed source on the line of history, and the reverse.
  for (const [verifiedOnSide, deployedOnSide] of [[true, false], [false, true]]) {
    assertFullAndDeploy(pushAfter((s) => [recordedRun(10, deployedOnSide ? S : s.R, DEPLOYED_JOBS), recordedRun(20, verifiedOnSide ? S : s.R, NOT_DEPLOYED_JOBS, { event: 'schedule' })], { extra }));
  }
});

test('matrix: success from another branch, a pull request or an unfinished attempt is not master evidence', () => {
  const older = (s) => recordedRun(10, s.B, DEPLOYED_JOBS);
  assertFullAndDeploy(pushAfter((s) => [older(s), recordedRun(20, s.R, DEPLOYED_JOBS, { branch: 'feature' })]));
  assertFullAndDeploy(pushAfter((s) => [older(s), recordedRun(20, s.R, DEPLOYED_JOBS, { event: 'pull_request', branch: 'master' })]));
  assertFullAndDeploy(pushAfter((s) => [older(s), recordedRun(20, s.R, DEPLOYED_JOBS, { status: 'in_progress', conclusion: 'success', attempt: 2 })]), /in_progress/);
  // A green run only on another branch leaves the older source in force; that source cannot cover R.
  assertFullAndDeploy(pushAfter((s) => [recordedRun(20, s.R, DEPLOYED_JOBS, { branch: 'feature' })]));
});

test('matrix: a source older than the runtime fails the verified comparison and the deployed comparison independently', () => {
  // Verified source behind the runtime although the deployed source covers it: only the verified comparison can reject this.
  const verifiedBehind = pushAfter((s) => [recordedRun(10, s.R, DEPLOYED_JOBS), recordedRun(20, s.B, NOT_DEPLOYED_JOBS, { event: 'schedule' })]);
  assertFullAndDeploy(verifiedBehind, /verified source/);
  // Deployed source behind the runtime although the verified source covers it: only the deployed comparison can reject this.
  const deployedBehind = pushAfter((s) => [recordedRun(10, s.B, DEPLOYED_JOBS), recordedRun(20, s.R, NOT_DEPLOYED_JOBS, { event: 'schedule' })]);
  assertFullAndDeploy(deployedBehind, /deployed source/);
  assert.doesNotMatch(deployedBehind.decision.reason, new RegExp(`verified source ${deployedBehind.shas.R}`));
});

test('findLastDeployedRun needs a finished push or manual master run with deploy, build and smoke successful', () => {
  const runs = [
    recordedRun(60, 'sched', NOT_DEPLOYED_JOBS, { event: 'schedule' }),
    recordedRun(50, 'failed', jobSet({ deploy: 'failure' }), { conclusion: 'failure' }),
    recordedRun(40, 'pr', DEPLOYED_JOBS, { event: 'pull_request' }),
    recordedRun(30, 'feature', DEPLOYED_JOBS, { branch: 'feature' }),
    recordedRun(25, 'current', DEPLOYED_JOBS),
    recordedRun(20, 'docs', DOCS_ONLY_JOBS),
    recordedRun(10, 'served', DEPLOYED_JOBS, { attempt: 2 }),
  ];
  const api = { listRuns: () => runs.map((record) => record.run), listJobs: (id) => runs.find((record) => record.run.id === id).jobs };
  assert.deepEqual(findLastDeployedRun({ api, currentRunId: '26' }), { id: 25, headSha: 'current', attempt: 1, event: 'push' });
  assert.deepEqual(findLastDeployedRun({ api, currentRunId: '25' }), { id: 10, headSha: 'served', attempt: 2, event: 'push' });
  assert.equal(findLastDeployedRun({ api, currentRunId: '25', limit: 1 }), null);
});

test('the scope summary names both proven revisions', () => {
  withRepo((repo) => {
    const { R, D2, H } = standardHistory(repo);
    const records = [recordedRun(10, R, DEPLOYED_JOBS, { attempt: 3 })];
    const { lookupLastFullRun, lookupLastDeployedRun, lookupLastVerifiedRun } = lookupsFor(records);
    const dir = fs.mkdtempSync(path.join(repo.root, 'out-'));
    const summary = path.join(dir, 'summary');
    const cwd = process.cwd();
    process.chdir(repo.root);
    try {
      const decision = main({ GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_BEFORE: D2, GITHUB_SHA: H, GITHUB_STEP_SUMMARY: summary, GITHUB_RUN_NUMBER: '8' },
        lookupLastFullRun, lookupLastVerifiedRun, lookupLastDeployedRun);
      assert.equal(decision.fullVerification, false);
    } finally {
      process.chdir(cwd);
    }
    const text = fs.readFileSync(summary, 'utf8');
    assert.match(text, new RegExp(`Verified source: ${R} \\(run 10, attempt 3\\)`));
    assert.match(text, new RegExp(`Deployed source: ${R} \\(run 10, attempt 3\\)`));
  });
});

const coveredLookups = (sha) => ({
  lookupLastFullRun: () => ({ id: 100, headSha: sha, attempt: 1, event: 'push', conclusion: 'success', verified: true }),
  lookupLastDeployedRun: () => ({ id: 100, headSha: sha, attempt: 1, event: 'push' }),
});

function docsPush(makeLookups, changed = 'docs/guide.md') {
  let decision;
  withRepo(({ root, write, commit }) => {
    write('README.md', 'base\n');
    const before = commit('base');
    write(changed, 'change\n');
    const after = commit('change');
    decision = determineScope({ eventName: 'push', before, after, cwd: root, ...(makeLookups ? makeLookups(before) : {}) });
  });
  return decision;
}

test('docs-only push is allowed when both proven sources are covered', () => {
  assert.equal(docsPush(coveredLookups).fullVerification, false);
});

test('docs-only push selects full verification when the lookup fails or finds nothing', () => {
  const none = () => ({ lookupLastFullRun: () => null, lookupLastDeployedRun: () => null });
  const failing = () => ({ lookupLastFullRun: () => { throw new Error('API 500'); }, lookupLastDeployedRun: () => { throw new Error('API 500'); } });
  assert.equal(docsPush(failing).fullVerification, true);
  assert.equal(docsPush(none).fullVerification, true);
  assert.equal(docsPush(undefined).fullVerification, true);
});

test('non-docs push does not consult the lookups', () => {
  const must = () => { throw new Error('must not be called'); };
  const decision = docsPush(() => ({ lookupLastFullRun: must, lookupLastDeployedRun: must }), 'src/app.js');
  assert.equal(decision.fullVerification, true);
  assert.match(decision.reason, /src\/app\.js/);
});

test('findLastFullRun skips docs-only, in-progress-free and current runs but stops at an unfinished or red one', () => {
  const ran = jobSet({ 'unit (2)': 'failure' });
  const runs = [
    recordedRun(60, 'current', ran),
    recordedRun(40, 'docs', DOCS_ONLY_JOBS),
    recordedRun(20, 'red', ran, { conclusion: 'failure' }),
    recordedRun(10, 'old', DEPLOYED_JOBS),
  ];
  const api = { listRuns: () => runs.map((record) => record.run), listJobs: (id) => runs.find((record) => record.run.id === id).jobs };
  assert.deepEqual(findLastFullRun({ api, currentRunId: '60' }), { id: 20, headSha: 'red', attempt: 1, event: 'push', conclusion: 'failure', verified: false });
  assert.equal(findLastFullRun({ api, currentRunId: '60', limit: 1 }), null);
  const green = findLastFullRun({ api: { ...api, listRuns: () => runs.slice(3).map((record) => record.run) }, currentRunId: '60' });
  assert.equal(green.verified, true);
});

test('findLastFullRun returns a cancelled or unfinished run, including one cancelled in scope, so no older green is borrowed', () => {
  const cancelledJobs = jobSet({ 'unit (1)': 'cancelled' });
  for (const [jobs, o, conclusion] of [
    [cancelledJobs, { conclusion: 'cancelled' }, 'cancelled'],
    [skippedExcept({ scope: 'cancelled' }), { conclusion: 'cancelled' }, 'cancelled'],
    [[], { conclusion: 'success' }, 'unknown'],
    [jobSet({ checks: null }), { status: 'in_progress', conclusion: null }, 'in_progress'],
  ]) {
    const records = [recordedRun(30, 'cancel', jobs, o), recordedRun(10, 'old', DEPLOYED_JOBS)];
    const found = findLastFullRun({ api: { listRuns: () => records.map((record) => record.run), listJobs: (id) => records.find((record) => record.run.id === id).jobs }, currentRunId: '40' });
    assert.deepEqual([found.id, found.conclusion, found.verified], [30, conclusion, false]);
  }
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
  assert.equal(docsPush(coveredLookups).sweeps.rotation, '');
});

test('findLastFullRun with skipCancelled passes over cancelled and unfinished runs to the latest finished one', () => {
  const ran = jobSet({ 'unit (1)': 'cancelled' });
  const records = [
    recordedRun(40, 'busy', jobSet({ checks: null }), { status: 'in_progress', conclusion: null }),
    recordedRun(30, 'cancel', ran, { conclusion: 'cancelled' }),
    recordedRun(25, 'scope-cancel', skippedExcept({ scope: 'cancelled' }), { conclusion: 'cancelled' }),
    recordedRun(20, 'daily', NOT_DEPLOYED_JOBS, { event: 'schedule' }),
  ];
  const api = { listRuns: () => records.map((record) => record.run), listJobs: (id) => records.find((record) => record.run.id === id).jobs };
  assert.deepEqual(findLastFullRun({ api, currentRunId: '50', skipCancelled: true }),
    { id: 20, headSha: 'daily', attempt: 1, event: 'schedule', conclusion: 'success', verified: true });
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

// Workflow contract: the decision's consequences are only real if browser-smoke.yml consumes them as the tests assume.
const workflowText = fs.readFileSync(path.join(repoRoot, '.github/workflows/browser-smoke.yml'), 'utf8');
const jobBlock = (name) => {
  const start = workflowText.search(new RegExp(`^  ${name}:$`, 'm'));
  assert.notEqual(start, -1, `job ${name}`);
  const rest = workflowText.slice(start + 1);
  const next = rest.search(/^ {2}[a-z]+:$/m);
  return next === -1 ? rest : rest.slice(0, next);
};

test('workflow: full verification gates the runtime jobs and, with the smoke gate, the master deploy', () => {
  for (const job of ['checks', 'unit', 'build']) {
    assert.match(jobBlock(job), /needs: scope\n\s+if: needs\.scope\.outputs\.full_verification == 'true'/, job);
  }
  const deploy = jobBlock('deploy');
  assert.match(deploy, /needs: \[scope, smoke\]/);
  assert.match(deploy, /if: needs\.scope\.outputs\.full_verification == 'true' && github\.repository == 'efodx\/bezeg-2\.0' && github\.ref == 'refs\/heads\/master' && \(github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'\)/);
  assert.doesNotMatch(deploy, /always\(\)|schedule/, 'no status function or scheduled deploy: a failed check keeps the deploy skipped');
  assert.match(jobBlock('build'), /if: github\.repository == 'efodx\/bezeg-2\.0' && github\.ref == 'refs\/heads\/master' && \(github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'\)\n\s+uses: actions\/upload-pages-artifact/);
});

test('workflow: the scope job can read run history, and a skipped run proves nothing', () => {
  const scope = jobBlock('scope');
  assert.match(scope, /actions: read/);
  assert.match(scope, /run: node scripts\/ci-change-scope\.cjs/);
  assert.match(scope, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(scope, /fetch-depth: 0/, 'ancestry and source comparisons need full history');
  const smoke = jobBlock('smoke');
  assert.match(smoke, /if \[ "\$FULL_VERIFICATION" = 'false' \] && \[ "\$\{RESULTS%% \*\}" = 'success' \]; then exit 0; fi/);
  // The evidence readers rely on these job names: findLastFullRun on scope/checks/unit/build/chromium/smoke, findLastDeployedRun on deploy.
  for (const name of ['scope', 'checks', 'unit', 'build', 'chromium', 'smoke', 'deploy']) assert.match(workflowText, new RegExp(`^  ${name}:$`, 'm'), name);
  assert.match(workflowText, /^on:\n {2}pull_request:\n {4}branches: \[master\]\n {2}push:\n {4}branches: \[master\]\n {2}workflow_dispatch:/m);
});
