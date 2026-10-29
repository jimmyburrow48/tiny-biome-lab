// Headless featured-run scan: runs each scenario over many seeds (same newWorld and step as the page)
// and prints the metrics that decide which runs get featured. Usage: node featured.js [seedsPerScenario]
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
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
const exposeSrc = [
  'return {',
  '  newWorld, step,',
  '  get grazers() { return grazers; }, get predators() { return predators; },',
  '  get floods() { return floods; }',
  '};'
].join('\n');
const run = new Function(js + '\n' + exposeSrc);

const N = Number(process.argv[2]) || 80;
const TICKS = 400;
const SCENS = ['normal', 'drought', 'island', 'flood'];
const rows = [];

for (const scen of SCENS) {
  for (let i = 1; i <= N; i++) {
    const seed = 'f' + i;
    const s = run();
    s.newWorld(seed, scen);
    const g = [s.grazers.length], p = [s.predators.length];
    const floodTicks = [];
    for (let t = 1; t <= TICKS; t++) {
      const before = s.floods;
      s.step();
      if (s.floods > before) floodTicks.push(t);
      g.push(s.grazers.length);
      p.push(s.predators.length);
    }
    // Flood dip: worst fall in grazers within 15 ticks after a flood, as a share of the count just before it.
    let dip = 0;
    for (const ft of floodTicks) {
      const pre = g[ft - 1] || 1;
      const low = Math.min(...g.slice(ft, Math.min(ft + 16, TICKS + 1)));
      dip = Math.max(dip, (pre - low) / pre);
    }
    const peakG = Math.max(...g), peakGt = g.indexOf(peakG);
    const minAfter = Math.min(...g.slice(peakGt));
    const crash = peakG ? minAfter / peakG : 0;
    const peakP = Math.max(...p), peakPt = p.indexOf(peakP);
    const predZero = p.slice(1).indexOf(0) + 1; // 0 means predators never hit zero
    const grazZero = g.slice(1).indexOf(0) + 1;
    const last = g.slice(-100);
    const mean = last.reduce((a, b) => a + b, 0) / last.length;
    const spread = mean ? (Math.max(...last) - Math.min(...last)) / mean : 1;
    const settles = Math.min(...last) >= 20 && spread <= 0.25;
    const recovers = g[TICKS] > 0 && g[TICKS] >= 2 * minAfter;
    const minT = g.indexOf(minAfter, peakGt);
    rows.push({ scen, seed, start: g[0], peakG, peakGt, minAfter, crash, finalG: g[TICKS],
      peakP, peakPt, predZero, grazZero, floods: s.floods, spread, settles, recovers, dip, minT, floodTicks });
  }
}

// Tags: a row can have several. Thresholds are set before reading the results (see the project note).
const tags = (r) => {
  const t = [];
  if (r.peakG >= 2 * r.start && r.crash <= 0.25 && r.recovers) t.push('boom-crash-recover');
  if (r.peakP >= 10 && r.peakPt > r.peakGt) t.push('pred-wave');
  if (r.scen === 'island' && r.settles) t.push('settles');
  if (r.scen === 'flood' && r.floods >= 3 && r.dip >= 0.25) t.push('flood-dip');
  if (r.finalG === 0) t.push('dies-out');
  return t;
};

for (const scen of SCENS) {
  const sc = rows.filter(r => r.scen === scen);
  const counts = {};
  for (const r of sc) for (const t of tags(r)) counts[t] = (counts[t] || 0) + 1;
  console.log(scen.padEnd(8), 'runs', sc.length, JSON.stringify(counts));
}
console.log('');
const fmt = (r) => `${r.scen.padEnd(8)} ${r.seed.padEnd(6)} start ${String(r.start).padStart(3)} peak ${String(r.peakG).padStart(3)}@${r.peakGt} min ${String(r.minAfter).padStart(3)} crash ${r.crash.toFixed(2)} final ${String(r.finalG).padStart(3)} predPeak ${r.peakP}@${r.peakPt} predZero ${r.predZero} grazZero ${r.grazZero} floods ${r.floods} dip ${r.dip.toFixed(2)} spread ${r.spread.toFixed(2)} tags ${tags(r).join(',')}`;
for (const tag of ['boom-crash-recover', 'pred-wave', 'settles', 'flood-dip', 'dies-out']) {
  const hits = rows.filter(r => tags(r).includes(tag));
  console.log(`== ${tag} (${hits.length})`);
  for (const r of hits.slice(0, 6)) console.log(fmt(r));
}
fs.writeFileSync(__dirname + '/featured-scan.json', JSON.stringify(rows, null, 1));
console.log('\nwrote featured-scan.json (not committed; scratch output)');
