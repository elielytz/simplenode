'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer, resolveFile } = require('./server');

function listen() {
  return new Promise((resolve) => {
    const server = createServer().listen(0, '127.0.0.1', () => resolve(server));
  });
}

// Raw request so the path isn't normalised by fetch/URL before it reaches the server.
function rawGet(port, rawPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: rawPath, method }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves the page, scripts, and shared game logic with the right types', async () => {
  const server = await listen();
  const { port } = server.address();
  try {
    const page = await rawGet(port, '/');
    assert.equal(page.status, 200);
    assert.match(page.headers['content-type'], /text\/html/);
    assert.match(page.body, /id="app"/);
    assert.match(page.body, /src="\/vendor\/vue\.js"/);

    for (const url of ['/main.js', '/game.js', '/vendor/vue.js']) {
      const res = await rawGet(port, url);
      assert.equal(res.status, 200, url);
      assert.match(res.headers['content-type'], /text\/javascript/, url);
    }
  } finally {
    server.close();
  }
});

test('unknown paths are 404 and non-GET methods are 405', async () => {
  const server = await listen();
  const { port } = server.address();
  try {
    assert.equal((await rawGet(port, '/nope.txt')).status, 404);
    assert.equal((await rawGet(port, '/', 'POST')).status, 405);
  } finally {
    server.close();
  }
});

test('path traversal cannot read files outside public/', async () => {
  const server = await listen();
  const { port } = server.address();
  try {
    for (const evil of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/%2e%2e%2fserver.js', '/a%00b']) {
      const res = await rawGet(port, evil);
      assert.ok([400, 404].includes(res.status), `${evil} -> ${res.status}`);
      assert.doesNotMatch(res.body, /"name": "simplenode"|createServer/, evil);
    }
  } finally {
    server.close();
  }
  assert.equal(resolveFile('/../package.json'), null);
});
