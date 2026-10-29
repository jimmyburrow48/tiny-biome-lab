// Scratch experiment (not committed, page untouched): same world at tick 0 for every variant.
// startTwoDrop still spawns four predators, so the world rng stream is identical; then it keeps only the first two.
// The old startTwo variant (island-predator-rule-test.js) changes the rng stream, so it is not a clean same-world comparison.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const base = html.split('<script>')[1].split('</script>')[0];
const BREED_OLD = 'const PRED_AT = 25;';
const DROP_OLD = '  tick = 0;\n  births = 0;';
if (base.split(BREED_OLD).length !== 2) throw new Error('PRED_AT not found exactly once');
if (base.split(DROP_OLD).length !== 2) throw new Error('newWorld reset not found exactly once');
const variants = {
  current: base,
  startTwoDrop: base.replace(DROP_OLD, '  predators.length = 2;\n' + DROP_OLD),
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
const N = +(process.argv[2] || 80);
for (const [name, js] of Object.entries(variants)) {
  const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; } };');
  const died = [];
  let predPeakSum = 0, tick0 = 0;
  for (let i = 1; i <= N; i++) {
    const s = run(); s.newWorld('f' + i, 'island');
    tick0 += s.grazers.length * 1000 + s.grazers.reduce((a, g) => a + g.x * 7 + g.y * 13, 0);
    let d = null, predPeak = s.predators.length;
    for (let t = 1; t <= 400; t++) { s.step(); predPeak = Math.max(predPeak, s.predators.length); if (!s.grazers.length) { d = t; break; } }
    if (d) died.push(`f${i}@${d}`);
    predPeakSum += predPeak;
  }
  console.log(`${name}: died out ${died.length}/${N} | mean predator peak ${(predPeakSum / N).toFixed(1)} | tick-0 world checksum ${tick0}`);
  console.log(`  ${died.join(' ')}`);
}
