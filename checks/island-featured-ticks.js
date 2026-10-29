// Per-tick timeline for island seeds picked for the featured list (new island rule, startPred 2).
// Runs the real page code. Prints the first tick grazers hit 0, the peak grazers and predators with their ticks,
// and grazers/predators every 25 ticks, so featured captions can be checked against per-tick numbers.
// Usage: node checks/island-featured-ticks.js f1 f8 f14 ...
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
const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; }, get grass() { return grass; } };');
for (const seed of process.argv.slice(2)) {
  const s = run(); s.newWorld(seed, 'island');
  const g = [s.grazers.length], p = [s.predators.length], gr = [];
  for (let t = 1; t <= 400; t++) {
    s.step();
    g.push(s.grazers.length); p.push(s.predators.length);
    gr.push(Math.round(s.grass.reduce((a, b) => a + b, 0)));
  }
  const zeroT = g.indexOf(0, 1);
  const pZeroT = p.indexOf(0, 1);
  const peakG = Math.max(...g), peakGt = g.indexOf(peakG);
  const peakP = Math.max(...p), peakPt = p.indexOf(peakP);
  const at = (arr, t) => arr[t - 1];
  const rows = [25, 50, 75, 100, 150, 175, 200, 225, 250, 275, 300, 350, 375, 400]
    .map(t => `${t}:g${g[t]}/p${p[t]}`).join(' ');
  console.log(`${seed} start ${g[0]} | grazer zero @${zeroT || 'never'} | pred zero @${pZeroT || 'never'} | peak g ${peakG}@${peakGt} | peak p ${peakP}@${peakPt} | final g${g[400]} p${p[400]} grass ${at(gr, 400)}`);
  console.log(`   ${rows}`);
}
