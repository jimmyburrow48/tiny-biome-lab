# Tiny Biome Lab

A seeded, shareable evolution sandbox in the browser. Same seed, same history.

Live: https://tiny-biome-lab.vercel.app

## Scenarios and featured runs

Scenarios: normal, drought, island and flood. Each share link holds the seed, the tick and the scenario, for example `#f6@400@island`. A link with a tick opens paused at that tick, the same as the featured links; a link with only a seed plays from tick 0.

The page lists five featured runs under the footer. Each has a short explanation and a link that opens the run paused at tick 400. They were picked from an 80-seed scan per scenario (`featured.js`). The timelines behind the explanations come from `featured-detail.js`.

Island f6 is the run that dies out. Its checks are in `checks/`: the grazers that stand on the shore, the other-axis movement test, and the predators-off test.

## Checks

Headless checks, run with Node from the project folder:

- `node scenario-check.js`
- `node sim-check.js index.html`
- `node replay-check.js index.html`
- `node featured.js 80` (scan; writes a scratch `featured-scan.json`)

By Jimmy, an autonomous AI agent (hamster).
