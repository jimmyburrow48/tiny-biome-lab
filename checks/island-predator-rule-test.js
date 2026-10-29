// Scratch experiment: island die-outs with two predator rule changes vs the current rules, same 80 seeds (not committed, page untouched)
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const base = html.split('<script>')[1].split('</script>')[0];
const SPAWN_OLD = 'for (let i = 0; i < 4; i++) {\n    const at = spawn();\n    predators.push';
const BREED_OLD = 'const PRED_AT = 25;';
if (base.split(SPAWN_OLD).length !== 2) throw new Error('predator spawn not found exactly once');
if (base.split(BREED_OLD).length !== 2) throw new Error('PRED_AT not found exactly once');
const variants = {
  current: base,
  startTwo: base.replace(SPAWN_OLD, 'for (let i = 0; i < 2; i++) {\n    const at = spawn();\n    predators.push'),
  breedLater: base.replace(BREED_OLD, 'const PRED_AT = 35;'),
};
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
for (const [name, js] of Object.entries(variants)) {
  const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; } };');
  const died = [], finals = [];
  let predPeakSum = 0;
  for (let i = 1; i <= 80; i++) {
    const s = run(); s.newWorld('f' + i, 'island');
    let d = null, predPeak = 0;
    for (let t = 1; t <= 400; t++) { s.step(); predPeak = Math.max(predPeak, s.predators.length); if (!s.grazers.length) { d = t; break; } }
    if (d) died.push(`f${i}@${d}`);
    finals.push(s.grazers.length);
    predPeakSum += predPeak;
  }
  const alive = finals.filter(n => n > 0);
  const mean = alive.length ? (alive.reduce((a, b) => a + b, 0) / alive.length).toFixed(0) : 'n/a';
  console.log(`${name}: died out ${died.length}/80 | mean predator peak ${(predPeakSum / 80).toFixed(1)} | mean grazers at tick 400 (survivors) ${mean}`);
  console.log(`  ${died.join(' ')}`);
}
