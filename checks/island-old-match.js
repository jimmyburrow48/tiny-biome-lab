// Checks that island-old in the working page reproduces the island scenario as it was at HEAD (before the startPred change).
// Usage: node checks/island-old-match.js <path-to-HEAD-index.html> [N]
const fs = require('fs');
function load(file) {
  const html = fs.readFileSync(file, 'utf8');
  const js = html.split('<script>')[1].split('</script>')[0];
  const stub = () => ({ value: '', textContent: '', width: 800, height: 200, style: {}, max: 0,
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } }),
    addEventListener() {} });
  const els = {};
  global.document = { getElementById: (id) => (els[id] = els[id] || stub()), querySelectorAll: () => [] };
  global.location = { hash: '' }; global.window = { addEventListener() {} }; global.requestAnimationFrame = () => {};
  return new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; }, get grass() { return grass; } };');
}
const oldRun = load(process.argv[2]);
const newRun = load(__dirname + '/../index.html');
const N = +(process.argv[3] || 40);
let same = 0, diff = [];
for (let i = 1; i <= N; i++) {
  const a = oldRun(), b = newRun();
  a.newWorld('f' + i, 'island'); b.newWorld('f' + i, 'island-old');
  let ok = true;
  for (let t = 1; t <= 400 && ok; t++) {
    a.step(); b.step();
    if (a.grazers.length !== b.grazers.length || a.predators.length !== b.predators.length) { ok = false; diff.push(`f${i}@${t}`); }
  }
  if (ok) same++;
}
console.log(`island (HEAD) vs island-old: same for ${same}/${N} seeds x 400 ticks${diff.length ? ' | first diff ' + diff.slice(0, 3).join(', ') : ''}`);
