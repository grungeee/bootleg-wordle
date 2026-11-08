const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('portfolio and game do not promote unrelated repositories', () => {
  for (const file of ['index.html', 'play/index.html']) {
    assert.doesNotMatch(read(file), /href=["'][^"']*github\.com/i);
    assert.doesNotMatch(read(file), /oasis|nxnative|orderlist/i);
  }
});

test('portfolio preserves original authorship and distinguishes later AI polish', () => {
  assert.match(read('index.html'), /first project I programmed entirely myself/);
  assert.match(read('index.html'), /original code and visual design were my own/);
  assert.match(read('index.html'), /AI-assisted development/);
  assert.match(read('index.html'), /inspired by\s+Wordle/);
});

test('every local HTML link and asset has a real target and fragment', () => {
  for (const page of ['index.html', 'play/index.html', '404.html']) {
    const html = read(page);
    for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const href = match[1];
      if (/^(?:https?:|mailto:|data:)/.test(href)) continue;
      const url = new URL(href, 'https://www.sharapa.io/' + (page === 'index.html' ? '' : page));
      let file = decodeURIComponent(url.pathname).replace(/^\//, '');
      if (!file || file.endsWith('/')) file += 'index.html';
      assert.ok(fs.existsSync(path.join(root, file)), page + ': missing ' + href);
      if (url.hash) {
        const target = read(file);
        assert.ok(target.includes('id="' + url.hash.slice(1) + '"'), page + ': missing fragment ' + href);
      }
    }
  }
});

test('daily result sharing links straight to the playable game', () => {
  assert.match(read('js/game.js'), /location\.origin\s*\+\s*['"]\/play\/['"]/);
  assert.match(read('play/index.html'), /KEEP EXPLORING/);
});

function orbitFixture({ width = 375, reduced = false } = {}) {
  const eventTarget = extra => Object.assign({ handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; } }, extra);
  const folders = Array.from({ length: 4 }, () => eventTarget({ offsetWidth: width < 700 ? 163 : 218, style: {}, dataset: {} }));
  const scene = eventTarget({ clientWidth: width, clientHeight: 420, classList: { add() {}, remove() {} }, contains: x => folders.includes(x), hasPointerCapture: () => false, setPointerCapture() {}, releasePointerCapture() {} });
  const prev = eventTarget({});
  const next = eventTarget({});
  const toggle = eventTarget({ setAttribute(k, v) { this[k] = v; } });
  const media = eventTarget({ matches: reduced });
  const nodes = { 'orbit-scene': scene, 'orbit-toolbar': {}, 'orbit-toggle': toggle, 'orbit-prev': prev, 'orbit-next': next };
  const document = eventTarget({ hidden: false, getElementById: id => nodes[id], querySelectorAll: () => folders });
  const frames = [];
  vm.runInNewContext(read('js/orbit.js'), { document, window: { matchMedia: () => media }, requestAnimationFrame: fn => { frames.push(fn); return frames.length; }, ResizeObserver: class { observe() {} }, setTimeout });
  return { scene, folders, toggle, next, prev, media, frames };
}

test('a full orbit restores positions and carries every folder behind and in front', () => {
  const { folders, next } = orbitFixture();
  const start = folders.map(f => f.style.transform);
  const visited = folders.map(() => new Set());
  for (let i = 0; i < 8; i++) {
    folders.forEach((f, n) => visited[n].add(f.dataset.depth));
    next.handlers.click();
  }
  assert.deepEqual(folders.map(f => f.style.transform), start);
  visited.forEach(depths => assert.equal(depths.size, 2));
});

test('keyboard focus always brings the selected folder in front of the avatar', () => {
  const { folders, scene } = orbitFixture();
  for (const folder of folders) {
    scene.handlers.focusin({ target: { closest: () => folder } });
    assert.equal(folder.dataset.depth, 'front');
    assert.equal(folder.style.zIndex, '10');
  }
});

test('reduced motion never schedules automatic rotation; manual arrows still work', () => {
  const { folders, toggle, next, frames } = orbitFixture({ reduced: true });
  assert.equal(frames.length, 0);
  assert.equal(toggle.disabled, true);
  assert.equal(toggle.textContent, 'Motion reduced');
  const before = folders[0].style.transform;
  next.handlers.click();
  assert.notEqual(folders[0].style.transform, before);
});

test('horizontal drag changes the orbit and suppresses accidental link activation', () => {
  const { folders, scene } = orbitFixture();
  const before = folders[0].style.transform;
  scene.handlers.pointerdown({ isPrimary: true, button: 0, pointerId: 1, clientX: 20, clientY: 100 });
  scene.handlers.pointermove({ pointerId: 1, clientX: 180, clientY: 102 });
  scene.handlers.pointerup({ pointerId: 1 });
  assert.notEqual(folders[0].style.transform, before);
  let prevented = false;
  scene.handlers.click({ preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
  assert.equal(prevented, true);
});

test('vertical mobile scroll does not rotate folders', () => {
  const { folders, scene } = orbitFixture();
  const before = folders[0].style.transform;
  scene.handlers.pointerdown({ isPrimary: true, button: 0, pointerId: 1, clientX: 20, clientY: 100 });
  scene.handlers.pointermove({ pointerId: 1, clientX: 22, clientY: 150 });
  scene.handlers.pointerup({ pointerId: 1 });
  assert.equal(folders[0].style.transform, before);
});
