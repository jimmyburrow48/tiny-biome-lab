// Same seed, two island starts: the current island rule (2 predators) vs island-old (4 predators).
// Runs the real page code. Prints the grazer timeline facts a featured caption needs.
// Usage: node checks/island-compare-starts.js <seed>
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
const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; }, get grass() { return grass; }, get grazerGone() { return grazerGone; }, get predGone() { return predGone; } };');
const seed = process.argv[2];
if (!seed) { console.log('usage: island-compare-starts.js <seed>'); process.exit(2); }
for (const scen of ['island', 'island-old']) {
  const s = run();
  s.newWorld(seed, scen);
  const startPred = s.predators.length;
  let minG = Infinity, minTick = 0, firstGone = null;
  const pts = [];
  for (let t = 1; t <= 400; t++) {
    s.step();
    const g = s.grazers.length;
    if (t > 100 && g < minG) { minG = g; minTick = t; }
    if (g === 0 && firstGone === null) firstGone = t;
    if (t % 100 === 0) pts.push(`${t}:g${g}/p${s.predators.length}`);
  }
  console.log(`${scen} ${seed}: predators at start ${startPred} | grazers at 400 ${s.grazers.length} | grazers gone at tick ${firstGone} | lowest grazers after tick 100 ${minG} (tick ${minTick}) | ${pts.join(' ')}`);
}
