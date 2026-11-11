#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { LESSON_SHARED_PATHS, ROTATION_SLICES } = require('./transient-state-scope.cjs');
const { lessonGrep } = require('./commands.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const LESSON_SPEC = 'tests/guided-lessons.smoke.spec.cjs';

// Rows walked when a change touches no lesson runtime, shared layout or lesson content: one or two per lesson family
// or mechanism, every EXIT_SAMPLE row of the spec (the Exit/re-entry mechanisms) and the Shared lesson runtime rows.
const REPRESENTATIVE_LESSON_IDS = [
  'bernstein', 'rational-elevation', 'spline-c1', 'spline-g1', 'farin', 'repeated-subdivision', 'decasteljau', 'ph-cubic',
  'linear-function', 'derivative', 'taylor', 'bisection', 'complex-multiplication', 'triangle-centres', 'patch-tensor',
  'convex-hull', 'delaunay', 'curve-parametric', 'interp-lagrange', 'bspline-deboor', 'projective-cross-ratio',
  'prob-density', 'fortune', 'fourier-series',
];

// Paths whose change can alter any lesson row, besides the lesson runtime and shared layout of LESSON_SHARED_PATHS.
const LESSON_SPEC_PATHS = [
  /^tests\/(lesson-smoke-helpers|lesson-experience-checks|guided-lessons\.smoke\.spec)\.cjs$/,
  /^playwright\.config\.cjs$/,
  /^\.github\/workflows\//,
  /^scripts\/(ci-change-scope|commands)\.cjs$/,
  /^docs\/reviews\/bezier-patches\/guided-example-inventory\.json$/,
];

const allLessons = (reason) => ({ all: true, ids: null, grep: '', reason });
// The unit catalog sweeps (scripts/transient-state-scope.cjs): empty rotation and base mean every entry.
const allSweeps = (reason) => ({ rotation: '', base: '', reason });

function git(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'buffer',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.toString('utf8').trim() || `git ${args[0]} failed`);
  }
  return result.stdout;
}

function commit(ref, cwd) {
  const output = git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], cwd)
    .toString('utf8')
    .trim();
  if (!/^[0-9a-f]{40,64}$/i.test(output)) throw new Error(`Invalid commit: ${ref}`);
  return output;
}

function isDocumentationPath(filePath) {
  return /^docs\/.+\.md$/.test(filePath)
    || /^(README|AGENTS|CLAUDE)\.md$/.test(filePath);
}

function full(reason, changedPaths = []) {
  return {
    fullVerification: true, reason, changedPaths, lessons: allLessons('the verification scope is full'), sweeps: allSweeps('the verification scope is full'),
  };
}

function documentationOnly(paths) {
  if (paths.length === 0) return full('The comparison produced no changed paths.');
  const unknownPath = paths.find((filePath) => !isDocumentationPath(filePath));
  if (unknownPath) return full(`Full verification is required because ${unknownPath} is outside the documentation allowlist.`, paths);
  return {
    fullVerification: false,
    reason: `All ${paths.length} changed path${paths.length === 1 ? ' is' : 's are'} recognized documentation.`,
    changedPaths: paths,
    lessons: allLessons('no browser smoke runs'),
    sweeps: allSweeps('no unit tests run'),
  };
}

// Which catalog sweep entries the unit shards check for a push or pull request with code changes: the sample, the entries
// the changes since `base` reach, and rotation slice `runNumber % ROTATION_SLICES`. A push diffs against the head of the
// latest finished (not cancelled) full run on master, so code whose run was cancelled stays in the diff; when that run did
// not succeed, or anything is uncertain, every entry runs. The daily scheduled run checks every entry.
function sweepScope({ eventName, base, head, runNumber, lookupLastVerifiedRun, cwd }) {
  try {
    if (!/^\d+$/.test(String(runNumber ?? '').trim())) return allSweeps('the run number is unknown');
    const number = Number(String(runNumber).trim());
    let sweepBase = base;
    if (eventName === 'push') {
      if (typeof lookupLastVerifiedRun !== 'function') return allSweeps('no lookup of the last verified run is available');
      const last = lookupLastVerifiedRun();
      if (!last) return allSweeps(`no finished full verification run was found among the last ${MAX_RUNS_LOOKED_BACK} master runs`);
      if (last.conclusion !== 'success') {
        return allSweeps(`the latest full verification run on master (run ${last.id}, commit ${last.headSha}) concluded ${last.conclusion}`);
      }
      sweepBase = commit(last.headSha, cwd);
      git(['merge-base', '--is-ancestor', sweepBase, head], cwd);
    }
    const rotation = `${number % ROTATION_SLICES}/${ROTATION_SLICES}`;
    return { rotation, base: sweepBase, reason: `sample, entries reached since ${sweepBase.slice(0, 12)}, rotation slice ${rotation}` };
  } catch (error) {
    return allSweeps(`the sweep base could not be decided (${error.message.split('\n')[0]})`);
  }
}

