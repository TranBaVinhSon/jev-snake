# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## SnakeBench product decisions

- Use the light editorial layout from design option 1.
- Place the shared timer and score module from design option 3 between the game boards.
- Keep the game, scoring, and agent loops in the browser. The only server code is
  the `/api/jev` relay, which exists because TypeSafe rejects the CORS preflight
  from every browser origin. Do not move game or scoring logic behind it.
- Store API keys and completed match results in browser localStorage.
- Run both agents against the same board seed and measure decisions in wall-clock time.
- Keep an explicit demo mode so the app is usable without keys.
- Ship English and Japanese. The switcher sits in the topbar next to Settings, the
  choice persists in localStorage, and an unset choice falls back to the browser
  language. All UI copy lives in `src/i18n.js`; both dictionaries must stay at parity.
- The result strip carries no demo/live data badge.
- Demo mode says so plainly. A persistent, non-dismissible callout sits between
  the race controls and the arena whenever both keys are missing, states that the
  scores and latencies are scripted rather than measured, and offers a button
  that opens Settings. It replaces the old transient "demo mode is running"
  notice, so the two never say the same thing at once.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. `worker/index.js` holds the only copy of the relay; `api/jev.js` re-exports it so Vercel and Sites cannot drift apart. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
