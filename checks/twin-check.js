// Twin-run check: two fresh runs of the same seed must match tick by tick.
// Usage: node checks/twin-check.js index.html [seed] [ticks] [scenario]
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(process.argv[2], 'utf8');
const seed = process.argv[3] || 'bio-seed-7';
const ticks = +(process.argv[4] || 300);
const scen = process.argv[5] || 'normal';
if (!(ticks > 0)) { console.log(`bad tick count "${process.argv[4]}": usage is seed ticks scenario`); process.exit(2); } // a NaN count would run zero loops and pass
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
  '  newWorld, step, save: saveState,',
  '  get tick() { return tick; },',
  '  get grazers() { return grazers.map(g => [g.x, g.y, +g.energy.toFixed(9), g.speed, g.sense, +g.metabolism.toFixed(9)].join("~")).join(";"); },',
  '  get preds() { return predators.map(p => [p.x, p.y, +p.energy.toFixed(9), p.speed, p.sense].join("~")).join(";"); },',
  '  get grass() { let s = 0; for (let i = 0; i < grass.length; i++) s = (s * 31 + Math.round(grass[i] * 1000)) % 1000000007; return s; },',
  '  get counts() { return [births, deaths, eaten, pDeaths].join("~"); },',
  '  get rng() { return rng.state(); }',
  '};'
].join('\n');
const make = () => new Function(js + '\n' + exposeSrc)();
const a = make(); const b = make();
// NEG=1 gives run B a different seed on purpose: the check must then report a divergence (negative control).
a.newWorld(seed, scen); b.newWorld(process.env.NEG ? seed + '!' : seed, scen);
const snap = (s) => JSON.stringify([s.tick, s.counts, s.grass, s.grazers, s.preds, s.rng]);
// Full state too: every field saveState copies (land, floods, history, exact grass), not just the summary above.
const full = (s) => JSON.stringify(s.save());
for (let t = 1; t <= ticks; t++) {
  a.step(); b.step();
  if (snap(a) !== snap(b) || full(a) !== full(b)) {
    console.log(`DIVERGED at tick ${t} (seed ${seed}, ${scen})`);
    console.log('run A:', snap(a).slice(0, 200));
    console.log('run B:', snap(b).slice(0, 200));
    process.exit(1);
  }
}
console.log(`identical for ${ticks} ticks (seed ${seed}, ${scen})`);
