// api.typesafe.ai answers its CORS preflight with 400 "Disallowed CORS origin"
// for every browser origin, so the app calls this same-origin relay instead.
// The endpoint is pinned and only two headers cross over, so nobody can point
// the relay at another host. The caller still supplies their own key; this
// server never holds one.
const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MAX_BODY_BYTES = 64 * 1024;

function problem(status, message) {
  return new Response(JSON.stringify({ detail: { message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function relayJev(request) {
  if (request.method !== "POST") {
    return problem(405, "The Jev relay accepts POST only.");
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return problem(401, "Missing Authorization header. Add your Jev key in Settings.");
  }

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return problem(413, "Request body is too large for the Jev relay.");
  }

  let upstream;
  try {
    upstream = await fetch(JEV_ENDPOINT, {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body,
    });
  } catch {
    return problem(502, "The relay could not reach TypeSafe.");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === "/api/jev") {
      return relayJev(request);
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
