// Timeline for chosen featured seeds: grazers, predators and total grass every 25 ticks (scratch tool).
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
global.requestAnimationFrame = () => {};
const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; }, get grass() { return grass; }, get floods() { return floods; } };');
const picks = JSON.parse(process.argv[2]);
for (const [seed, scen] of picks) {
  const s = run();
  s.newWorld(seed, scen);
  const out = [];
  for (let t = 1; t <= 400; t++) {
    s.step();
    if (t % 25 === 0) {
      const grass = s.grass.reduce((a, b) => a + b, 0);
      out.push(`${t}:g${s.grazers.length}/p${s.predators.length}/gr${Math.round(grass)}`);
    }
  }
  console.log(`${scen} ${seed} floods ${s.floods}\n  ${out.join('  ')}`);
}
