// Snapshot round-trip check: for every seed and scenario, run A to tick `at`, turn its snapshot into a JSON string,
// parse that string back, and restore it into a FRESH sim (B, never stepped). Then both step `ticks` more ticks.
// Every tick the full saveState of A and B must match exactly (rng state, history and grazer genes included),
// and B must end on tick at + ticks. Going through JSON text means anything the snapshot forgets to store fails here.
// Usage: node checks/snapshot-roundtrip-check.js index.html [at] [ticks]
// NEG=1 nudges the rng in the restored copy by one: the check must then report a divergence (negative control).
const fs = require('fs');
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const at = +(process.argv[3] || 137);
const ticks = +(process.argv[4] || 300);
if (!(at > 0 && ticks > 0)) { console.log('usage: snapshot-roundtrip-check.js index.html at ticks (numbers)'); process.exit(2); } // a NaN would run zero loops and pass
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
const exposeSrc = 'return { newWorld, step, save: saveState, restore: restoreState, get tick() { return tick; } };';
const make = () => new Function(js + '\n' + exposeSrc)();
const full = (s) => JSON.stringify(s.save());
// JSON turns NaN and Infinity into null, -0 into 0 and drops undefined, so the text comparison alone cannot see them.
// Walk the saved state and report the first value JSON would silently change.
function unsafe(v, path = 'state') {
  if (v === undefined || (typeof v === 'number' && (!Number.isFinite(v) || Object.is(v, -0)))) return path + ' = ' + String(Object.is(v, -0) ? '-0' : v);
  if (v && typeof v === 'object') for (const k of Object.keys(v)) { const r = unsafe(v[k], path + '.' + k); if (r) return r; }
  return null;
}

const SEEDS = ['bio-seed-7', '12345', '999'];
const SCENS = ['normal', 'drought', 'island', 'flood'];
let runs = 0, fails = 0;
for (const seed of SEEDS) for (const scen of SCENS) {
  runs++;
  const label = `seed ${seed}, ${scen}`;
  const a = make();
  a.newWorld(seed, scen);
  for (let t = 0; t < at; t++) a.step();
  const text = JSON.stringify(a.save());
  const hidden = unsafe(a.save());
  if (hidden) { console.log(`FAIL ${label}: at tick ${at}, ${hidden} does not survive JSON`); fails++; continue; }

  const snap = JSON.parse(text);
  if (process.env.NEG) snap.rng = (snap.rng + 1) >>> 0;
  const b = make(); // fresh sim: never built, never stepped
  b.restore(snap);

  if (full(a) !== full(b)) { console.log(`FAIL ${label}: RESTORE MISMATCH right after restore at tick ${a.tick}`); fails++; continue; }
  let bad = null;
  for (let t = 1; t <= ticks && !bad; t++) {
    a.step(); b.step();
    if (full(a) !== full(b)) bad = `DIVERGED ${t} ticks after restore (A tick ${a.tick})`;
  }
  if (!bad && b.tick !== at + ticks) bad = `B ended on tick ${b.tick}, expected ${at + ticks}`;
  if (bad) { console.log(`FAIL ${label}: ${bad}`); fails++; continue; }
  console.log(`ok ${label}: identical for ${ticks} ticks after restore at tick ${at}`);
}
console.log(fails ? `${fails} of ${runs} runs failed` : `all ${runs} runs identical`);
process.exit(fails ? 1 : 0);
