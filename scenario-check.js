// Headless scenario check: runs each scenario on 3 seeds and checks the water and flood rules.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];
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
const exposeSrc = [
  'return {',
  '  newWorld, step,',
  '  get W() { return W; }, get H() { return H; },',
  '  get land() { return land; }, get grass() { return grass; },',
  '  get grazers() { return grazers; }, get predators() { return predators; },',
  '  get history() { return history; }, get floods() { return floods; },',
  '  get tick() { return tick; }, get lastFlood() { return lastFlood; }',
  '};'
].join('\n');
const run = new Function(js + '\n' + exposeSrc);

let ok = true;
for (const scen of ['normal', 'drought', 'island', 'flood']) {
  for (const seed of ['42', 'bio-seed-7', '1234']) {
    const s = run();
    s.newWorld(seed, scen);
    const marks = {};
    let wet = 0; // creatures found on water
    for (let t = 1; t <= 400; t++) {
      s.step();
      for (const c of [...s.grazers, ...s.predators]) if (!s.land[c.y * s.W + c.x]) wet++;
      for (let i = 0; i < s.land.length; i++) if (!s.land[i] && s.grass[i] > 0) wet++;
      if ([100, 200, 400].includes(t)) marks[t] = s.grazers.length;
    }
    const peak = Math.max(...s.history.map(p => p.n));
    if (wet) ok = false;
    console.log(scen.padEnd(8), 'seed', seed.padEnd(11), JSON.stringify(marks), 'pred', s.predators.length,
      'peak', peak, 'floods', s.floods, 'on-water', wet);
  }
}
// Flood check: right after a flood tick, the flooded band has no grass.
const f = run();
f.newWorld('42', 'flood');
while (f.tick < 90) f.step();
const [r0, r1] = f.lastFlood.rows;
let grassInBand = 0;
for (let y = r0; y <= r1; y++) for (let x = 0; x < f.W; x++) grassInBand += f.grass[y * f.W + x];
console.log('flood band rows', r0, r1, 'grass left in band', grassInBand.toFixed(3));
if (grassInBand > 0) ok = false;
console.log(ok ? 'scenario check OK' : 'scenario check FAILED');
