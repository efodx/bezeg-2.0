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

// Files under docs/ that a unit test, smoke spec or the build reads: data and code by extension, and the Markdown
// files named here. A change to one of them runs the full verification. ci-change-scope.test.cjs checks that every
// docs/ path a test names is left out of the allowlist.
const DOCS_READ_BY_TESTS = new Set(['docs/specs/school-function-graphs-lessons.md']);
const DOCS_DATA = /\.(json|[cm]?js|[jt]sx?)$/i;

// Documentation: every file under docs/ except DOCS_READ_BY_TESTS and data or code files, and Markdown at the root
// (T05, phase 8 change 7 of docs/specs/verification-throughput.md).
function isDocumentationPath(filePath) {
  if (/^[^/\\]+\.md$/.test(filePath)) return true;
  if (!/^docs\/[^\\]+$/.test(filePath)) return false;
  return !DOCS_DATA.test(filePath) && !DOCS_READ_BY_TESTS.has(filePath);
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
// Every job family that must succeed before a run counts as verified source; matrix shards are named `unit (1)`.
const REQUIRED_RUNTIME_JOBS = ['scope', 'checks', 'unit', 'build', 'chromium', 'smoke'];
// Master evidence comes from these events only: a pull request run is never trusted, whatever its branch name says.
const VERIFIED_RUN_EVENTS = ['push', 'schedule', 'workflow_dispatch'];
// A scheduled run never deploys, so it cannot prove what Pages serves.
const DEPLOYED_RUN_EVENTS = ['push', 'workflow_dispatch'];

const jobFamily = (job) => String(job?.name ?? '').replace(/ \(.*\)$/, '');
const jobsOf = (jobs, family) => jobs.filter((job) => jobFamily(job) === family);

function trustedRuns(api, currentRunId, events, limit) {
  const current = Number(currentRunId);
  return api.listRuns()
    .filter((run) => run.head_branch === 'master' && events.includes(run.event) && (!current || run.id < current))
    .slice(0, limit);
}

const runIdentity = (run) => ({ id: run.id, headSha: run.head_sha, attempt: run.run_attempt ?? 1, event: run.event });

// Walks master runs newest first and returns the latest one that ran, or may have run, full verification; null when none.
// `api.listRuns()` returns runs newest first, any status; `api.listJobs(runId)` returns that run's jobs. The record carries
// the run's identity, its conclusion (the run status while unfinished) and `verified`: finished, successful, and every
// required job family successful. A run whose scope was cancelled or never finished, or whose jobs cannot be read, is
// returned as unverified instead of being passed over, so no older green can stand in for it. Only a run whose scope
// succeeded and skipped the checks (documentation-only) is passed over. `skipCancelled` is the catalog sweep base lookup:
// it passes over cancelled and unfinished runs, because a later diff still covers their code.
function findLastFullRun({ api, currentRunId, limit = MAX_RUNS_LOOKED_BACK, skipCancelled = false }) {
  for (const run of trustedRuns(api, currentRunId, VERIFIED_RUN_EVENTS, limit)) {
    const finished = run.status === 'completed';
    if (skipCancelled && (!finished || run.conclusion === 'cancelled')) continue;
    const jobs = api.listJobs(run.id) ?? [];
    const ran = jobs.some((job) => FULL_VERIFICATION_JOBS.includes(jobFamily(job)) && job.conclusion !== 'skipped');
    if (!ran) {
      const docsOnly = jobsOf(jobs, 'scope').some((job) => job.conclusion === 'success')
        && FULL_VERIFICATION_JOBS.every((family) => jobsOf(jobs, family).some((job) => job.conclusion === 'skipped'));
      if (docsOnly || skipCancelled) continue;
      return { ...runIdentity(run), conclusion: finished ? (run.conclusion === 'success' ? 'unknown' : run.conclusion) : run.status, verified: false };
    }
    const everyJobGreen = REQUIRED_RUNTIME_JOBS.every((family) => {
      const familyJobs = jobsOf(jobs, family);
      return familyJobs.length > 0 && familyJobs.every((job) => job.conclusion === 'success');
    });
    return { ...runIdentity(run), conclusion: finished ? run.conclusion : run.status, verified: finished && run.conclusion === 'success' && everyJobGreen };
  }
  return null;
}

// The most recent finished push or manual master run whose verification and `deploy` job both succeeded: what Pages serves.
function findLastDeployedRun({ api, currentRunId, limit = MAX_RUNS_LOOKED_BACK }) {
  for (const run of trustedRuns(api, currentRunId, DEPLOYED_RUN_EVENTS, limit)) {
    if (run.status !== 'completed' || run.conclusion !== 'success') continue;
    const jobs = api.listJobs(run.id) ?? [];
    const green = (family) => jobsOf(jobs, family).some((job) => job.conclusion === 'success');
    if (green('deploy') && green('smoke') && green('build')) return runIdentity(run);
  }
  return null;
}

function ghJson(path, env) {
  const result = spawnSync('gh', ['api', path], { encoding: 'utf8', env, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `gh api ${path} failed`);
  return JSON.parse(result.stdout);
}

function ghApi(env) {
  if (!env.GH_TOKEN && !env.GITHUB_TOKEN) throw new Error('no GitHub token is available');
  if (!env.GITHUB_REPOSITORY) throw new Error('GITHUB_REPOSITORY is not set');
  const ghEnv = { ...env, GH_TOKEN: env.GH_TOKEN || env.GITHUB_TOKEN };
  const repo = env.GITHUB_REPOSITORY;
  const workflow = env.GITHUB_WORKFLOW_FILE || 'browser-smoke.yml';
  const jobs = new Map();
  return {
    // Every status, so an unfinished predecessor is seen instead of an older green run being borrowed.
    listRuns: () => ghJson(`repos/${repo}/actions/workflows/${workflow}/runs?branch=master&per_page=${MAX_RUNS_LOOKED_BACK}`, ghEnv).workflow_runs,
    listJobs: (runId) => {
      if (!jobs.has(runId)) jobs.set(runId, ghJson(`repos/${repo}/actions/runs/${runId}/jobs?per_page=100`, ghEnv).jobs);
      return jobs.get(runId);
    },
  };
}

function lookupLastFullRunViaGh(env = process.env, { skipCancelled = false } = {}) {
  return findLastFullRun({ skipCancelled, currentRunId: env.GITHUB_RUN_ID, api: ghApi(env) });
}

function lookupLastDeployedRunViaGh(env = process.env) {
  return findLastDeployedRun({ currentRunId: env.GITHUB_RUN_ID, api: ghApi(env) });
}

const describeRun = (label, run) => `${label} ${run.headSha} (run ${run.id}, attempt ${run.attempt ?? 1}, ${run.event ?? 'unknown event'})`;

// A docs-only push must not hide a red or unpublished master. It takes the fast path only when two independently proven
// sources, the latest full verification run and the most recent successful Pages deploy, are both ancestors of HEAD
// and differ from it in documentation only. Anything else runs full verification, which reaches the deploy gate on master;
// the recovery run's lesson and sweep scope covers the runtime paths still pending since those sources.
function guardDocumentationOnly(decision, { lookupLastFullRun, lookupLastDeployedRun, head, cwd, runNumber, lookupLastVerifiedRun }) {
  if (decision.fullVerification) return decision;
  try {
    if (typeof lookupLastFullRun !== 'function') throw new Error('no lookup is available');
    if (typeof lookupLastDeployedRun !== 'function') throw new Error('no lookup of the deployed run is available');
    const verified = lookupLastFullRun();
    if (!verified) throw new Error(`no full verification run was found among the last ${MAX_RUNS_LOOKED_BACK} master runs`);
    if (!verified.verified) {
      return full(
        `Full verification is required because the latest full verification run on master (run ${verified.id}, commit ${verified.headSha}) concluded ${verified.conclusion}, not with every required job successful.`,
        decision.changedPaths,
      );
    }
    const deployed = lookupLastDeployedRun();
    if (!deployed) throw new Error(`no successful Pages deploy was found among the last ${MAX_RUNS_LOOKED_BACK} master runs`);

    const pending = new Set();
    const stale = [];
    for (const [label, source] of [['verified source', verified], ['deployed source', deployed]]) {
      const sourceCommit = commit(source.headSha, cwd);
      git(['merge-base', '--is-ancestor', sourceCommit, head], cwd);
      const outside = diffPaths(sourceCommit, head, cwd).filter((filePath) => !isDocumentationPath(filePath));
      if (outside.length > 0) stale.push(`${label} ${source.headSha}`);
      outside.forEach((filePath) => pending.add(filePath));
    }
    const provenance = { verified, deployed };
    if (stale.length === 0) {
      return {
        ...decision,
        provenance,
        reason: `${decision.reason} ${describeRun('Verified source', verified)} and ${describeRun('deployed source', deployed)} differ from this commit in documentation only.`,
      };
    }
    const runtimePaths = [...pending];
    return {
      fullVerification: true,
      provenance,
      reason: `Full verification is required because runtime paths changed since the ${stale.join(' and ')}: ${runtimePaths.join(', ')}. `
        + `${describeRun('Verified source', verified)}; ${describeRun('deployed source', deployed)}.`,
      changedPaths: [...new Set([...decision.changedPaths, ...runtimePaths])],
      lessons: lessonScope(runtimePaths, cwd),
      sweeps: sweepScope({ eventName: 'push', base: null, head, runNumber, lookupLastVerifiedRun, cwd }),
    };
  } catch (error) {
    return full(`The previous full verification or deployment result could not be determined (${error.message.split('\n')[0]}); running full verification.`, decision.changedPaths);
  }
}

function determineScope({ eventName, eventPayload, before, after, cwd = process.cwd(), lookupLastFullRun, lookupLastDeployedRun, runNumber, lookupLastVerifiedRun }) {
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
    return eventName === 'push'
      ? guardDocumentationOnly(decision, { lookupLastFullRun, lookupLastDeployedRun, head, cwd, runNumber, lookupLastVerifiedRun })
      : decision;
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
  const provenance = decision.provenance
    ? `

Verified source: ${decision.provenance.verified.headSha} (run ${decision.provenance.verified.id}, attempt ${decision.provenance.verified.attempt}).

Deployed source: ${decision.provenance.deployed.headSha} (run ${decision.provenance.deployed.id}, attempt ${decision.provenance.deployed.attempt}).`
    : '';
  const scoped = decision.fullVerification ? `\n\n${lessonSummary(decision.lessons)}\n\n${sweeps}` : '';
  fs.appendFileSync(filePath, `## Browser smoke scope\n\n**${mode}.** ${decision.reason}${provenance}${scoped}${paths}\n`);
}

function main(
  env = process.env,
  lookupLastFullRun = () => lookupLastFullRunViaGh(env),
  lookupLastVerifiedRun = () => lookupLastFullRunViaGh(env, { skipCancelled: true }),
  lookupLastDeployedRun = () => lookupLastDeployedRunViaGh(env),
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
      lookupLastDeployedRun,
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

module.exports = { REPRESENTATIVE_LESSON_IDS, determineScope, sweepScope, findLastFullRun, findLastDeployedRun, isDocumentationPath, lessonScope, main, readPullRequestRange };