const isTestFile = (filePath) => /\.test\.[jt]sx?$/.test(filePath);
const isContentFile = (filePath) => /^src\/learning\/content\//.test(filePath) && !isTestFile(filePath);

// The spec row ids a changed lesson content file names as quoted strings; null when it names none or cannot be read.
// Mirrors lessonsMentionedBy in src/learning/runtime/lessonRestorationContract.tsx.
function rowsMentionedBy(filePath, rowIds, cwd) {
  let text;
  try {
    text = fs.readFileSync(path.join(cwd, filePath), 'utf8');
  } catch {
    return null;
  }
  const mentioned = rowIds.filter((id) => ["'", '"', '`'].some((quote) => text.includes(quote + id + quote)));
  return mentioned.length > 0 ? mentioned : null;
}

// Which guided-lesson rows the hosted lesson shards walk for these changed paths.
function lessonScope(paths, cwd = process.cwd()) {
  try {
    const shared = paths.find((filePath) => !isTestFile(filePath)
      && [...LESSON_SHARED_PATHS, ...LESSON_SPEC_PATHS].some((pattern) => pattern.test(filePath)));
    if (shared) return allLessons(`${shared} is shared by every lesson`);
    const specText = fs.readFileSync(path.join(REPO_ROOT, LESSON_SPEC), 'utf8');
    const rowIds = [...new Set([...specText.matchAll(/\bid: '([a-z0-9-]+)'/g)].map((match) => match[1]))];
    const content = paths.filter(isContentFile);
    const reached = new Set();
    for (const filePath of content) {
      const found = rowsMentionedBy(filePath, rowIds, cwd);
      if (!found) return allLessons(`${filePath} names no lesson row`);
      found.forEach((id) => reached.add(id));
    }
    const others = paths.filter((filePath) => !isDocumentationPath(filePath) && !isTestFile(filePath) && !isContentFile(filePath));
    const contentIds = rowIds.filter((id) => reached.has(id));
    let ids;
    let reason;
    if (content.length > 0 && others.length === 0) {
      ids = contentIds;
      reason = `lesson content reaches ${ids.length} row${ids.length === 1 ? '' : 's'}`;
    } else {
      ids = [...REPRESENTATIVE_LESSON_IDS, ...contentIds.filter((id) => !REPRESENTATIVE_LESSON_IDS.includes(id))];
      reason = content.length > 0 ? 'representative rows plus the rows lesson content reaches' : 'representative rows';
    }
    // The spec's standalone describes (extras, observation flow) test mechanisms no row reaches, so a scoped run keeps them.
    const extras = [...specText.matchAll(/^test\.describe\('([^']+)'/gm)].map((match) => match[1])
      .filter((title) => title !== 'Shared lesson runtime');
    const grep = extras.length > 0 ? `${lessonGrep(REPO_ROOT, ids)}|(${extras.join('|')}) ` : lessonGrep(REPO_ROOT, ids);
    return { all: false, ids, extras, grep, reason };
  } catch (error) {
    return allLessons(`the lesson scope could not be decided (${error.message.split('\n')[0]})`);
  }
}

function diffPaths(base, head, cwd) {
  const output = git(['diff', '--name-only', '-z', '--no-renames', base, head, '--'], cwd);
  return output.toString('utf8').split('\0').filter(Boolean);
}

function readPullRequestRange(eventPayload) {
  const payload = typeof eventPayload === 'string' ? JSON.parse(eventPayload) : eventPayload;
  const base = payload?.pull_request?.base?.sha;
  const head = payload?.pull_request?.head?.sha;
  if (typeof base !== 'string' || !base || typeof head !== 'string' || !head) {
    throw new Error('Pull request base/head commit is missing from the event payload.');
  }
  return { base, head };
}

const MAX_RUNS_LOOKED_BACK = 50;
const FULL_VERIFICATION_JOBS = ['checks', 'unit'];

// Walks completed master runs newest first and returns the latest one that ran full verification, or null.
// `api.listRuns()` returns runs newest first; `api.listJobs(runId)` returns that run's jobs. `skipCancelled` passes over
// cancelled runs (the catalog sweep base: a later diff still covers their code).
function findLastFullRun({ api, currentRunId, limit = MAX_RUNS_LOOKED_BACK, skipCancelled = false }) {
  const current = Number(currentRunId);
  const runs = api.listRuns()
    .filter((run) => run.event !== 'pull_request' && (!current || run.id < current))
    .slice(0, limit);
  for (const run of runs) {
    // A cancelled run that started checks or unit is returned: its code was never verified, so it selects full.
    if (run.status !== 'completed' || (skipCancelled && run.conclusion === 'cancelled')) continue;
    const jobs = api.listJobs(run.id);
    const ran = jobs.some((job) => FULL_VERIFICATION_JOBS.includes(job.name) && job.conclusion !== 'skipped');
    if (ran) return { id: run.id, headSha: run.head_sha, conclusion: run.conclusion };
  }
  return null;
}

function ghJson(path, env) {
  const result = spawnSync('gh', ['api', path], { encoding: 'utf8', env, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `gh api ${path} failed`);
  return JSON.parse(result.stdout);
}

function lookupLastFullRunViaGh(env = process.env, { skipCancelled = false } = {}) {
  if (!env.GH_TOKEN && !env.GITHUB_TOKEN) throw new Error('no GitHub token is available');
  if (!env.GITHUB_REPOSITORY) throw new Error('GITHUB_REPOSITORY is not set');
  const ghEnv = { ...env, GH_TOKEN: env.GH_TOKEN || env.GITHUB_TOKEN };
  const repo = env.GITHUB_REPOSITORY;
  const workflow = env.GITHUB_WORKFLOW_FILE || 'browser-smoke.yml';
  return findLastFullRun({
    skipCancelled,
    currentRunId: env.GITHUB_RUN_ID,
    api: {
      listRuns: () => ghJson(
        `repos/${repo}/actions/workflows/${workflow}/runs?branch=master&status=completed&per_page=${MAX_RUNS_LOOKED_BACK}`,
        ghEnv,
      ).workflow_runs,
      listJobs: (runId) => ghJson(`repos/${repo}/actions/runs/${runId}/jobs?per_page=100`, ghEnv).jobs,
    },
  });
}

// A docs-only push must not hide a red master: it inherits the verdict of the latest full run.
function guardDocumentationOnly(decision, lookupLastFullRun) {
  if (decision.fullVerification) return decision;
  try {
    if (typeof lookupLastFullRun !== 'function') throw new Error('no lookup is available');
    const last = lookupLastFullRun();
    if (!last) throw new Error(`no full verification run was found among the last ${MAX_RUNS_LOOKED_BACK} master runs`);
    if (last.conclusion !== 'success') {
      return full(
        `Full verification is required because the latest full verification run on master (run ${last.id}, commit ${last.headSha}) concluded ${last.conclusion}.`,
        decision.changedPaths,
      );
    }
    return { ...decision, reason: `${decision.reason} The latest full verification run on master (run ${last.id}, commit ${last.headSha}) succeeded.` };
  } catch (error) {
    return full(`The previous full verification result could not be determined (${error.message}); running full verification.`, decision.changedPaths);
  }
}

function determineScope({ eventName, eventPayload, before, after, cwd = process.cwd(), lookupLastFullRun, runNumber, lookupLastVerifiedRun }) {
  if (eventName === 'workflow_dispatch') return full('Manual dispatch always runs full verification.');
  if (eventName === 'schedule') return full('The daily scheduled run checks every catalog sweep entry and every lesson row.');

  try {
    let base;
    let head;
    if (eventName === 'pull_request') {
      ({ base, head } = readPullRequestRange(eventPayload));
      const mergeBase = git(['merge-base', commit(base, cwd), commit(head, cwd)], cwd).toString('utf8').trim();
      if (!mergeBase) throw new Error('Git returned an empty pull request merge base.');
      base = mergeBase;
    } else if (eventName === 'push') {
      if (typeof before !== 'string' || !before || typeof after !== 'string' || !after) {
        throw new Error('Push before/after commit is missing.');
      }
      base = commit(before, cwd);
      head = commit(after, cwd);
    } else {
      throw new Error(`Unsupported event type: ${eventName || '(missing)'}`);
    }

    const paths = diffPaths(base, head, cwd);
    const decision = documentationOnly(paths);
    if (decision.fullVerification && paths.length > 0) {
      decision.lessons = lessonScope(paths, cwd);
      decision.sweeps = sweepScope({ eventName, base, head, runNumber, lookupLastVerifiedRun, cwd });
    }
    // Applied to pushes only; pull requests do not change master's state.
    return eventName === 'push' ? guardDocumentationOnly(decision, lookupLastFullRun) : decision;
  } catch (error) {
    return full(`The change comparison could not be trusted (${error.message}); running full verification.`);
  }
}

function appendOutput(filePath, values) {
  if (!filePath) return;
  fs.appendFileSync(filePath, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n')}\n`);
}

function lessonSummary(lessons) {
  if (lessons.all) return `Guided lesson rows: all (${lessons.reason}).`;
  const kind = lessons.reason.startsWith('representative') ? ' representative' : '';
  return `Guided lesson rows: ${lessons.ids.length}${kind} (${lessons.reason}): ${lessons.ids.join(', ')}.`;
}

function appendSummary(filePath, decision) {
  if (!filePath) return;
  const mode = decision.fullVerification ? 'Full verification' : 'Documentation-only change';
  const paths = decision.changedPaths.length
    ? `\n\nChanged paths:\n${decision.changedPaths.map((item) => `- \`${item.replaceAll('`', '\\`')}\``).join('\n')}`
    : '';
  const sweeps = decision.sweeps.rotation ? `Catalog sweeps: ${decision.sweeps.reason}.` : `Catalog sweeps: every entry (${decision.sweeps.reason}).`;
  const scoped = decision.fullVerification ? `\n\n${lessonSummary(decision.lessons)}\n\n${sweeps}` : '';
  fs.appendFileSync(filePath, `## Browser smoke scope\n\n**${mode}.** ${decision.reason}${scoped}${paths}\n`);
}

function main(
  env = process.env,
  lookupLastFullRun = () => lookupLastFullRunViaGh(env),
  lookupLastVerifiedRun = () => lookupLastFullRunViaGh(env, { skipCancelled: true }),
) {
  let eventPayload;
  let decision;
  try {
    if (env.GITHUB_EVENT_PATH) eventPayload = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    decision = determineScope({
      eventName: env.GITHUB_EVENT_NAME,
      eventPayload,
      before: env.GITHUB_EVENT_BEFORE,
      after: env.GITHUB_SHA,
      lookupLastFullRun,
      runNumber: env.GITHUB_RUN_NUMBER,
      lookupLastVerifiedRun,
    });
  } catch (error) {
    decision = full(`The event comparison information could not be read (${error.message}); running full verification.`);
  }
  appendOutput(env.GITHUB_OUTPUT, {
    full_verification: String(decision.fullVerification),
    reason: decision.reason.replace(/[\r\n]/g, ' '),
    lesson_grep: decision.lessons.grep.replace(/[\r\n]/g, ' '),
    sweep_rotation: decision.sweeps.rotation,
    sweep_base: decision.sweeps.base,
  });
  appendSummary(env.GITHUB_STEP_SUMMARY, decision);
  return decision;
}

if (require.main === module) {
  const result = main();
  process.stdout.write(`${result.fullVerification ? 'full' : 'documentation-only'}: ${result.reason}\n`);
}

module.exports = { REPRESENTATIVE_LESSON_IDS, determineScope, sweepScope, findLastFullRun, isDocumentationPath, lessonScope, main, readPullRequestRange };
