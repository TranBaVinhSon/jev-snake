import { legalMoves, serializeGame } from "./game.js";

// TypeSafe rejects the CORS preflight from every browser origin, so Jev calls go
// through this app's own relay. See worker/index.js and api/jev.js.
const JEV_RELAY_PATH = "/api/jev";

// The current frontier model from each major lab, pinned to the top of the picker.
// Prices are per token and match the OpenRouter catalog on 2026-09-20; the live
// catalog overrides them whenever it loads.
export const FRONTIER_MODELS = Object.freeze([
  {
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    pricing: { prompt: 0.000002, completion: 0.00001 },
  },
  {
    id: "anthropic/claude-opus-5",
    name: "Claude Opus 5",
    pricing: { prompt: 0.000005, completion: 0.000025 },
  },
  {
    id: "openai/gpt-6-astra",
    name: "GPT-6 Astra",
    pricing: { prompt: 0.00001, completion: 0.00005 },
  },
  {
    id: "openai/gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    pricing: { prompt: 0.000002, completion: 0.00001 },
  },
  {
    id: "google/gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    pricing: { prompt: 0.00000075, completion: 0.00000375 },
  },
  {
    id: "x-ai/grok-4.6",
    name: "Grok 4.6",
    pricing: { prompt: 0.000002, completion: 0.000006 },
  },
  {
    id: "deepseek/deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash",
    pricing: { prompt: 0.00000015, completion: 0.0000006 },
  },
  {
    id: "moonshotai/kimi-k3",
    name: "Kimi K3",
    pricing: { prompt: 0.0000017, completion: 0.0000085 },
  },
]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Messages the app writes itself carry a code so the UI can show them in the
// reader's language. Messages relayed from an API keep whatever wording it sent.
function localizableError(code, fallbackMessage) {
  const error = new Error(fallbackMessage);
  error.code = code;
  return error;
}

function numberFrom(value, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function errorMessage(response) {
  try {
    const payload = await response.json();
    if (isRecord(payload.error) && typeof payload.error.message === "string") {
      return payload.error.message;
    }
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (isRecord(payload.detail) && typeof payload.detail.message === "string") {
      return payload.detail.message;
    }
  } catch {
    // The status text below remains useful when an API returns a non-JSON error.
  }

  return response.statusText || `Request failed with status ${response.status}`;
}

function parseDirection(value) {
  if (typeof value !== "string") {
    return null;
  }

  // Reasoning models weigh the options out loud, so the verdict is the last one named.
  const matches = value.toLowerCase().match(/\b(up|right|down|left)\b/g);
  return matches ? matches[matches.length - 1] : null;
}

export async function fetchOpenRouterModels(signal) {
  const response = await fetch("https://openrouter.ai/api/v1/models", { signal });
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  const payload = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw localizableError(
      "model-list-unexpected",
      "OpenRouter returned an unexpected model list.",
    );
  }

  const models = payload.data
    .filter((item) => {
      if (!isRecord(item) || typeof item.id !== "string") {
        return false;
      }
      const architecture = item.architecture;
      return (
        !isRecord(architecture) ||
        !Array.isArray(architecture.output_modalities) ||
        architecture.output_modalities.includes("text")
      );
    })
    .map((item) => ({
      id: item.id,
      name: typeof item.name === "string" ? item.name : item.id,
      pricing: {
        prompt: numberFrom(item.pricing?.prompt),
        completion: numberFrom(item.pricing?.completion),
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return models.length > 0 ? models : [...FRONTIER_MODELS];
}

export async function requestJevDecision({ apiKey, game, signal }) {
  const legal = legalMoves(game);
  const criteria = Object.fromEntries(
    legal.map((direction) => [direction, `Move ${direction} by one cell`]),
  );
  const startedAt = performance.now();
  let response;

  try {
    response = await fetch(JEV_RELAY_PATH, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "jev-latest",
        state: serializeGame(game),
        questions: {
          next_move: {
            type: "choice",
            instructions:
              "Choose the next legal move that reaches food while avoiding walls and the snake body.",
            criteria,
          },
        },
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw localizableError(
      "jev-relay-unreachable",
      "Could not reach the Jev relay. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  const payload = await response.json();
  const answer = payload?.answers?.next_move;
  const direction = parseDirection(answer?.choice);
  const inputTokens = numberFrom(payload?.usage?.input_tokens);

  return {
    direction,
    confidence: numberFrom(answer?.confidence),
    latency: performance.now() - startedAt,
    cost: (inputTokens * 0.042) / 1_000_000,
    outputValid: direction !== null && legal.includes(direction),
  };
}

export async function requestOpenRouterDecision({
  apiKey,
  game,
  model,
  pricing,
  signal,
}) {
  const legal = legalMoves(game);
  const startedAt = performance.now();
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-OpenRouter-Title": "SnakeBench",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        // Frontier models spend reasoning tokens against this budget before they
        // emit any content, and a tight cap returns an empty completion.
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content:
              "You control a Snake game. Reply with exactly one legal direction: up, right, down, or left. Do not explain.",
          },
          {
            role: "user",
            content: JSON.stringify(serializeGame(game)),
          },
        ],
      }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const direction = parseDirection(content);
  const promptTokens = numberFrom(payload?.usage?.prompt_tokens);
  const completionTokens = numberFrom(payload?.usage?.completion_tokens);
  const reportedCost = numberFrom(payload?.usage?.cost, Number.NaN);
  const calculatedCost =
    promptTokens * pricing.prompt + completionTokens * pricing.completion;

  return {
    direction,
    confidence: 0,
    latency: performance.now() - startedAt,
    cost: Number.isFinite(reportedCost) ? reportedCost : calculatedCost,
    outputValid: direction !== null && legal.includes(direction),
  };
}
