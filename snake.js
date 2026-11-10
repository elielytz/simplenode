#!/usr/bin/env node
'use strict';

const { createGame, placeFood, turn, step, tickDelay } = require('./game');

// ---------- Rendering ----------

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  red: '\x1b[91m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function render(state) {
  const snakeIdx = new Map(state.snake.map((p, i) => [`${p.x},${p.y}`, i]));
  const lines = [];
  lines.push(`${C.bold}SNAKE${C.reset}  Score: ${state.score}`);
  lines.push('┌' + '──'.repeat(state.width) + '┐');
  for (let y = 0; y < state.height; y++) {
    let row = '│';
    for (let x = 0; x < state.width; x++) {
      const i = snakeIdx.get(`${x},${y}`);
      if (i === 0) row += `${C.brightGreen}██${C.reset}`;
      else if (i !== undefined) row += `${C.green}██${C.reset}`;
      else if (state.food && state.food.x === x && state.food.y === y) row += `${C.red}● ${C.reset}`;
      else row += '  ';
    }
    lines.push(row + '│');
  }
  lines.push('└' + '──'.repeat(state.width) + '┘');
  if (state.over) {
    lines.push(state.won ? `${C.bold}You filled the board — you win!${C.reset}` : `${C.bold}Game over!${C.reset}`);
    lines.push(`${C.dim}r = play again   q = quit${C.reset}`);
  } else {
    lines.push(`${C.dim}arrows / WASD = move   q = quit${C.reset}`);
  }
  return lines.join('\n');
}

// ---------- Terminal game loop ----------

function main() {
  if (!process.stdin.isTTY) {
    console.error('Snake needs an interactive terminal. Run it with: node snake.js');
    process.exit(1);
  }

  const readline = require('node:readline');
  const out = process.stdout;
  let state = createGame();
  let timer = null;

  const draw = () => out.write('\x1b[H' + render(state).replace(/\n/g, '\x1b[K\n') + '\x1b[K\x1b[J');

  const tick = () => {
    step(state);
    draw();
    timer = state.over ? null : setTimeout(tick, tickDelay(state.score));
  };

  const quit = () => {
    clearTimeout(timer);
    out.write('\x1b[?25h\x1b[?1049l'); // show cursor, leave alt screen
    process.stdin.setRawMode(false);
    process.exit(0);
  };

  const KEYS = { up: 'up', down: 'down', left: 'left', right: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', (_, key) => {
    if (!key) return;
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) return quit();
    if (key.name === 'r' && state.over) {
      state = createGame();
      return tick();
    }
    if (KEYS[key.name]) turn(state, KEYS[key.name]);
  });

  out.write('\x1b[?1049h\x1b[?25l\x1b[2J'); // alt screen, hide cursor, clear
  draw();
  timer = setTimeout(tick, tickDelay(0));
}

if (require.main === module) main();

module.exports = { createGame, placeFood, turn, step, tickDelay, render };
