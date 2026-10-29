// Scratch check (not for the page): does the mean grazer metabolism gene at tick T separate island die-outs from survivors?
// One candidate, survivors included. Real page code, live island rule, seeds f1..fN.
// Usage: node checks/island-candidate-metab.js [N] [T]
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
const T = +(process.argv[3] || 50);
if (!(N > 0) || !(T > 0)) { console.log('usage: island-candidate-metab.js N T (numbers)'); process.exit(2); }
const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; } };');
const rows = [];
for (let i = 1; i <= N; i++) {
  const s = run(); s.newWorld('f' + i, 'island');
  let died = null, metab = null, n = null;
  for (let t = 1; t <= 400; t++) {
    s.step();
    if (t === T && s.grazers.length) { metab = s.grazers.reduce((a, g) => a + g.metabolism, 0) / s.grazers.length; n = s.grazers.length; }
    if (!s.grazers.length) { died = t; break; }
  }
  rows.push({ seed: 'f' + i, died: died !== null, metab, n });
}
const defined = rows.filter((r) => r.metab !== null);
const sorted = defined.map((r) => r.metab).sort((a, b) => a - b);
const cut = sorted[sorted.length >> 1];
const grp = (pred) => rows.filter((r) => r.metab !== null && pred(r));
const hiD = grp((r) => r.metab >= cut && r.died).length, hiA = grp((r) => r.metab >= cut && !r.died).length;
const loD = grp((r) => r.metab < cut && r.died).length, loA = grp((r) => r.metab < cut && !r.died).length;
const mean = (a) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(4);
console.log(`island seeds f1..f${N}, candidate: mean grazer metabolism at tick ${T}, split at median ${cut.toFixed(4)}`);
console.log(`died out overall: ${rows.filter((r) => r.died).length}/${N}; seeds with grazers at tick ${T}: ${defined.length}`);
console.log(`metab at or above median: died ${hiD}, survived ${hiA} (die-out rate ${(100 * hiD / Math.max(1, hiD + hiA)).toFixed(1)}%)`);
console.log(`metab below median      : died ${loD}, survived ${loA} (die-out rate ${(100 * loD / Math.max(1, loD + loA)).toFixed(1)}%)`);
console.log(`mean metab at tick ${T}: died out ${mean(rows.filter((r) => r.died && r.metab !== null).map((r) => r.metab))} | survived ${mean(rows.filter((r) => !r.died && r.metab !== null).map((r) => r.metab))}`);
