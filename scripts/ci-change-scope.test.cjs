const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { determineScope, isDocumentationPath, main } = require('./ci-change-scope.cjs');

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
    const decision = determineScope({ eventName: 'push', before, after, cwd: root });
    assert.equal(decision.fullVerification, false);
    assert.deepEqual(decision.changedPaths.sort(), ['docs/one.md', 'docs/two.md']);
  });
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
