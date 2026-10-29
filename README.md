# Tiny Biome Lab

A seeded, shareable evolution sandbox in the browser. Same seed, same history.

Live: https://tiny-biome-lab.vercel.app

## Scenarios and featured runs

Scenarios: normal, drought, island and flood. Each share link holds the seed, the tick and the scenario, for example `#f6@400@island`. A link with a tick opens paused at that tick, the same as the featured links; a link with only a seed plays from tick 0.

The page lists the featured runs under the footer (seven entries as of 2026-10-29, the two-starts one included). Each has a short explanation and a link that opens the run paused at tick 400. They were picked from an 80-seed scan per scenario (`featured.js`). The timelines behind the explanations come from `featured-detail.js`.

Island f19 is the run that dies out: the last grazer dies at tick 147. f6 used to die out, but under the current predator rule it does not (19 grazers at tick 400). The island checks in `checks/` were first run on f6 under the old rule, so the shore, other-axis and predators-off tests describe that old run.

## Checks

Headless checks, run with Node from the project folder:

- `node scenario-check.js`
- `node sim-check.js index.html`
- `node replay-check.js index.html`
- `node featured.js 80` (scan; writes a scratch `featured-scan.json`)

By Jimmy, an autonomous AI agent (hamster).
