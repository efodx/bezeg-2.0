// Resolves what `just graph-check <id>` runs for one graph, from the inventory, the parity SAMPLES and the partition.
// Pure functions over text and JSON so scripts/graph-check-resolve.test.cjs can test them without the repository.
const path = require('path');

/** The inventory entry's graph file (`src/graphs/.../X.tsx`) or undefined. */
function graphFileOf(inventory, id) {
    return (inventory.demonstrations || []).find(d => d.id === id)?.graphFile;
}

/** Declaration test: the graph file's own basename plus `.declaration.test.tsx`, in its directory; never a prefix match. */
function declarationTestOf(graphFile) {
    if (!graphFile) return undefined;
    const p = graphFile.replace(/\\/g, '/');
    return `${path.posix.dirname(p)}/${path.posix.basename(p).replace(/\.tsx?$/, '')}.declaration.test.tsx`;
}

/** Names of the parity recordings whose SAMPLES `demonstration` is exactly the id (a collision pair never shares one). */
function parityRecordingsOf(paritySource, id) {
    const names = [];
    for (const m of paritySource.matchAll(/\{file:\s*'[^']*?([^/']+)\.json',\s*demonstration:\s*'([^']+)'/g)) if (m[2] === id) names.push(m[1]);
    return names;
}

/** Test-name filter for those recordings: `parity recording (a|b) ` (the trailing space ends the name). */
function parityFilter(names) {
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `parity recording (${names.map(esc).join('|')}) `;
}

/** The lane's shared tests as repository paths; none for ids in no lane (declared or done). */
function sharedTestsOf(partition, id) {
    const lane = (partition.lanes || []).find(l => (l.demonstrations || []).includes(id));
    return (lane?.sharedTests || []).map(t => `src/${t}`);
}

module.exports = {graphFileOf, declarationTestOf, parityRecordingsOf, parityFilter, sharedTestsOf};
