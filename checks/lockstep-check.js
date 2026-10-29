// Lockstep check: run A plays to tick `at` and takes a snapshot. Run B is a different,
// already-running sim that gets restored from that snapshot. Then both step one tick at a time,
// and their full saved state (saveState, every field, exact floats) must match every tick.
// Usage: node checks/lockstep-check.js index.html [seed] [scenario] [at] [ticks]
// NEG=1 hands run B a snapshot with its rng nudged by one: the check must then report a divergence (negative control).
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const seed = process.argv[3] || 'bio-seed-7';
const scen = process.argv[4] || 'normal';
const at = +(process.argv[5] || 137);
const ticks = +(process.argv[6] || 300);
if (!(at > 0 && ticks > 0)) { console.log('usage: lockstep-check.js index.html seed scenario at ticks (numbers)'); process.exit(2); } // a NaN would run zero loops and pass
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

// Run A: play to the snapshot point and save.
const a = make();
a.newWorld(seed, scen);
for (let t = 0; t < at; t++) a.step();
const S = a.save();
const before = JSON.stringify(S);

// Run B: a sim that is already running on another world, then restored from A's snapshot.
const b = make();
b.newWorld(seed + '!', scen);
for (let t = 0; t < 50; t++) b.step();
b.restore(process.env.NEG ? { ...S, rng: (S.rng + 1) >>> 0 } : S);

if (full(a) !== full(b)) {
  console.log(`RESTORE MISMATCH at tick ${a.tick} (seed ${seed}, ${scen}): B does not match A right after restore`);
  process.exit(1);
}

for (let t = 1; t <= ticks; t++) {
  a.step(); b.step();
  if (full(a) !== full(b)) {
    console.log(`DIVERGED ${t} ticks after restore (A tick ${a.tick}, seed ${seed}, ${scen})`);
    process.exit(1);
  }
}

// The snapshot must not share memory with either run: a later step must not change it.
if (JSON.stringify(S) !== before) {
  console.log(`SNAPSHOT CHANGED after ${ticks} ticks: restore or save shares an array with a live run`);
  process.exit(1);
}
console.log(`lockstep identical for ${ticks} ticks after restore at tick ${at} (seed ${seed}, ${scen})`);
