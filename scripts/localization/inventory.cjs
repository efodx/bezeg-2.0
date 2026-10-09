const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const items = new Map();
function scan(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!['bezeg', 'localization'].includes(entry.name)) scan(file); continue; }
    if (!/\.(tsx?|js)$/.test(file) || /test|setupTests|reportWeb/.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
        const value = ts.isJsxText(node) ? node.text.trim().replace(/\s+/g, ' ') : ts.isTemplateExpression(node) ? node.getText(tree) : node.text;
        if (/[A-Za-zČŠŽčšž]/.test(value) && (ts.isJsxText(node) || /[ČŠŽčšž]|[a-zA-Z] [a-zA-Z]/.test(value))) {
          if (!items.has(value)) items.set(value, []);
          items.get(value).push(file + ':' + (tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1));
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
}
scan('src');
console.log([...items.keys()].map((x,i) => `${i}: ${x}`).join('\n'));
