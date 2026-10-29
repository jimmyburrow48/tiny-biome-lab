// Scratch check (not for the page): does grass already run out before the grazers collapse on island die-outs?
// Runs the real page code (live island rule, startPred 2) over seeds f1..fN and records grass and predators at fixed ticks.
// Usage: node checks/island-dieout-grass-check.js [N]
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
const N = +(process.argv[2] || 80);
if (!(N > 0)) { console.log('usage: island-dieout-grass-check.js N (number)'); process.exit(2); }
const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; }, get grass() { return grass; }, get land() { return land; } };');
const CHECK = [25, 50, 75, 100, 150];
const rows = [];
for (let i = 1; i <= N; i++) {
  const s = run(); s.newWorld('f' + i, 'island');
  const row = { seed: 'f' + i, died: null, rec: {}, predCap: null, grassAtCap: null, grazAtCap: null };
  let lastGrass = 0;
  const grassSum = () => { let g = 0; for (let k = 0; k < s.land.length; k++) if (s.land[k]) g += s.grass[k]; return g; };
  for (let t = 1; t <= 400; t++) {
    s.step();
    if (CHECK.includes(t)) row.rec[t] = { g: s.grazers.length, p: s.predators.length, grass: Math.round(grassSum()) };
    if (row.predCap === null && s.predators.length >= 30) { row.predCap = t; row.grassAtCap = Math.round(grassSum()); row.grazAtCap = s.grazers.length; }
    if (!s.grazers.length) { row.died = t; break; }
  }
  rows.push(row);
}
const died = rows.filter((r) => r.died !== null);
const alive = rows.filter((r) => r.died === null);
console.log(`island seeds f1..f${N} (live rule): died out ${died.length}/${N}`);
console.log('seed | died@ | pred30@ | grass@pred30 | graz@pred30 | ' + CHECK.map((t) => `t${t} g/p/grass`).join(' | '));
for (const r of rows) {
  const cells = CHECK.map((t) => (r.rec[t] ? `${r.rec[t].g}/${r.rec[t].p}/${r.rec[t].grass}` : '-'));
  console.log(`${r.seed} | ${r.died ?? 'alive'} | ${r.predCap ?? '-'} | ${r.grassAtCap ?? '-'} | ${r.grazAtCap ?? '-'} | ${cells.join(' | ')}`);
}
const med = (a) => { const b = a.filter((x) => x !== null && x !== undefined).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 'n/a'; };
console.log(`median grass at tick 100 | died out: ${med(died.map((r) => r.rec[100] && r.rec[100].grass))} | alive: ${med(alive.map((r) => r.rec[100] && r.rec[100].grass))}`);
console.log(`median grass at tick 50 | died out: ${med(died.map((r) => r.rec[50] && r.rec[50].grass))} | alive: ${med(alive.map((r) => r.rec[50] && r.rec[50].grass))}`);
console.log(`predator cap (30) tick, median | died out: ${med(died.map((r) => r.predCap))} | alive: ${med(alive.map((r) => r.predCap))}`);
