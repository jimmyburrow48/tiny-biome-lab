const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
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
  '  newWorld, step, rewindTo,',
  '  get maxTick() { return maxTick; },',
  '  get tick() { return tick; },',
  '  get grazers() { return grazers.map(g => [g.x, g.y, +g.energy.toFixed(6)].join("~")).join(";"); },',
  '  get preds() { return predators.map(p => [p.x, p.y, +p.energy.toFixed(6)].join("~")).join(";"); },',
  '  get counts() { return [births, deaths, eaten].join("~"); }',
  '};'
].join('\n');
const run = new Function(js + '\n' + exposeSrc);
const snap = (s) => JSON.stringify([s.tick, s.counts, s.grazers, s.preds]);
const a = run(); a.newWorld('bio-seed-7');
for (let t = 0; t < 300; t++) a.step();
const ref300 = snap(a); const max = a.maxTick;
a.rewindTo(120); const at120 = snap(a);
a.rewindTo(300); const again300 = snap(a);
const b = run(); b.newWorld('bio-seed-7'); b.rewindTo(120);
const fresh120 = snap(b);
console.log('max tick reached:', max);
console.log('rewind 120 then forward to 300 equals original 300:', again300 === ref300);
console.log('fresh rewind to 120 equals rewound 120:', fresh120 === at120);
console.log('state at 120 differs from 300:', at120 !== ref300);
