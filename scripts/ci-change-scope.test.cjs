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
  for (const file of ['docs/README.md', 'docs/nested/topic.md', 'README.md', 'AGENTS.md', 'CLAUDE.md']) {
    assert.equal(isDocumentationPath(file), true, file);
  }
  for (const file of ['docs/guide.txt', 'docs/README.MD', 'docs\\anything.md', 'src/README.md', '.github/workflows/build.yml', 'package.json']) {
    assert.equal(isDocumentationPath(file), false, file);
  }
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
