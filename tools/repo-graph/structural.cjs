const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const STATE_DIR = '.repo-graph';
const EXTRACTOR_VERSION = 'structural-v3';
const SUPPORTED = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs', '.md', '.mdx', '.json', '.yaml', '.yml', '.toml', '.html', '.css', '.scss', '.sass', '.less', '.txt', '.xml', '.svg', '.sh', '.ps1', '.cjs', '.mjs', '.just']);
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.mp4', '.zip', '.gz', '.wasm', '.exe', '.dll', '.bin']);

function hash(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function slash(p) { return p.split(path.sep).join('/'); }
function compare(a, b) {
  a = String(a); b = String(b);
  if (a === b) return 0;
  let i = 0; let j = 0;
  while (i < a.length && j < b.length) {
    const left = a.codePointAt(i); const right = b.codePointAt(j);
    if (left !== right) return left < right ? -1 : 1;
    i += left > 0xffff ? 2 : 1; j += right > 0xffff ? 2 : 1;
  }
  return i < a.length ? 1 : j < b.length ? -1 : 0;
}
function git(root, args) { return execFileSync('git', args, { cwd: root, encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').split('\0').filter(Boolean); }
function trackedAndUntracked(root) {
  try { return [...new Set(git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']))].sort(compare); }
  catch (cause) { throw new Error('Repository graph needs an accessible Git working tree; ignored-file inventory could not be established.', {cause}); }
}
function exclusion(rel) {
  const p = slash(rel); const base = path.posix.basename(p); const ext = path.posix.extname(p).toLowerCase();
  if (p === STATE_DIR || p.startsWith(`${STATE_DIR}/`)) return 'graph-artifact';
  if (p === 'tools/repo-graph' || p.startsWith('tools/repo-graph/')) return 'graph-tool-artifact';
  if (/(^|\/)(node_modules|vendor|\.git|coverage|build|dist|out|target|\.next|\.vite|\.cache)(\/|$)/i.test(p)) return 'dependency-or-generated';
  if (/(^|\/)(generated|artifacts)(\/|$)/i.test(p) || /\.generated\.[^.]+$/i.test(base)) return 'generated-artifact';
  if (/(^|\/)(credentials?|secrets?)(\/|$)/i.test(p) || /^\.env(?:\.|$)/i.test(base) || /\.(pem|key|p12|pfx|keystore|secret)$/i.test(base)) return 'credential';
  if (BINARY_EXT.has(ext)) return 'binary';
  if (!SUPPORTED.has(ext) && !['LICENSE', 'NOTICE', 'Makefile', 'Dockerfile', '.gitignore', '.npmrc', '.nvmrc', 'justfile', 'Justfile'].includes(base)) return 'unsupported-format';
  return null;
}
function inventory(root) {
  const files = []; const excluded = [];
  const realRoot = fs.realpathSync(root);
  for (const candidate of trackedAndUntracked(root)) {
    const rel = slash(candidate);
    const reason = exclusion(rel);
    if (reason) { excluded.push({ path: rel, reason }); continue; }
    const absolute = path.join(root, candidate);
    const pathSafety = inspectPath(root, realRoot, candidate);
    if (pathSafety) { excluded.push({ path: rel, reason: pathSafety }); continue; }
    let content;
    try { content = fs.readFileSync(absolute); } catch { excluded.push({ path: rel, reason: 'unreadable' }); continue; }
    if (content.includes(0)) { excluded.push({ path: rel, reason: 'binary' }); continue; }
    files.push({ path: rel, hash: hash(content) });
  }
  files.sort((a, b) => compare(a.path, b.path)); excluded.sort((a, b) => compare(a.path, b.path) || compare(a.reason, b.reason));
  return { files, excluded };
}
function inspectPath(root, realRoot, relative) {
  const segments = slash(relative).split('/').filter(Boolean); let current = root;
  try {
    for (const segment of segments) {
      current = path.join(current, segment);
      if (fs.lstatSync(current).isSymbolicLink()) return 'symlink';
    }
    const real = fs.realpathSync(current); const rel = path.relative(realRoot, real);
    if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return 'outside-root';
  } catch { return 'unreadable'; }
  return null;
}
function readUtf8(root, rel) {
  const realRoot = fs.realpathSync(root); const safety = inspectPath(root, realRoot, rel);
  if (safety) throw new Error(`Refusing to read ${rel}: ${safety}.`);
  return fs.readFileSync(path.join(root, rel), 'utf8').replace(/^\uFEFF/, '');
}
function tsApi() { return require('typescript'); }
function configDetails(root, ts) {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (configPath) {
    const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => {},
    });
    const configs = resolvedConfigFiles(configPath, root, ts);
    const { configFile: _configFile, ...effectiveOptions } = parsed?.options || {};
    const compilerFiles = (parsed?.fileNames || []).map(file => slash(path.relative(root, path.resolve(file)))).sort(compare);
    return { configFingerprint: hash(JSON.stringify({ compilerVersion: ts.version, configs, effectiveOptions, compilerFiles, errors: (parsed?.errors || []).map(d => d.code) })), parsed, configPath, configs, compilerFiles };
  }
  return { configFingerprint: hash(`typescript:${ts.version}`), parsed: null, configPath: null, configs: [], compilerFiles: [] };
}
function resolvedConfigFiles(configPath, root, ts) {
  const files = new Map(); const pending = [path.resolve(configPath)];
  while (pending.length) {
    const current = pending.pop(); if (files.has(current)) continue;
    let raw; try { raw = ts.readConfigFile(current, ts.sys.readFile).config; } catch { raw = null; }
    if (!raw) continue;
    let contentHash; try { contentHash = hash(fs.readFileSync(current)); } catch { contentHash = 'unreadable'; }
    files.set(current, { path: slash(path.relative(root, current)), hash: contentHash });
    const refs = Array.isArray(raw.extends) ? raw.extends : raw.extends ? [raw.extends] : [];
    for (const ref of refs) {
      try {
        let resolved;
        if (ref.startsWith('.') || path.isAbsolute(ref)) {
          const base = path.resolve(path.dirname(current), ref);
          resolved = path.extname(base) ? base : fs.existsSync(`${base}.json`) ? `${base}.json` : path.join(base, 'tsconfig.json');
        } else {
          try { resolved = require.resolve(`${ref}/tsconfig.json`, { paths: [path.dirname(current)] }); }
          catch { resolved = require.resolve(ref, { paths: [path.dirname(current)] }); }
        }
        if (ts.sys.fileExists(resolved)) pending.push(resolved);
      } catch { /* Unresolved extends remain represented by the compiler config diagnostics. */ }
    }
  }
  return [...files.values()].sort((a, b) => compare(a.path, b.path));
}
function makeId(rel, kind, identity, ordinal = 1) { return `${rel}#${kind}:${encodeURIComponent(identity)}:${ordinal}`; }
function linesAt(text, start, end) {
  const last = end > start ? end - 1 : start;
  return { startLine: text.slice(0, start).split('\n').length, endLine: text.slice(0, last).split('\n').length };
}
function sourceNode(id, kind, rel, text, start, end, provenance, extras = {}) {
  const range = linesAt(text, start, end);
  return { id, kind, path: rel, ...range, startOffset: start, endOffset: end,
    text: text.slice(start, end), contentHash: hash(text.slice(start, end)), provenance, ...extras };
}
function sortSnapshot(snapshot) {
  snapshot.nodes.sort((a, b) => compare(a.id, b.id));
  snapshot.edges.sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to) || compare(a.type, b.type) || compare(a.provenance, b.provenance));
  snapshot.edges = snapshot.edges.filter((edge, index, all) => index === 0 || edge.from !== all[index - 1].from || edge.to !== all[index - 1].to || edge.type !== all[index - 1].type || edge.provenance !== all[index - 1].provenance);
  snapshot.manifest.files.sort((a, b) => compare(a.path, b.path)); snapshot.manifest.excluded.sort((a, b) => compare(a.path, b.path) || compare(a.reason, b.reason));
  snapshot.manifest.diagnostics.sort((a, b) => compare(JSON.stringify(a), JSON.stringify(b)));
  return snapshot;
}
function buildSnapshot(root) {
  root = path.resolve(root);
  const before = inventory(root); const ts = tsApi(); const config = configDetails(root, ts);
  const nodes = []; const edges = []; const diagnostics = []; const fileIds = new Map(); const sourceTexts = new Map();
  for (const diagnostic of config.parsed?.errors || []) diagnostics.push({ kind: 'typescript-config', code: diagnostic.code, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'), path: diagnostic.file ? slash(path.relative(root, diagnostic.file.fileName)) : undefined });
  const inventorySet = new Set(before.files.map(f => f.path));
  for (const item of before.files) {
    const rel = item.path; const text = readUtf8(root, rel); sourceTexts.set(rel, text);
    const id = makeId(rel, 'file', 'source'); fileIds.set(rel, id);
    nodes.push(sourceNode(id, 'file', rel, text, 0, text.length, 'inventory', /\.mdx?$/i.test(rel) ? { authority: 'unknown' } : {}));
  }
  const declarationByAst = new Map();
  const compilerSourceFiles = new Set();
  if (config.parsed) {
    const program = ts.createProgram({ rootNames: config.parsed.fileNames, options: config.parsed.options, projectReferences: config.parsed.projectReferences });
    const checker = program.getTypeChecker(); const ordinalCounts = new Map();
    for (const sf of program.getSourceFiles()) {
      if (sf.isDeclarationFile) continue;
      const abs = path.resolve(sf.fileName); const rel = slash(path.relative(root, abs));
      if (!inventorySet.has(rel) || !fileIds.has(rel)) continue;
      compilerSourceFiles.add(rel);
      const text = sourceTexts.get(rel);
      const visit = node => {
        const isDecl = (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isModuleDeclaration(node) || ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node)) && node.name && (ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name));
        if (isDecl) {
          const name = node.name.text; const kind = 'declaration'; const base = `${rel}\0${kind}\0${name}`; const ordinal = (ordinalCounts.get(base) || 0) + 1; ordinalCounts.set(base, ordinal);
          const start = node.getStart(sf); const end = node.getEnd(); const id = makeId(rel, kind, name, ordinal);
          nodes.push(sourceNode(id, kind, rel, text, start, end, 'typescript', { name }));
          declarationByAst.set(node, id);
          edges.push({ from: fileIds.get(rel), to: id, type: 'containment', provenance: 'typescript' });
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    const resolveTarget = (sf, spec) => {
      const resolved = ts.resolveModuleName(spec, sf.fileName, config.parsed.options, ts.sys).resolvedModule;
      if (!resolved) return null;
      const rel = slash(path.relative(root, path.resolve(resolved.resolvedFileName)));
      return fileIds.get(rel) || null;
    };
    const declarationId = decl => {
      if (!decl) return null;
      let cur = decl;
      while (cur && !declarationByAst.has(cur)) cur = cur.parent;
      return cur ? declarationByAst.get(cur) : null;
    };
    const externalReferences = new Map(); const missingReferences = new Set();
    for (const sf of program.getSourceFiles()) {
      if (sf.isDeclarationFile) continue;
      const rel = slash(path.relative(root, path.resolve(sf.fileName))); const fromFile = fileIds.get(rel); if (!fromFile) continue;
      const visit = node => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          const spec = node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier.text : null;
          if (spec) {
            const target = resolveTarget(sf, spec);
            if (target) edges.push({ from: fromFile, to: target, type: ts.isExportDeclaration(node) ? 're-export' : 'import', provenance: 'typescript' });
            else {
              const resolved = ts.resolveModuleName(spec, sf.fileName, config.parsed.options, ts.sys).resolvedModule;
              diagnostics.push({ path: rel, kind: resolved ? 'external-module' : 'unresolved-module', specifier: spec, line: linesAt(sourceTexts.get(rel), node.getStart(sf), node.getEnd()).startLine });
            }
          }
        }
        if (ts.isIdentifier(node) && !ts.isImportClause(node.parent) && !ts.isImportSpecifier(node.parent) && !ts.isExportSpecifier(node.parent) && !ts.isDeclarationName(node)) {
          let symbol = checker.getSymbolAtLocation(node);
          if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) {
            try { symbol = checker.getAliasedSymbol(symbol); } catch { symbol = undefined; }
          }
          const declarations = symbol?.valueDeclaration ? [symbol.valueDeclaration] : symbol?.declarations || [];
          const target = declarations.map(declarationId).find(Boolean);
          if (target) {
            let owner = node.parent; while (owner && !declarationByAst.has(owner)) owner = owner.parent;
            edges.push({ from: owner ? declarationByAst.get(owner) : fromFile, to: target, type: 'reference', provenance: 'typescript' });
          } else if (!symbol) {
            const line = linesAt(sourceTexts.get(rel), node.getStart(sf), node.getEnd()).startLine;
            const key = `${rel}\0${line}\0${node.text}`;
            if (!missingReferences.has(key)) {
              missingReferences.add(key);
              diagnostics.push({ path: rel, kind: 'unresolved-reference', name: node.text, line });
            }
          } else {
            if (!externalReferences.has(rel)) externalReferences.set(rel, new Set());
            externalReferences.get(rel).add(String(symbol.escapedName));
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    for (const [rel, names] of externalReferences) diagnostics.push({ path: rel, kind: 'external-reference-coverage', symbols: names.size });
  } else diagnostics.push({ kind: 'typescript-config-missing', message: 'No tsconfig.json was found; TypeScript declarations and references were not extracted.' });
  extractMarkdown(root, sourceTexts, nodes, edges, diagnostics, fileIds);
  const rev = (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return 'unknown'; } })();
  const fingerprint = hash(JSON.stringify({ files: before.files, excluded: before.excluded, configFingerprint: config.configFingerprint, compilerVersion: ts.version, extractorVersion: EXTRACTOR_VERSION }));
  const fileOnly = before.files.filter(file => /\.(?:[cm]?tsx?|[cm]?jsx?)$/i.test(file.path) && !compilerSourceFiles.has(file.path)).map(file => file.path);
  const structuralStatus = config.parsed && fileOnly.length === 0 && !(config.parsed.errors || []).length ? 'complete' : 'partial';
  const snapshot = { nodes, edges, manifest: { revision: rev, fingerprint, compilerVersion: ts.version, configFingerprint: config.configFingerprint, configFiles: config.configs, extractorVersion: EXTRACTOR_VERSION, files: before.files, excluded: before.excluded, diagnostics }, structural: { status: structuralStatus, compilerFiles: [...compilerSourceFiles].sort(compare), fileOnly }, semantic: { status: 'none', nodes: [], edges: [], diagnostics: [] } };
  sortSnapshot(snapshot); validateSnapshot(snapshot);
  if (fingerprint !== currentFingerprint(root, ts) || rev !== currentRevision(root)) throw new Error('Sources changed during structural extraction; snapshot was not published.');
  return snapshot;
}
function extractMarkdown(root, sourceTexts, nodes, edges, diagnostics, fileIds) {
  const conceptList = [];
  for (const [rel, text] of sourceTexts) {
    if (!/\.mdx?$/i.test(rel)) continue;
    const lines = text.split('\n'); const headings = []; let fenced = false; let fenceChar = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]; const fence = line.match(/^\s*(```+|~~~+)/);
      if (fence) { if (!fenced) { fenced = true; fenceChar = fence[1][0]; } else if (fence[1][0] === fenceChar) fenced = false; continue; }
      if (fenced) continue;
      const m = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (m) headings.push({ line: i, level: m[1].length, title: m[2].trim() });
    }
    const counts = new Map();
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i]; const ordinalKey = `${h.level}:${h.title}`; const ordinal = (counts.get(ordinalKey) || 0) + 1; counts.set(ordinalKey, ordinal);
      let after = lines.length; for (let j = i + 1; j < headings.length; j++) if (headings[j].level <= h.level) { after = headings[j].line; break; }
      const start = lines.slice(0, h.line).join('\n').length + (h.line ? 1 : 0); const end = lines.slice(0, after).join('\n').length + (after ? 1 : 0);
      const id = makeId(rel, 'section', ordinalKey, ordinal);
      nodes.push(sourceNode(id, 'section', rel, text, start, Math.min(end, text.length), 'markdown', { name: h.title, authority: 'unknown' }));
      if (fileIds.has(rel)) edges.push({ from: fileIds.get(rel), to: id, type: 'containment', provenance: 'markdown' });
    }
    for (const link of markdownLinks(text)) {
      let dest = link.destination.trim().replace(/^<|>$/g, '').replace(/\\([\\<>])/g, '$1').split(/[?#]/)[0];
      if (!dest || /^(?:[a-z]+:|\/\/|\/|#)/i.test(dest)) continue;
      try { dest = decodeURIComponent(dest); } catch { /* Keep the raw target for unresolved-link reporting. */ }
      const targetPath = slash(path.posix.normalize(path.posix.join(path.posix.dirname(rel), dest)));
      if (fileIds.has(targetPath)) edges.push({ from: fileIds.get(rel), to: fileIds.get(targetPath), type: 'link', provenance: 'markdown' });
      else diagnostics.push({ path: rel, kind: 'unresolved-link', target: dest, line: linesAt(text, link.index, link.end).startLine });
    }
    if (rel.toLowerCase() === 'glossary.md') {
      for (let i = 0; i < lines.length; i++) {
        const term = lines[i].match(/^\s*\*\*([^*]+)\*\*\s*:/); if (!term) continue;
        const name = term[1].trim(); const ordinalKey = name.toLowerCase(); const ordinal = (counts.get(`concept:${ordinalKey}`) || 0) + 1; counts.set(`concept:${ordinalKey}`, ordinal);
        const start = lines.slice(0, i).join('\n').length + (i ? 1 : 0); const end = start + lines[i].length;
        const id = makeId(rel, 'concept', name, ordinal);
        nodes.push(sourceNode(id, 'concept', rel, text, start, end, 'glossary', { name, authority: 'current' }));
        conceptList.push({ id, name, rel });
        if (fileIds.has(rel)) edges.push({ from: fileIds.get(rel), to: id, type: 'containment', provenance: 'glossary' });
      }
    }
  }
  for (const concept of conceptList) {
    const matcher = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapeRegex(concept.name)})(?=$|[^\\p{L}\\p{N}_])`, 'giu');
    for (const [rel, text] of sourceTexts) {
      if (rel === concept.rel) continue;
      matcher.lastIndex = 0; if (matcher.test(text) && fileIds.has(rel)) edges.push({ from: fileIds.get(rel), to: concept.id, type: 'glossary-mention', provenance: 'glossary' });
    }
  }
  for (const node of nodes) if (node.kind === 'file' && /\.mdx?$/i.test(node.path)) {
    const header = maskFencedBlocks(sourceTexts.get(node.path)).split('\n').slice(0, 20).join('\n');
    const status = header.match(/^\s*Status:\s*(planned|proposed|current|accepted|superseded|historical|unknown)\b/im);
    const accepted = /^\s*Accepted on \d{4}-\d{2}-\d{2}\b/im.test(header);
    if (status || accepted) {
      const value = status ? status[1].toLowerCase() : 'accepted'; const authority = value === 'planned' ? 'proposed' : value === 'accepted' ? 'current' : value;
      node.authority = authority;
      for (const section of nodes) if (section.kind === 'section' && section.path === node.path) section.authority = authority;
    }
  }
}
function markdownLinks(text) {
  const maskedText = maskFencedBlocks(text); const masked = maskedText.split(''); const references = new Map();
  const definitions = /^[ \t]{0,3}\[([^\]]+)\]:[ \t]*(<[^>\r\n]+>|[^ \t\r\n]+)(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/gm;
  let match;
  while ((match = definitions.exec(maskedText))) {
    references.set(match[1].trim().replace(/\s+/g, ' ').toLowerCase(), match[2]);
    blankRange(masked, match.index, match.index + match[0].length);
  }
  const links = [];
  const inline = /!?\[[^\]]*\]\(\s*(<[^>]+>|(?:\\.|[^\s)])+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  const withoutDefinitions = masked.join('');
  while ((match = inline.exec(withoutDefinitions))) {
    links.push({ destination: match[1], index: match.index, end: match.index + match[0].length });
    blankRange(masked, match.index, match.index + match[0].length);
  }
  const referenceLinks = /!?\[([^\]]+)\](?:\s*\[([^\]]*)\])?/g;
  const remaining = masked.join('');
  while ((match = referenceLinks.exec(remaining))) {
    const key = (match[2] || match[1]).trim().replace(/\s+/g, ' ').toLowerCase();
    if (references.has(key)) links.push({ destination: references.get(key), index: match.index, end: match.index + match[0].length });
  }
  return links.sort((a, b) => a.index - b.index || a.end - b.end);
}
function blankRange(chars, start, end) { for (let i = start; i < end; i++) if (chars[i] !== '\n' && chars[i] !== '\r') chars[i] = ' '; }
function maskFencedBlocks(text) {
  const chars = text.split(''); let offset = 0; let fenceChar = null;
  while (offset < text.length) {
    const endAt = text.indexOf('\n', offset); const end = endAt < 0 ? text.length : endAt + 1; const line = text.slice(offset, end);
    const fence = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (!fenceChar) fenceChar = fence[1][0];
      else if (fence[1][0] === fenceChar) fenceChar = null;
      blankRange(chars, offset, end);
    } else if (fenceChar) blankRange(chars, offset, end);
    offset = end;
  }
  return chars.join('');
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function currentFingerprint(root, ts = tsApi()) {
  const inv = inventory(root); const config = configDetails(root, ts);
  return hash(JSON.stringify({ files: inv.files, excluded: inv.excluded, configFingerprint: config.configFingerprint, compilerVersion: ts.version, extractorVersion: EXTRACTOR_VERSION }));
}
function currentRevision(root) { try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return 'unknown'; } }
function validateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges) || !snapshot.manifest || !snapshot.semantic || !snapshot.structural) throw new Error('Invalid snapshot structure.');
  const manifest = snapshot.manifest;
  if (!Array.isArray(manifest.files) || !Array.isArray(manifest.configFiles) || !Array.isArray(manifest.excluded) || !Array.isArray(manifest.diagnostics) || typeof manifest.fingerprint !== 'string' || typeof manifest.configFingerprint !== 'string' || typeof manifest.compilerVersion !== 'string' || typeof manifest.extractorVersion !== 'string') throw new Error('Invalid snapshot manifest.');
  const sourcePaths = new Set(manifest.files.map(file => file.path));
  const manifestHash = hash(JSON.stringify({files: manifest.files, excluded: manifest.excluded,
    configFingerprint: manifest.configFingerprint, compilerVersion: manifest.compilerVersion, extractorVersion: manifest.extractorVersion}));
  if (manifestHash !== manifest.fingerprint) throw new Error('Snapshot manifest fingerprint is inconsistent.');
  const ids = new Set();
  for (const node of snapshot.nodes) {
    if (!node || typeof node.id !== 'string' || ids.has(node.id)) throw new Error('Snapshot contains a missing or duplicate node ID.');
    if (!['file', 'declaration', 'section', 'concept'].includes(node.kind)) throw new Error(`Invalid node kind: ${node.kind}`);
    if (typeof node.path !== 'string' || !sourcePaths.has(node.path) || !Number.isInteger(node.startLine) || !Number.isInteger(node.endLine) || node.startLine < 1 || node.endLine < node.startLine || typeof node.text !== 'string' || typeof node.contentHash !== 'string' || hash(node.text) !== node.contentHash) throw new Error(`Invalid source location or content hash for ${node.id}`);
    if (!Number.isInteger(node.startOffset) || !Number.isInteger(node.endOffset) || node.startOffset < 0 ||
      node.endOffset - node.startOffset !== node.text.length) throw new Error(`Invalid source offsets for ${node.id}`);
    ids.add(node.id);
  }
  for (const edge of snapshot.edges) if (!ids.has(edge.from) || !ids.has(edge.to) || typeof edge.type !== 'string' || typeof edge.provenance !== 'string') throw new Error(`Invalid edge endpoint or fields: ${edge.from} -> ${edge.to}`);
  validateSemantic(snapshot, ids);
  if (!['complete', 'partial'].includes(snapshot.structural.status) || !Array.isArray(snapshot.structural.compilerFiles) || !Array.isArray(snapshot.structural.fileOnly)) throw new Error('Invalid structural completeness section.');
  return true;
}
function validateSemantic(snapshot, sourceIds) {
  const semantic = snapshot.semantic;
  if (!['none', 'partial', 'complete'].includes(semantic.status) || !Array.isArray(semantic.nodes) || !Array.isArray(semantic.edges)) throw new Error('Invalid semantic completeness section.');
  if (semantic.status === 'none' && (semantic.nodes.length || semantic.edges.length)) throw new Error('Unenriched snapshot contains semantic data.');
  if (semantic.status === 'complete' && semantic.pending?.length) throw new Error('Complete enrichment still has pending work.');
  const sources = new Map(snapshot.nodes.map(n => [n.id, n]));
  const allIds = new Set(sourceIds);
  const provenanceValid = p => p && p.inferred === true && ['model', 'promptVersion', 'promptHash', 'schemaHash'].every(k => typeof p[k] === 'string' && p[k].length);
  for (const node of semantic.nodes) {
    if (!node || allIds.has(node.id) || node.id !== `concept:${node.name}` || node.kind !== 'concept' ||
      !/^[a-z][a-z0-9-]{2,79}$/.test(node.name) || !['mathematical', 'responsibility'].includes(node.conceptKind) ||
      !Array.isArray(node.aliases) || node.aliases.some(a => typeof a !== 'string') || !provenanceValid(node.provenance)) throw new Error('Invalid inferred concept.');
    allIds.add(node.id);
  }
  for (const edge of semantic.edges) {
    if (!allIds.has(edge.from) || !allIds.has(edge.to) || edge.inferred !== true ||
      !['membership', 'supports', 'shares-responsibility', 'contrasts'].includes(edge.type) ||
      typeof edge.rationale !== 'string' || !edge.rationale.trim() || !provenanceValid(edge.provenance) ||
      !Array.isArray(edge.evidence) || !edge.evidence.length) throw new Error('Invalid inferred edge.');
    const supported = new Set();
    for (const e of edge.evidence) {
      const source = sources.get(e.sourceId);
      if (!source || typeof e.quote !== 'string' || e.quote.trim().length < 12 ||
        !Number.isInteger(e.startLine) || !Number.isInteger(e.endLine) || e.startLine < source.startLine ||
        e.endLine > source.endLine || e.endLine < e.startLine ||
        !source.text.split('\n').slice(e.startLine - source.startLine, e.endLine - source.startLine + 1).join('\n').includes(e.quote)) throw new Error('Invalid inferred evidence.');
      supported.add(e.sourceId);
    }
    if (edge.type === 'membership') {
      if (!sourceIds.has(edge.from) || sourceIds.has(edge.to) || !supported.has(edge.from)) throw new Error('Invalid concept membership evidence.');
    } else if (!supported.has(edge.from) || !supported.has(edge.to)) throw new Error('Both inferred endpoints require evidence.');
  }
}
function assertFresh(root, snapshot) {
  validateSnapshot(snapshot);
  const now = currentFingerprint(path.resolve(root));
  if (now !== snapshot.manifest.fingerprint || currentRevision(path.resolve(root)) !== snapshot.manifest.revision) throw new Error('Snapshot is stale for the current source inventory.');
  const sourceTexts = new Map();
  for (const node of snapshot.nodes) {
    if (!sourceTexts.has(node.path)) sourceTexts.set(node.path, readUtf8(root, node.path));
    const source = sourceTexts.get(node.path);
    const range = linesAt(source, node.startOffset, node.endOffset);
    if (source.slice(node.startOffset, node.endOffset) !== node.text || range.startLine !== node.startLine || range.endLine !== node.endLine) throw new Error(`Snapshot passage is not current source: ${node.path}:${node.startLine}`);
  }
  return true;
}
function writeSnapshot(root, snapshot) {
  root = path.resolve(root); validateSnapshot(snapshot); assertFresh(root, snapshot);
  const dir = path.join(root, STATE_DIR); fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, 'snapshot.json'); const temp = path.join(dir, `.snapshot-${process.pid}.tmp`);
  fs.writeFileSync(temp, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  try { assertFresh(root, snapshot); fs.renameSync(temp, target); } catch (error) { try { fs.unlinkSync(temp); } catch { /* Preserve the publication failure if cleanup also fails. */ } throw error; }
  return target;
}
function readSnapshot(root) { const data = JSON.parse(fs.readFileSync(path.join(root, STATE_DIR, 'snapshot.json'), 'utf8')); validateSnapshot(data); return data; }

module.exports = { buildSnapshot, inventory, validateSnapshot, writeSnapshot, readSnapshot, assertFresh, hash, STATE_DIR };
