'use strict';

// Snake game rules: pure functions, no I/O.
// Works both in Node (require) and in the browser (window.SnakeGame).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SnakeGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  function createGame(width = 20, height = 12, rng = Math.random) {
    const start = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    const state = {
      width,
      height,
      snake: [start, { x: start.x - 1, y: start.y }, { x: start.x - 2, y: start.y }],
      dir: 'right',
      nextDir: 'right',
      food: null,
      score: 0,
      over: false,
      won: false,
    };
    state.food = placeFood(state, rng);
    return state;
  }

  function placeFood(state, rng = Math.random) {
    const taken = new Set(state.snake.map((p) => `${p.x},${p.y}`));
    const free = [];
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (!taken.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    return free.length ? free[Math.floor(rng() * free.length)] : null;
  }

  // Queue a direction change. Reversing straight into yourself is ignored.
  function turn(state, dir) {
    const a = DIRS[dir];
    const b = DIRS[state.dir];
    if (!a || (a.x === -b.x && a.y === -b.y)) return;
    state.nextDir = dir;
  }

  // Advance the game by one tick.
  function step(state, rng = Math.random) {
    if (state.over) return state;

    state.dir = state.nextDir;
    const d = DIRS[state.dir];
    const head = { x: state.snake[0].x + d.x, y: state.snake[0].y + d.y };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= state.width || head.y >= state.height;
    const ate = state.food && head.x === state.food.x && head.y === state.food.y;

    // The tail moves out of the way unless we're growing, so it's not a collision.
    const body = ate ? state.snake : state.snake.slice(0, -1);
    const hitSelf = body.some((p) => p.x === head.x && p.y === head.y);

    if (hitWall || hitSelf) {
      state.over = true;
      return state;
    }

    state.snake.unshift(head);
    if (ate) {
      state.score++;
      state.food = placeFood(state, rng);
      if (!state.food) {
        state.over = true;
        state.won = true;
      }
    } else {
      state.snake.pop();
    }
    return state;
  }

  // Milliseconds per tick: starts slow, speeds up as you score.
  function tickDelay(score) {
    return Math.max(60, 150 - score * 4);
  }

  return { DIRS, createGame, placeFood, turn, step, tickDelay };
});
