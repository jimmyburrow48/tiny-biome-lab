// Side-by-side view check: updateCompare() must not change the live sim (saveState before == after),
// and the two panel runs must match a plain run of the same seed (island-compare-starts.js logic).
// Runs the real page code with stubbed DOM. Usage: node checks/compare-view-check.js <seed> [seed...]
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];
const els = {};
function stubEl() {
  return { value: '', textContent: '', width: 390, height: 200, style: {}, max: 0,
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } }),
    addEventListener() {} };
}
global.document = { getElementById: (id) => (els[id] = els[id] || stubEl()), querySelectorAll: () => [] };
global.location = { hash: '' };
global.window = { addEventListener() {} };
global.requestAnimationFrame = () => {};
const make = () => new Function(js + '\nreturn { newWorld, step, saveState, updateCompare, startRun, runText, get grazers() { return grazers; }, get predators() { return predators; }, get tick() { return tick; }, get grazerGone() { return grazerGone; }, get predGone() { return predGone; }, get curSeed() { return curSeed; }, get curScen() { return curScen; } };')();
const seeds = process.argv.slice(2);
if (!seeds.length) { console.log('usage: node checks/compare-view-check.js <seed> [seed...]'); process.exit(2); }
let bad = 0;
for (const seed of seeds) {
  // 1. live sim unchanged by the panels (the live run is at tick 137 on the normal scenario, mid-run)
  const s = make();
  s.newWorld(seed, 'normal');
  while (s.tick < 137) s.step();
  const before = JSON.stringify(s.saveState());
  s.updateCompare();
  const after = JSON.stringify(s.saveState());
  const liveSame = before === after;
  // 2. the panel runs equal a plain island / island-old run (same as checks/island-compare-starts.js)
  const a = s.startRun(seed, 'island');
  const b = s.startRun(seed, 'island-old');
  const plain = {};
  for (const scen of ['island', 'island-old']) {
    const p = make();
    p.newWorld(seed, scen);
    while (p.tick < 400) p.step();
    plain[scen] = { grazers: p.grazers.length, pred: p.predators.length, grazerGone: p.grazerGone, predGone: p.predGone };
  }
  const panelSame = a.grazersNow === plain.island.grazers && a.predNow === plain.island.pred && a.grazerGone === plain.island.grazerGone && a.predGone === plain.island.predGone
    && b.grazersNow === plain['island-old'].grazers && b.predNow === plain['island-old'].pred && b.grazerGone === plain['island-old'].grazerGone && b.predGone === plain['island-old'].predGone;
  // 3. the live state is still unchanged after the scratch runs
  const liveStill = JSON.stringify(s.saveState()) === before;
  const ok = liveSame && panelSame && liveStill;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} seed ${seed}: live unchanged ${liveSame && liveStill} | panels match plain runs ${panelSame} | island ${a.startPred} pred: grazers gone ${a.grazerGone}, predators gone ${a.predGone}, grazers at 400 ${a.grazersNow} | island-old ${b.startPred} pred: grazers gone ${b.grazerGone}, grazers at 400 ${b.grazersNow}, predators gone ${b.predGone}, predators at 400 ${b.predNow}`);
  console.log(`     A: ${s.runText(a)}`);
  console.log(`     B: ${s.runText(b)}`);
}
process.exit(bad ? 1 : 0);
