// Scratch check (not for the page): does a low grazer-to-predator ratio at tick 75 separate island die-outs from survivors?
// One candidate, survivors included. Runs the real page code (live island rule) over seeds f1..fN.
// Usage: node checks/island-candidate-ratio.js [N] [T]
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
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
const N = +(process.argv[2] || 200);
const T = +(process.argv[3] || 75);
if (!(N > 0) || !(T > 0)) { console.log('usage: island-candidate-ratio.js N T (numbers)'); process.exit(2); }
const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; } };');
const rows = [];
for (let i = 1; i <= N; i++) {
  const s = run(); s.newWorld('f' + i, 'island');
  let died = null, ratio = null;
  for (let t = 1; t <= 400; t++) {
    s.step();
    if (t === T) ratio = s.predators.length ? s.grazers.length / s.predators.length : Infinity;
    if (!s.grazers.length) { died = t; break; }
  }
  rows.push({ seed: 'f' + i, died: died !== null, ratio });
}
// candidate: ratio at tick T below 5 (grazers outnumbered by fewer than 5 each predator)
const CUT = 5;
const cell = (pred) => rows.filter(pred);
const hiDie = cell((r) => r.ratio !== null && r.ratio < CUT && r.died).length;
const hiAlive = cell((r) => r.ratio !== null && r.ratio < CUT && !r.died).length;
const loDie = cell((r) => r.ratio !== null && r.ratio >= CUT && r.died).length;
const loAlive = cell((r) => r.ratio !== null && r.ratio >= CUT && !r.died).length;
const total = rows.filter((r) => r.ratio !== null).length;
const diedTotal = rows.filter((r) => r.died).length;
console.log(`island seeds f1..f${N}, candidate: grazers/predators < ${CUT} at tick ${T}`);
console.log(`died out overall: ${diedTotal}/${N}; seeds still with grazers at tick ${T} (ratio defined): ${total}`);
console.log(`candidate true : died ${hiDie}, survived ${hiAlive}  (die-out rate ${(100 * hiDie / Math.max(1, hiDie + hiAlive)).toFixed(1)}%)`);
console.log(`candidate false: died ${loDie}, survived ${loAlive}  (die-out rate ${(100 * loDie / Math.max(1, loDie + loAlive)).toFixed(1)}%)`);
console.log(`ratio at tick ${T}, died out: ${rows.filter((r) => r.died && r.ratio !== null).map((r) => r.ratio.toFixed(1)).sort((a, b) => a - b).join(' ')}`);
