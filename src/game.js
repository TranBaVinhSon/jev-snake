export const BOARD_SIZE = 18;

export const DIRECTIONS = Object.freeze({
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
});

const DIRECTION_NAMES = Object.freeze(Object.keys(DIRECTIONS));

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function positionKey(position) {
  return `${position.x}:${position.y}`;
}

function seededUnit(seed, index, salt) {
  let value = (seed + index * 374761393 + salt * 668265263) >>> 0;
  value = (value ^ (value >>> 13)) * 1274126177;
  value = (value ^ (value >>> 16)) >>> 0;
  return value / 4294967296;
}

function nextFood({ seed, foodIndex, snake }) {
  const occupied = new Set(snake.map(positionKey));

  for (let attempt = 0; attempt < BOARD_SIZE * BOARD_SIZE; attempt += 1) {
    const x = Math.floor(seededUnit(seed, foodIndex, attempt * 2) * BOARD_SIZE);
    const y = Math.floor(
      seededUnit(seed, foodIndex, attempt * 2 + 1) * BOARD_SIZE,
    );
    const candidate = { x, y };

    if (!occupied.has(positionKey(candidate))) {
      return candidate;
    }
  }

  return { x: 0, y: 0 };
}

export function createGame(seed = 1209) {
  const snake = [
    { x: 7, y: 9 },
    { x: 6, y: 9 },
    { x: 5, y: 9 },
    { x: 4, y: 9 },
  ];

  return {
    seed,
    snake,
    food: nextFood({ seed, foodIndex: 0, snake }),
    foodIndex: 0,
    direction: "right",
    score: 0,
    moves: 0,
    alive: true,
  };
}

export function createPreviewGame(side) {
  const isJev = side === "jev";
  const snake = isJev
    ? [
        { x: 12, y: 10 },
        { x: 11, y: 10 },
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 7, y: 10 },
        { x: 6, y: 10 },
        { x: 5, y: 10 },
        { x: 5, y: 9 },
        { x: 5, y: 8 },
      ]
    : [
        { x: 9, y: 6 },
        { x: 9, y: 7 },
        { x: 9, y: 8 },
        { x: 9, y: 9 },
        { x: 9, y: 10 },
        { x: 10, y: 10 },
        { x: 11, y: 10 },
        { x: 12, y: 10 },
      ];

  return {
    seed: 1209,
    snake,
    food: isJev ? { x: 10, y: 3 } : { x: 3, y: 3 },
    foodIndex: isJev ? 12 : 7,
    direction: isJev ? "right" : "up",
    score: isJev ? 12 : 7,
    moves: 128,
    alive: true,
  };
}

function nextHead(game, direction) {
  const delta = DIRECTIONS[direction];
  return {
    x: game.snake[0].x + delta.x,
    y: game.snake[0].y + delta.y,
  };
}

function isInsideBoard(position) {
  return (
    position.x >= 0 &&
    position.x < BOARD_SIZE &&
    position.y >= 0 &&
    position.y < BOARD_SIZE
  );
}

function collidesWithSnake(game, head) {
  const willEat = samePosition(head, game.food);
  const body = willEat ? game.snake : game.snake.slice(0, -1);
  return body.some((segment) => samePosition(segment, head));
}

export function legalMoves(game) {
  if (!game.alive) {
    return [];
  }

  return DIRECTION_NAMES.filter((direction) => {
    const head = nextHead(game, direction);
    return isInsideBoard(head) && !collidesWithSnake(game, head);
  });
}

export function applyMove(game, requestedDirection) {
  const legal = legalMoves(game);
  if (legal.length === 0) {
    return {
      accepted: false,
      game: { ...game, alive: false },
    };
  }

  const accepted = legal.includes(requestedDirection);
  const direction = accepted
    ? requestedDirection
    : legal.includes(game.direction)
      ? game.direction
      : legal[0];
  const head = nextHead(game, direction);
  const ateFood = samePosition(head, game.food);
  const snake = ateFood
    ? [head, ...game.snake]
    : [head, ...game.snake.slice(0, -1)];
  const foodIndex = ateFood ? game.foodIndex + 1 : game.foodIndex;

  return {
    accepted,
    game: {
      ...game,
      snake,
      food: ateFood
        ? nextFood({ seed: game.seed, foodIndex, snake })
        : game.food,
      foodIndex,
      direction,
      score: game.score + (ateFood ? 1 : 0),
      moves: game.moves + 1,
    },
  };
}

function reachableArea(game, direction) {
  const start = nextHead(game, direction);
  const occupied = new Set(game.snake.slice(0, -1).map(positionKey));
  const queue = [start];
  const visited = new Set([positionKey(start)]);

  while (queue.length > 0) {
    const current = queue.shift();

    for (const delta of Object.values(DIRECTIONS)) {
      const candidate = {
        x: current.x + delta.x,
        y: current.y + delta.y,
      };
      const key = positionKey(candidate);

      if (
        isInsideBoard(candidate) &&
        !occupied.has(key) &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push(candidate);
      }
    }
  }

  return visited.size;
}

export function bestLocalMove(game) {
  const legal = legalMoves(game);
  if (legal.length === 0) {
    return game.direction;
  }

  return [...legal].sort((a, b) => {
    const headA = nextHead(game, a);
    const headB = nextHead(game, b);
    const distanceA =
      Math.abs(headA.x - game.food.x) + Math.abs(headA.y - game.food.y);
    const distanceB =
      Math.abs(headB.x - game.food.x) + Math.abs(headB.y - game.food.y);
    const scoreA = reachableArea(game, a) * 0.2 - distanceA;
    const scoreB = reachableArea(game, b) * 0.2 - distanceB;
    return scoreB - scoreA;
  })[0];
}

function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);

    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Race stopped", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function simulateDecision({ actor, game, signal }) {
  const isJev = actor === "jev";
  const unit = seededUnit(
    game.seed + (isJev ? 13 : 71),
    game.moves,
    game.score + 1,
  );
  const latency = isJev
    ? 70 + Math.round(unit * 170)
    : 560 + Math.round(unit * 760);

  await abortableDelay(latency, signal);

  const legal = legalMoves(game);
  const best = bestLocalMove(game);
  const mistakeThreshold = isJev ? 0.035 : 0.16;
  const alternatives = legal.filter((direction) => direction !== best);
  const direction =
    unit < mistakeThreshold && alternatives.length > 0
      ? alternatives[Math.floor(unit * 100) % alternatives.length]
      : best;

  return {
    direction,
    confidence: isJev ? 0.9 + unit * 0.09 : 0.72 + unit * 0.21,
    latency,
    cost: isJev ? 0.000001 : 0.00006,
    outputValid: true,
  };
}

export function serializeGame(game) {
  return {
    board: { width: BOARD_SIZE, height: BOARD_SIZE },
    snake: game.snake.map((segment, index) => ({
      ...segment,
      role: index === 0 ? "head" : "body",
    })),
    food: game.food,
    current_direction: game.direction,
    legal_moves: legalMoves(game),
    score: game.score,
    moves_survived: game.moves,
  };
}
