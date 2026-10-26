import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sourceUrl = new URL('./three-prototype.js', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function functionSource(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists in actual prototype source`);
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  assert.fail(`${name} declaration is complete`);
}

class Target {
  listeners = new Map();
  addEventListener(type, fn, options) {
    let list = this.listeners.get(type);
    if (!list) this.listeners.set(type, list = new Set());
    list.add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatch(type, extra = {}) {
    for (const fn of this.listeners.get(type) || []) fn({ type, currentTarget: this, target: this, preventDefault() {}, ...extra });
  }
  count() { return [...this.listeners.values()].reduce((n, set) => n + set.size, 0); }
}

class Element extends Target {
  constructor(id = '') { super(); this.id = id; this.children = []; this.dataset = {}; this.style = {}; this.hidden = false; this.value = ''; this.checked = true; this.clientWidth = 600; this.clientHeight = 450; this.classList = { toggle() {} }; }
  append(node) { this.children.push(node); }
  prepend(node) { this.children.unshift(node); }
  remove() { this.removed = true; }
  replaceChildren(...nodes) { this.children = nodes; }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
  focus() {}
  setPointerCapture() {}
  releasePointerCapture() {}
  getContext() { return { scale() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, arc() {}, fill() {}, fillText() {} }; }
}

function fakeThree(counters) {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { return this.set(v.x, v.y, v.z); }
    toArray() { return [this.x, this.y, this.z]; }
    project() { return this; }
  }
  class Group {
    constructor() { this.children = []; this.position = new Vector3(); this.userData = {}; }
    add(o) { this.children.push(o); }
    remove(o) { this.children = this.children.filter(x => x !== o); }
    traverse(fn) { fn(this); for (const c of [...this.children]) c.traverse ? c.traverse(fn) : fn(c); }
  }
  class Scene extends Group {}
  class Geometry {
    constructor() { this.attributes = {}; }
    setAttribute(name, value) { this.attributes[name] = value; return this; }
    setFromPoints(points) { this.attributes.position = { count: points.length, points }; return this; }
    computeVertexNormals() {}
    dispose() {}
  }
  class Material { constructor(options = {}) { this.color = { getHexString: () => '526950' }; this.options = options; } dispose() {} }
  class Mesh extends Group { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
  class PerspectiveCamera extends Group { constructor() { super(); this.up = new Vector3(); } lookAt() {} updateProjectionMatrix() {} }
  class Raycaster { setFromCamera() {} intersectObjects() { return []; } }
  class WebGLRenderer {
    constructor() { counters.renderers++; this.domElement = new Element('webgl'); this.info = { render: { calls: 0 } }; }
    setPixelRatio() {} setClearColor() {} setSize() {} render() {} dispose() { counters.rendererDisposals++; }
  }
  class Attribute { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.count = array.length / itemSize; } }
  class Light extends Group {}
  return {
    WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight: Light, DirectionalLight: Light, Group, Vector3, Vector2: Vector3, Raycaster,
    BufferGeometry: Geometry, Float32BufferAttribute: Attribute, Mesh, Line: Mesh,
    MeshStandardMaterial: Material, MeshBasicMaterial: Material, LineBasicMaterial: Material, SphereGeometry: Geometry,
    DoubleSide: 2,
  };
}

async function run(candidate, { baseline = false, schedule = 'fetch' } = {}) {
  const elements = new Map();
  for (const id of ['status', 'main-board', 'labels', 'domain-board', 'readout', 'uv-label', 'kind', 'iso', 'tiling', 'show-iso', 'show-net', 'z-mode', 'reset', 'presentation', 'remount', 'export-svg', 'export-png', 'stress', 'clear-stress']) elements.set(id, new Element(id));
  elements.get('kind').value = 'tensor'; elements.get('iso').value = '8'; elements.get('tiling').value = '8';
  const viewButtons = ['front', 'top', 'side', 'isometric'].map(view => { const e = new Element(`view-${view}`); e.dataset.view = view; return e; });
  const document = { body: new Element('body'), getElementById: id => elements.get(id) || null, createElement: tag => new Element(tag), querySelectorAll: () => viewButtons };
  const window = new Target();
  const counters = { renderers: 0, rendererDisposals: 0, rafRequested: 0, rafCancelled: 0, activeRaf: new Map(), resizeCreated: 0, resizeDisconnected: 0 };
  const imports = [], fetches = [];
  let jsonCalls = 0;
  const context = {
    document, window, console, URL, Math, Map, Set, Array, Number, JSON, Error, Blob: class {}, Event: class {},
    devicePixelRatio: 1,
    requestAnimationFrame(fn) { const id = ++counters.rafRequested; counters.activeRaf.set(id, fn); return id; },
    cancelAnimationFrame(id) { counters.rafCancelled++; counters.activeRaf.delete(id); },
    ResizeObserver: class { constructor(fn) { this.fn = fn; counters.resizeCreated++; } observe() {} disconnect() { counters.resizeDisconnected++; } },
    fetch() { const d = deferred(); fetches.push(d); return d.promise; },
  };
  context.globalThis = context;
  context.__loadThree = () => { const d = deferred(); imports.push(d); return d.promise; };
  let executable = candidate
    .replaceAll('import.meta.url', "'http://localhost/docs/prototypes/bezier-patches/three-prototype.js'")
    .replace("const importThree=()=>import(new URL('three.module.js',VENDOR));", 'const importThree=()=>globalThis.__loadThree();')
    .replace("await import(new URL('three.module.js',VENDOR))", 'await importThree()');
  if (!executable.includes('const importThree=')) executable = executable.replace(/(const VENDOR = [^\n]+;)/, "$1\n  const importThree=()=>globalThis.__loadThree();");
  vm.runInNewContext(executable, context, { filename: 'three-prototype.js' });
  const api = window.BezierPatchSpike;
  const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
  await flush();
  assert.equal(imports.length, 1, 'initial setup starts a three.js import');
  assert.equal(api.ready(), false, 'view is not ready while three.js import is pending');
  let remountPromise;
  const validFixture = { current: true, patches: Array(512).fill(0), vertices: Array(870).fill(0) };
  const finishFixture = async index => { fetches[index].resolve({ ok: true, json: async () => validFixture }); await flush(); };
  const sideEffects = () => ({ raf: counters.activeRaf.size, boardListeners: elements.get('main-board').count() });
  if (schedule === 'import') {
    remountPromise = api.remount();
    await flush();
    assert.equal(imports.length, 2, 'remount starts a second module import');
    imports[0].resolve(fakeThree(counters));
    await flush();
    assert.equal(counters.renderers, 0, 'superseded module import allocates no renderer');
    assert.equal(fetches.length, 0, 'superseded module import starts no fixture fetch');
    imports[1].resolve(fakeThree(counters));
    await flush();
    assert.equal(fetches.length, 1, 'current module import starts the fixture fetch');
    await finishFixture(0);
    await remountPromise;
  } else {
    imports[0].resolve(fakeThree(counters));
    await flush();
    assert.equal(fetches.length, 1, 'initial setup waits for the teapot fixture');
    if (!baseline) assert.equal(api.ready(), false, 'view is not ready while the fixture is pending');
    if (schedule === 'json') {
      const oldJson = deferred();
      fetches[0].resolve({ ok: true, json: () => { jsonCalls++; return oldJson.promise; } });
      await flush();
      remountPromise = api.remount();
      await flush();
      imports[1].resolve(fakeThree(counters));
      await flush();
      assert.equal(fetches.length, 2, 'remount waits for its own fixture response');
      const before = sideEffects();
      oldJson.resolve({ stale: true });
      await flush();
      assert.deepEqual(sideEffects(), before, 'superseded JSON completion installs no listeners or RAF');
      await finishFixture(1);
      await remountPromise;
    } else {
      remountPromise = api.remount();
      await flush();
      assert.equal(imports.length, 2, 'remount starts a new three.js import');
      imports[1].resolve(fakeThree(counters));
      await flush();
      assert.equal(fetches.length, 2, 'remount waits for its own fixture response');
      if (!baseline) {
        elements.get('kind').value = 'teapot';
        elements.get('kind').dispatch('change');
      }
      const before = sideEffects();
      fetches[0].resolve({ ok: true, json: async () => { jsonCalls++; return { stale: true }; } });
      await flush();
      assert.equal(jsonCalls, 0, 'superseded fetch is rejected before parsing its fixture');
      assert.deepEqual(sideEffects(), before, 'superseded fetch completion installs no listeners or RAF');
      if (!baseline) assert.equal(api.ready(), false, 'superseded fixture completion cannot make the view ready');
      await finishFixture(1);
      await remountPromise;
    }
  }
  await flush();
  assert.equal(api.ready(), true, 'current setup becomes ready after all async work and setup');
  if (!baseline && schedule === 'fetch') {
    assert.equal(api.snapshot().kind, 'teapot', 'kind changes made during fixture loading are retained');
    assert.equal(elements.get('labels').children.some(label => label.textContent === 'P(u,v)'), false, 'teapot setup does not create a single-patch parameter label');
  }
  assert.equal(counters.activeRaf.size, 1, 'current mount owns exactly one render loop');
  assert.equal(counters.renderers, schedule === 'import' ? 1 : 2, 'only non-superseded imports allocate renderers');
  const targets = [...elements.values(), ...viewButtons, document.body, window];
  const profile = () => Object.fromEntries(targets.map(e => [e.id || 'window', e.count()]));
  const initialProfile = profile();
  for (const id of ['kind', 'iso', 'tiling', 'show-iso', 'show-net', 'z-mode', 'reset', 'presentation', 'remount', 'export-svg', 'export-png', 'stress', 'clear-stress']) assert.equal(initialProfile[id], 1, `${id} toolbar handler is attached exactly once`);
  for (const button of viewButtons) assert.equal(initialProfile[button.id], 1, `${button.id} view handler is attached exactly once`);
  const repeatedRemount = api.remount();
  await flush();
  imports.at(-1).resolve(fakeThree(counters));
  await flush();
  fetches.at(-1).resolve({ ok: true, json: async () => validFixture });
  await repeatedRemount;
  await flush();
  assert.deepEqual(profile(), initialProfile, 'listener counts per control remain constant across repeated remounts');
  const controlCount = targets.reduce((n, e) => n + e.count(), 0);
  viewButtons[0].dispatch('click');
  assert.equal(api.snapshot().camera.az, 0, 'toolbar view control remains usable after remount');
  elements.get('main-board').dispatch('pointerdown', { clientX: 250, clientY: 200, pointerId: 1 });
  elements.get('main-board').dispatch('pointermove', { clientX: 270, clientY: 210, pointerId: 1 });
  elements.get('main-board').dispatch('pointerup', { clientX: 270, clientY: 210, pointerId: 1 });
  assert.notEqual(api.snapshot().camera.az, 0, 'rayFor handles Three.js setFromCamera returning void and pointer orbit works');

  assert.equal(api.dispose(), true);
  assert.equal(api.dispose(), true, 'repeated final disposal is safe');
  const remaining = [...elements.values(), ...viewButtons, document.body, window].reduce((n, e) => n + e.count(), 0);
  assert.equal(remaining, 0, 'final disposal removes both mount and toolbar listeners');
  assert.equal(counters.activeRaf.size, 0, 'final disposal cancels the render loop');
  assert.equal(api.ready(), false, 'disposed view is not ready');
  return { renderers: counters.renderers, disposedRenderers: counters.rendererDisposals, rafRequested: counters.rafRequested, rafCancelled: counters.rafCancelled, controlCount, remainingListeners: remaining };
}

const result = await run(source);
console.log(`Three.js lifecycle assertions passed: ${JSON.stringify(result)}`);

// The baseline had already reported ready after renderer allocation. Compare
// concrete listener/RAF side effects across completion of each stale await.
const baseline = execFileSync('git', ['show', 'be078cd:docs/prototypes/bezier-patches/three-prototype.js'], { encoding: 'utf8' });
for (const schedule of ['import', 'fetch', 'json']) {
  await assert.rejects(run(baseline, { baseline: true, schedule }), /superseded module import allocates|superseded fetch|superseded JSON completion/);
  console.log(`Pre-fix ${schedule} supersession mutation reproduced against be078cd.`);
}

const importMutant = source.replace('const T=await importThree();if(!isCurrent(generation))return snapshot();', 'const T=await importThree();');
const fetchMutant = source.replace("const response=await fetch(new URL('teapot-data.json',VENDOR));if(!isCurrent(generation))return snapshot();", "const response=await fetch(new URL('teapot-data.json',VENDOR));");
const jsonMutant = source.replace('const teapot=await response.json();if(!isCurrent(generation))return snapshot();', 'const teapot=await response.json();');
assert.notEqual(importMutant, source, 'module-import guard mutation was applied');
assert.notEqual(fetchMutant, source, 'fixture-fetch guard mutation was applied');
assert.notEqual(jsonMutant, source, 'fixture-JSON guard mutation was applied');
await assert.rejects(run(importMutant, { schedule: 'import' }), /superseded module import allocates/);
await assert.rejects(run(fetchMutant, { schedule: 'fetch' }), /superseded fetch is rejected before parsing/);
await assert.rejects(run(jsonMutant, { schedule: 'json' }), /superseded JSON completion installs no listeners or RAF/);
console.log('Removing each async generation guard makes its matching schedule fail.');

const rayOwned = { THREE: fakeThree({}) }, board = new Element('main-board');
const ray = new Function('owned', '$', `${functionSource(source, 'rayFor')}; return rayFor;`)(rayOwned, () => board);
assert.doesNotThrow(() => ray({ clientX: 20, clientY: 30 }).intersectObjects([]), 'actual rayFor returns a raycaster after setFromCamera');
const oldRay = new Function('owned', '$', `${functionSource(baseline, 'rayFor')}; return rayFor;`)(rayOwned, () => board);
assert.throws(() => oldRay({ clientX: 20, clientY: 30 }).intersectObjects([]), /intersectObjects|undefined|Cannot read/);
console.log('Pre-fix rayFor failure reproduced with setFromCamera returning void.');
