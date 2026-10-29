// Paired same-seed comparison of the island rule: island-old (four predators at start, before 2026-10-28)
// against island (two predators at start, the page's rule). Both run the real page code, unpatched, on the same seeds.
// The first two predators are drawn from the same rng stream in both, so the tick-0 worlds match.
// Reports die-outs for each rule and the seeds that switch outcome between them.
// Usage: node checks/island-samespawn-paired.js [N]   (run from the tiny-biome-lab folder)
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const base = html.split('<script>')[1].split('</script>')[0];

function stubEl() {
  return { value: '', textContent: '', width: 800, height: 200, style: {}, max: 0,
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } }),
    addEventListener() {} };
}
const els = {};
global.document = { getElementById: (id) => (els[id] = els[id] || stubEl()), querySelectorAll: () => [] };
global.location = { hash: '' };
global.window = { addEventListener() {} };
global.requestAnimationFrame = () => {};

const N = +(process.argv[2] || 1200);
const run = new Function(base + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; } };');

// die-out tick for one seed under one scenario (null if the island survives 400 ticks)
function dieTick(seed, scenario) {
  const s = run();
  s.newWorld('f' + seed, scenario);
  for (let t = 1; t <= 400; t++) {
    s.step();
    if (!s.grazers.length) return t;
  }
  return null;
}

let oldDied = 0, newDied = 0, oldOnly = 0, newOnly = 0, bothDied = 0;
for (let i = 1; i <= N; i++) {
  const o = dieTick(i, 'island-old') !== null;
  const n = dieTick(i, 'island') !== null;
  if (o) oldDied++;
  if (n) newDied++;
  if (o && n) bothDied++;
  if (o && !n) oldOnly++;
  if (!o && n) newOnly++;
}
console.log(`seeds ${N}`);
console.log(`island-old (4 predators at start): died out ${oldDied} (${(100 * oldDied / N).toFixed(1)}%)`);
console.log(`island (2 predators at start):     died out ${newDied} (${(100 * newDied / N).toFixed(1)}%)`);
console.log(`both died ${bothDied} | only old died ${oldOnly} | only new died ${newOnly}`);
