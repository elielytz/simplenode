'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame, turn, step, placeFood, tickDelay, render } = require('./snake');

const fixedRng = () => 0; // always picks the first free cell

test('snake moves one cell right per tick and keeps its length', () => {
  const g = createGame(10, 10, fixedRng);
  const { x, y } = g.snake[0];
  step(g, fixedRng);
  assert.deepEqual(g.snake[0], { x: x + 1, y });
  assert.equal(g.snake.length, 3);
});

test('reversing directly into yourself is ignored', () => {
  const g = createGame(10, 10, fixedRng);
  turn(g, 'left');
  step(g, fixedRng);
  assert.equal(g.dir, 'right');
  assert.equal(g.over, false);
});

test('two quick turns cannot sneak in a 180', () => {
  const g = createGame(10, 10, fixedRng);
  turn(g, 'up');
  turn(g, 'left'); // would be a reversal of the *current* heading only after 'up' applied; still blocked
  step(g, fixedRng);
  assert.notEqual(g.dir, 'left');
});

test('eating food grows the snake and scores a point', () => {
  const g = createGame(10, 10, fixedRng);
  g.food = { x: g.snake[0].x + 1, y: g.snake[0].y };
  step(g, fixedRng);
  assert.equal(g.score, 1);
  assert.equal(g.snake.length, 4);
  assert.notDeepEqual(g.food, g.snake[0]);
});

test('hitting a wall ends the game', () => {
  const g = createGame(5, 5, fixedRng);
  for (let i = 0; i < 10 && !g.over; i++) step(g, fixedRng);
  assert.equal(g.over, true);
});

test('running into yourself ends the game', () => {
  const g = createGame(10, 10, fixedRng);
  g.snake = [
    { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 },
  ];
  g.dir = g.nextDir = 'down'; // head moves into (5,6), which is body
  g.food = { x: 0, y: 0 };
  step(g, fixedRng);
  assert.equal(g.over, true);
});

test('moving into the cell the tail just left is allowed', () => {
  const g = createGame(10, 10, fixedRng);
  g.snake = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }]; // 2x2 loop
  g.dir = g.nextDir = 'right'; // head -> (2,1), where the tail is
  g.food = { x: 9, y: 9 };
  step(g, fixedRng);
  assert.equal(g.over, false);
});

test('food never spawns on the snake', () => {
  const g = createGame(4, 4, Math.random);
  for (let i = 0; i < 200; i++) {
    const f = placeFood(g, Math.random);
    assert.ok(!g.snake.some((p) => p.x === f.x && p.y === f.y));
  }
});

test('filling the board wins', () => {
  const g = createGame(3, 1, fixedRng);
  g.snake = [{ x: 1, y: 0 }, { x: 0, y: 0 }];
  g.dir = g.nextDir = 'right';
  g.food = { x: 2, y: 0 };
  step(g, fixedRng);
  assert.equal(g.over, true);
  assert.equal(g.won, true);
});

test('game speeds up with score but has a floor', () => {
  assert.ok(tickDelay(10) < tickDelay(0));
  assert.equal(tickDelay(1000), 60);
});

test('render draws a board of the right size', () => {
  const g = createGame(8, 6, fixedRng);
  const lines = render(g).split('\n');
  assert.ok(lines[0].includes('Score: 0'));
  assert.equal(lines.filter((l) => l.startsWith('│')).length, 6);
});
