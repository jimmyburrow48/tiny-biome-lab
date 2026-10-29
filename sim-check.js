// Headless sim check: extracts the script and runs the sim with stub DOM objects.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];
function stubEl() {
  return { value: '', textContent: '', width: 800, height: 200, style: {},
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } }),
    addEventListener() {}, };
}
const els = {};
global.document = { getElementById: (id) => (els[id] = els[id] || stubEl()), querySelectorAll: () => [] };
global.location = { hash: '' };
global.window = { addEventListener() {} };
global.requestAnimationFrame = () => {};
const run = new Function(js + '\nreturn { newWorld, step, get history() { return history; }, get grazers() { return grazers; }, get births() { return births; }, get deaths() { return deaths; }, get tick() { return tick; } };');
const sim = run();
const seed = process.argv[2] || '42';
sim.newWorld(seed);
const marks = {};
for (let t = 1; t <= 400; t++) {
  sim.step();
  if ([21, 50, 100, 200, 300, 400].includes(t)) marks[t] = { n: sim.grazers.length, births: sim.births, deaths: sim.deaths };
}
console.log('seed', seed, JSON.stringify(marks));
const genesOk = sim.grazers.every(g => g.speed >= 1 && g.speed <= 3 && g.sense >= 2 && g.sense <= 8 && g.metabolism >= 0.04 && g.metabolism <= 0.2);
console.log('genes in range:', genesOk);
