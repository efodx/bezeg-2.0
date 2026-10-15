#!/usr/bin/env node

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

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
  return { fullVerification: true, reason, changedPaths };
}

function documentationOnly(paths) {
  if (paths.length === 0) return full('The comparison produced no changed paths.');
  const unknownPath = paths.find((filePath) => !isDocumentationPath(filePath));
  if (unknownPath) return full(`Full verification is required because ${unknownPath} is outside the documentation allowlist.`, paths);
  return {
    fullVerification: false,
    reason: `All ${paths.length} changed path${paths.length === 1 ? ' is' : 's are'} recognized documentation.`,
    changedPaths: paths,
  };
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

function determineScope({ eventName, eventPayload, before, after, cwd = process.cwd() }) {
  if (eventName === 'workflow_dispatch') return full('Manual dispatch always runs full verification.');

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
    return documentationOnly(paths);
  } catch (error) {
    return full(`The change comparison could not be trusted (${error.message}); running full verification.`);
  }
}

function appendOutput(filePath, values) {
  if (!filePath) return;
  fs.appendFileSync(filePath, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n')}\n`);
}

function appendSummary(filePath, decision) {
  if (!filePath) return;
  const mode = decision.fullVerification ? 'Full verification' : 'Documentation-only change';
  const paths = decision.changedPaths.length
    ? `\n\nChanged paths:\n${decision.changedPaths.map((item) => `- \`${item.replaceAll('`', '\\`')}\``).join('\n')}`
    : '';
  fs.appendFileSync(filePath, `## Browser smoke scope\n\n**${mode}.** ${decision.reason}${paths}\n`);
}

function main(env = process.env) {
  let eventPayload;
  let decision;
  try {
    if (env.GITHUB_EVENT_PATH) eventPayload = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    decision = determineScope({
      eventName: env.GITHUB_EVENT_NAME,
      eventPayload,
      before: env.GITHUB_EVENT_BEFORE,
      after: env.GITHUB_SHA,
    });
  } catch (error) {
    decision = full(`The event comparison information could not be read (${error.message}); running full verification.`);
  }
  appendOutput(env.GITHUB_OUTPUT, {
    full_verification: String(decision.fullVerification),
    reason: decision.reason.replace(/[\r\n]/g, ' '),
  });
  appendSummary(env.GITHUB_STEP_SUMMARY, decision);
  return decision;
}

if (require.main === module) {
  const result = main();
  process.stdout.write(`${result.fullVerification ? 'full' : 'documentation-only'}: ${result.reason}\n`);
}

module.exports = { determineScope, isDocumentationPath, main, readPullRequestRange };
