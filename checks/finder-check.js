// Seed finder check (findDieOut in index.html, behind the "find an island that dies out" button).
// 1. the live sim is unchanged by a scan (saveState JSON before == after), mid-run on a plain island seed.
// 2. the seed it returns replays to the same die-out tick in a plain run (same grazers gone tick).
// Math.random is replaced with a fixed sequence so the scan is repeatable.
// Runs the real page code with stubbed DOM. Usage: node checks/finder-check.js [rounds]  (run from the tiny-biome-lab folder)
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
let rs = 12345;
Math.random = () => { rs = (rs * 1103515245 + 12345) % 2147483648; return rs / 2147483648; };

const make = () => new Function(js + '\nreturn { newWorld, step, saveState, findDieOut, get tick() { return tick; }, get grazers() { return grazers; }, get grazerGone() { return grazerGone; } };')();
const rounds = +(process.argv[2] || 3);
if (!(rounds > 0)) { console.log('usage: node checks/finder-check.js [rounds]'); process.exit(2); }
let bad = 0;
for (let r = 1; r <= rounds; r++) {
  const s = make();
  s.newWorld('bio-seed-' + r, 'island');
  while (s.tick < 137) s.step();
  const before = JSON.stringify(s.saveState());
  const t0 = Date.now();
  const { found, tried } = s.findDieOut();
  const ms = Date.now() - t0;
  const after = JSON.stringify(s.saveState());
  const liveSame = before === after;
  let replayOk = null;
  if (found) {
    const p = make();
    p.newWorld(found.seed, 'island');
    while (p.tick < 400 && p.grazers.length) p.step();
    replayOk = !p.grazers.length && p.grazerGone === found.tick;
  }
  const ok = liveSame && (found === null || replayOk);
  if (!ok) bad++;
  console.log(`round ${r}: live sim same ${liveSame ? 'yes' : 'NO'} | found ${found ? `seed ${found.seed} gone at t${found.tick}` : 'none'} after ${tried} seeds (${ms} ms) | replay ${replayOk === null ? 'n/a' : replayOk ? 'matches' : 'MISMATCH'} | ${ok ? 'OK' : 'FAIL'}`);
}
console.log(bad ? `${bad} round(s) FAILED` : `all ${rounds} rounds OK`);
process.exit(bad ? 1 : 0);
