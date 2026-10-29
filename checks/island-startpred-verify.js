// Verifies the page's island rule (startPred 2) over the same 1200 island seeds as island-predator-samespawn-test.js.
// Runs the real page code, so it checks the change itself rather than a string-patched copy.
// Usage: node checks/island-startpred-verify.js [N]
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
const N = +(process.argv[2] || 1200);
if (!(N > 0)) { console.log('usage: island-startpred-verify.js N (number)'); process.exit(2); }
const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; } };');
const died = [];
let predStart = 0;
for (let i = 1; i <= N; i++) {
  const s = run(); s.newWorld('f' + i, 'island');
  if (i === 1) predStart = s.predators.length;
  for (let t = 1; t <= 400; t++) { s.step(); if (!s.grazers.length) { died.push(t); break; } }
}
console.log(`island, page rule: predators at start ${predStart} | died out ${died.length}/${N} (${(100 * died.length / N).toFixed(1)}%)`);
