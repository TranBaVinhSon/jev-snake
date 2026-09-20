# SnakeBench

A head-to-head Snake benchmark that races [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
against a current frontier LLM from OpenRouter. Both agents get the same board
seed and the same wall-clock budget, so the score gap reflects how many good
decisions each model can make per second.

The game, the scoring, and both agent loops run in the browser. The one piece of
server code is a relay at `/api/jev`, because TypeSafe rejects the CORS preflight
from every browser origin. Your keys stay in this browser's `localStorage`; the
Jev key passes through the relay on each move and is never stored there.

## Run it locally

Requires Node 20 or newer.

```bash
npm install
npm run dev
```

Vite prints a local URL, normally <http://localhost:5173>. Open it and press
**Start race**.

Without API keys the app runs in **demo mode**, which simulates both agents
locally so you can see the layout and the scoring work. To run a real race, open
**Settings**, paste a Jev key and an OpenRouter key, and save. Both keys are
stored in this browser's `localStorage`, unencrypted. The OpenRouter key goes
straight to `openrouter.ai`; the Jev key travels through this app's own
`/api/jev` relay to `api.typesafe.ai`. `npm run dev` serves that path through the
Vite proxy in `vite.config.mjs`, so a local race behaves like a deployed one.

Completed match scores are also kept in `localStorage` and are listed under
Recent matches in the Settings dialog.

### Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist/`, then the Sites packaging step |
| `npm run preview` | Serve the production build |
| `npm run test:sites` | Check the Sites worker and its build artifacts |

## Language

The topbar switcher toggles the interface between English and Japanese. On a
first visit the app follows the browser's language; after that it remembers the
choice in `localStorage`. All UI copy lives in `src/i18n.js` as two flat
dictionaries — add a key to `en` and the matching key to `ja`, and English
backstops anything a translation is missing.

## Picking an opponent

The model dropdown pins the current frontier model from each major lab under
**Latest models**, and lists the rest of the OpenRouter catalog below. The
shortlist lives in `FRONTIER_MODELS` in `src/api.js`. Pricing there is a
fallback; whenever the live OpenRouter catalog loads, its prices win.

A live race costs real money. Each move is one chat completion, and the race is
capped at 40 seconds of wall clock, so a reasoning model answering in about a
second will run at most roughly 40 of them.

## The Jev relay

`api.typesafe.ai` answers the CORS preflight with `400 Disallowed CORS origin`
for every browser origin, so the page cannot call it directly. Requests go to
`/api/jev` instead, which forwards them server-side where no preflight applies.

One implementation covers every target. `worker/index.js` exports `relayJev`,
`api/jev.js` re-exports it as a Vercel edge function, and `vite.config.mjs`
proxies the same path in development. The relay pins the upstream URL, forwards
only `authorization` and `content-type`, and holds no key of its own.
