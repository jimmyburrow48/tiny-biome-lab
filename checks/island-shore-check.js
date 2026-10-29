// Scratch check: why do grazers die out on island f6 while grass stays high? (not committed)
// Usage: node island-check.js '<json list of [seed, scenario]>'
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
global.requestAnimationFrame = () => {};
const run = new Function(js + '\nreturn { newWorld, step, W, H, get grazers() { return grazers; }, get predators() { return predators; }, get grass() { return grass; }, get land() { return land; } };');

// The sim's target choice: richest grass in the sense square; ties go to the first cell in scan order.
function target(s, g) {
  let bx = g.x, by = g.y, bv = -1;
  for (let dy = -g.sense; dy <= g.sense; dy++) for (let dx = -g.sense; dx <= g.sense; dx++) {
    const x = (g.x + dx + s.W) % s.W, y = (g.y + dy + s.H) % s.H;
    const v = s.grass[y * s.W + x];
    if (v > bv) { bv = v; bx = x; by = y; }
  }
  return { bx, by, bv };
}

const picks = JSON.parse(process.argv[2]);
for (const [seed, scen] of picks) {
  const s = run();
  s.newWorld(seed, scen);
  console.log(`== ${scen} ${seed}`);
  for (let t = 1; t <= 300; t++) {
    s.step();
    if (t % 50 !== 0) continue;
    const G = s.grazers, W = s.W, H = s.H, L = s.land, gr = s.grass;
    if (!G.length) { console.log(`t${t} grazers 0 (predators ${s.predators.length})`); break; }
    const shore = (x, y) => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => {
      const nx = (x + dx + W) % W, ny = (y + dy + H) % H; return L[ny * W + nx] === 0; });
    let onShore = 0, under = 0, bestV = 0, stuck = 0, dist = 0, landGrass = 0, landCells = 0;
    for (const g of G) {
      if (shore(g.x, g.y)) onShore++;
      under += gr[g.y * W + g.x];
      const { bx, by, bv } = target(s, g);
      bestV += bv;
      const d = Math.max(Math.abs(bx - g.x), Math.abs(by - g.y));
      dist += d;
      // First step the sim would take toward the target: if that cell is water, the grazer is blocked.
      if (d > 0) {
        const nx = g.x !== bx ? (g.x + Math.sign(bx - g.x) + W) % W : g.x;
        const ny = g.x === bx ? (g.y + Math.sign(by - g.y) + H) % H : g.y;
        if (L[ny * W + nx] === 0) stuck++;
      }
    }
    // Land cells with grass, and how many of them any grazer can see (sense 3 is the smallest gene).
    const seen = new Uint8Array(W * H);
    for (const g of G) for (let dy = -g.sense; dy <= g.sense; dy++) for (let dx = -g.sense; dx <= g.sense; dx++)
      seen[((g.y + dy + H) % H) * W + ((g.x + dx + W) % W)] = 1;
    let land = 0, rich = 0, richSeen = 0;
    for (let i = 0; i < W * H; i++) if (L[i]) { land++; if (gr[i] >= 0.5) { rich++; if (seen[i]) richSeen++; } }
    const n = G.length;
    console.log(`t${t} grazers ${n} predators ${s.predators.length} | on shore ${(100*onShore/n).toFixed(0)}% | ` +
      `grass under grazers ${(under/n).toFixed(2)} | best-target grass ${(bestV/n).toFixed(2)} | ` +
      `mean dist to target ${(dist/n).toFixed(1)} | first step into water ${(100*stuck/n).toFixed(0)}% | ` +
      `rich land cells (>=0.5) ${rich}/${land}, seen by a grazer ${richSeen}`);
  }
}
