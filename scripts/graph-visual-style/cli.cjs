const fs = require('node:fs');
const path = require('node:path');

function readOptions(argv, positionalNames = []) {
  const options = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const equal = token.indexOf('=');
    const rawKey = token.slice(2, equal < 0 ? undefined : equal);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (equal >= 0) {
      options[key] = token.slice(equal + 1);
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      options[key] = argv[i + 1];
      i += 1;
    } else {
      options[key] = true;
    }
  }
  positionalNames.forEach((name, index) => {
    if (options[name] === undefined && positional[index] !== undefined) options[name] = positional[index];
  });
  return options;
}

function resolveFromRoot(root, value) {
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

function selectedIds(value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (value === 'all') return null;
  return value.split(',').map((id) => id.trim()).filter(Boolean);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

module.exports = { readOptions, resolveFromRoot, selectedIds, writeJson };
