// Scratch check: what is happening between ticks 40 and 110 on island f6 (the early crash)? (not committed)
// Usage: node checks/island-early-crash-check.js [seed] [scenario]
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let js = html.split('<script>')[1].split('</script>')[0];
// Optional 3rd arg "predators-off": same as island-predators-off-test.js, one spawn loop turned off in this copy only.
const OLD = 'for (let i = 0; i < 4; i++) {\n    const at = spawn();\n    predators.push';
if (process.argv[4] === 'predators-off') {
  if (js.split(OLD).length !== 2) throw new Error('predator spawn not found exactly once');
  js = js.replace(OLD, 'for (let i = 0; i < 0; i++) {\n    const at = spawn();\n    predators.push');
}
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
const run = new Function(js + '\nreturn { newWorld, step, W, H, get grazers() { return grazers; }, get predators() { return predators; }, get grass() { return grass; }, get land() { return land; } };');

const seed = process.argv[2] || 'f6';
const scen = process.argv[3] || 'island';
const s = run();
s.newWorld(seed, scen);
console.log(`== ${scen} ${seed}`);
console.log('tick | grazers | predators | grass on land (sum) | grass under grazers | grass in sense square (mean) | grazers with zero grass under them');
let firstCap = null, firstPred = null;
for (let t = 1; t <= 110; t++) {
  s.step();
  if (s.predators.length >= 1 && firstPred === null) firstPred = t;
  if (s.predators.length >= 30 && firstCap === null) firstCap = t;
  if (t < 40 || t % 5 !== 0) continue;
  const G = s.grazers, W = s.W, H = s.H, L = s.land, gr = s.grass;
  if (!G.length) { console.log(`t${t} grazers 0 (predators ${s.predators.length})`); break; }
  let landGrass = 0;
  for (let i = 0; i < W * H; i++) if (L[i]) landGrass += gr[i];
  let under = 0, zero = 0, sense = 0;
  for (const g of G) {
    under += gr[g.y * W + g.x];
    if (gr[g.y * W + g.x] < 0.05) zero++;
    let sum = 0, cnt = 0;
    for (let dy = -g.sense; dy <= g.sense; dy++) for (let dx = -g.sense; dx <= g.sense; dx++) {
      const x = (g.x + dx + W) % W, y = (g.y + dy + H) % H;
      if (L[y * W + x]) { sum += gr[y * W + x]; cnt++; }
    }
    sense += cnt ? sum / cnt : 0;
  }
  const n = G.length;
  console.log(`t${t} | ${n} | ${s.predators.length} | ${landGrass.toFixed(0)} | ${(under / n).toFixed(2)} | ${(sense / n).toFixed(2)} | ${zero} (${(100 * zero / n).toFixed(0)}%)`);
}
console.log(`first predator at tick ${firstPred}; predators reach 30 at tick ${firstCap}`);
