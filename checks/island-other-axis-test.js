// Scratch experiment: does letting a blocked grazer try the other axis change island die-outs? (not committed, page untouched)
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const base = html.split('<script>')[1].split('</script>')[0];
const OLD = 'if (!walkable(nx, ny)) break;';
if (base.split(OLD).length !== 2) throw new Error('expected exactly one grazer walkable check');
const FIX = `if (!walkable(nx, ny)) {
        nx = g.x; ny = g.y;
        if (g.y !== bestY) ny = wrap(g.y + Math.sign(bestY - g.y), H);
        else if (g.x !== bestX) nx = wrap(g.x + Math.sign(bestX - g.x), W);
        if (!walkable(nx, ny)) break;
      }`;
const variants = { current: base, otherAxis: base.replace(OLD, FIX) };
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
for (const [name, js] of Object.entries(variants)) {
  const run = new Function(js + '\nreturn { newWorld, step, get grazers() { return grazers; }, get predators() { return predators; } };');
  const died = [], finals = [];
  for (let i = 1; i <= 80; i++) {
    const s = run(); s.newWorld('f' + i, 'island');
    let d = null;
    for (let t = 1; t <= 400; t++) { s.step(); if (!s.grazers.length) { d = t; break; } }
    if (d) died.push(`f${i}@${d}`);
    finals.push(s.grazers.length);
  }
  const alive = finals.filter(n => n > 0);
  const mean = alive.length ? (alive.reduce((a, b) => a + b, 0) / alive.length).toFixed(0) : 'n/a';
  console.log(`${name}: died out ${died.length}/80 ${died.join(' ')} | mean grazers at tick 400 (survivors) ${mean}`);
}
