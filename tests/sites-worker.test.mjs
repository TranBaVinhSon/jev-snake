import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/index.html"]);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  }
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});

const assets404 = { ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } };

function stubTypeSafe(t, respond) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, init });
    return respond();
  });
  return calls;
}

test("relays /api/jev to TypeSafe with the caller's key and no browser Origin", async (t) => {
  const calls = stubTypeSafe(
    t,
    () =>
      new Response('{"answers":{}}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );

  const response = await worker.fetch(
    new Request("https://example.test/api/jev", {
      method: "POST",
      headers: {
        authorization: "Bearer caller-key",
        origin: "https://example.test",
        "content-type": "application/json",
      },
      body: '{"model":"jev-latest"}',
    }),
    assets404,
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"answers":{}}');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.typesafe.ai/v1/systemone");
  assert.equal(calls[0].init.headers.authorization, "Bearer caller-key");
  assert.equal(calls[0].init.headers.origin, undefined, "no browser Origin reaches TypeSafe");
  assert.equal(calls[0].init.body, '{"model":"jev-latest"}');
});

test("passes a TypeSafe error status and body straight back to the browser", async (t) => {
  const body = '{"detail":{"error_type":"authentication_error","message":"Cannot authenticate"}}';
  stubTypeSafe(
    t,
    () => new Response(body, { status: 401, headers: { "content-type": "application/json" } }),
  );

  const response = await worker.fetch(
    new Request("https://example.test/api/jev", {
      method: "POST",
      headers: { authorization: "Bearer bad-key" },
      body: "{}",
    }),
    assets404,
  );

  assert.equal(response.status, 401);
  assert.equal(await response.text(), body);
});

test("refuses a /api/jev call that carries no key", async (t) => {
  const calls = stubTypeSafe(t, () => new Response("{}", { status: 200 }));

  const response = await worker.fetch(
    new Request("https://example.test/api/jev", { method: "POST", body: "{}" }),
    assets404,
  );

  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test("refuses a non-POST /api/jev call", async (t) => {
  stubTypeSafe(t, () => new Response("{}", { status: 200 }));

  const response = await worker.fetch(
    new Request("https://example.test/api/jev", { headers: { accept: "text/html" } }),
    assets404,
  );

  assert.equal(response.status, 405);
});
