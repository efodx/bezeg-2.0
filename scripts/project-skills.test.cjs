const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

// Codex discovers project skills in .agents/skills; Claude Code only in .claude/skills.
// Each skill is maintained once, with a Claude Code pointer that repeats its frontmatter.
const root = path.resolve(__dirname, '..');
const maintainedDir = path.join(root, '.agents', 'skills');
const pointerDir = path.join(root, '.claude', 'skills');

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, `${path.relative(root, file)} has no frontmatter`);
  return { block: match[1], body: text.slice(match[0].length) };
}

function skillNames(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
}

test('every maintained project skill has a Claude Code pointer and vice versa', () => {
  assert.deepEqual(skillNames(pointerDir), skillNames(maintainedDir));
});

for (const name of skillNames(maintainedDir)) {
  test(`${name}: pointer frontmatter matches the maintained skill and links to it`, () => {
    const maintained = frontmatter(path.join(maintainedDir, name, 'SKILL.md'));
    const pointer = frontmatter(path.join(pointerDir, name, 'SKILL.md'));
    assert.match(maintained.block, new RegExp(`^name: ${name}$`, 'm'));
    assert.equal(pointer.block, maintained.block);
    assert.ok(pointer.body.includes(`(../../../.agents/skills/${name}/SKILL.md)`), 'pointer must link to the maintained SKILL.md');
  });
}
