(() => {
  'use strict';

  const { createApp, ref, computed, watch, onMounted, onBeforeUnmount } = window.Vue;
  const { DIRS, createGame, turn, step, tickDelay } = window.SnakeGame;

  const COLS = 20;
  const ROWS = 20;
  const SWIPE_DISTANCE = 24; // px of finger/mouse travel that counts as a swipe

  const KEY_DIRS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };

  function loadBest() {
    try {
      return Number(localStorage.getItem('snake-best')) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem('snake-best', String(value));
    } catch {
      /* storage unavailable (private mode, etc.) — the best score just won't persist */
    }
  }

  createApp({
    template: '#app-template',

    setup() {
      // ---------- State ----------
      // The game functions mutate `state.value` in place; Vue tracks those changes.
      const state = ref(createGame(COLS, ROWS));
      const phase = ref('ready'); // ready | playing | paused | over
      const best = ref(loadBest());
      let timer = null;

      watch(best, saveBest);

      // ---------- What the template shows ----------
      const score = computed(() => state.value.score);

      const overlay = computed(() => {
        switch (phase.value) {
          case 'ready':
            return { title: 'Snake', hint: 'Press an arrow key, Space, or tap to start' };
          case 'paused':
            return { title: 'Paused', hint: 'Press Space or tap to resume' };
          case 'over':
            return {
              title: state.value.won ? 'You win!' : 'Game over',
              hint: `Score ${state.value.score} — press Space, Enter or tap to play again`,
            };
          default:
            return null; // playing: no overlay
        }
      });

      // Tail first, so the head is painted last (on top). Fades slightly toward the tail.
      const segments = computed(() => {
        const snake = state.value.snake;
        return snake
          .map((p, i) => ({
            i,
            x: p.x,
            y: p.y,
            fill: i === 0 ? '#7cfc9a' : `hsl(140, 60%, ${52 - (22 * i) / snake.length}%)`,
          }))
          .reverse();
      });

      // Two eyes on the head, looking in the direction of travel.
      const eyes = computed(() => {
        const head = state.value.snake[0];
        const d = DIRS[state.value.dir];
        const cx = head.x + 0.5 + d.x * 0.2;
        const cy = head.y + 0.5 + d.y * 0.2;
        return [-1, 1].map((side) => ({ x: cx - d.y * side * 0.2, y: cy + d.x * side * 0.2 }));
      });

      // ---------- Game flow ----------
      function schedule() {
        timer = setTimeout(tick, tickDelay(state.value.score));
      }

      function tick() {
        step(state.value);
        if (state.value.score > best.value) best.value = state.value.score;
        if (state.value.over) phase.value = 'over';
        else schedule();
      }

      function start() {
        clearTimeout(timer);
        state.value = createGame(COLS, ROWS);
        phase.value = 'playing';
        schedule();
      }

      function togglePause() {
        if (phase.value === 'playing') {
          clearTimeout(timer);
          phase.value = 'paused';
        } else if (phase.value === 'paused') {
          phase.value = 'playing';
          schedule();
        }
      }

      // The "primary action": start, resume, or restart depending on where we are.
      function primaryAction() {
        if (phase.value === 'ready' || phase.value === 'over') start();
        else togglePause();
      }

      function steer(dir) {
        if (phase.value === 'ready') start();
        if (phase.value === 'playing') turn(state.value, dir);
      }

      // ---------- Keyboard ----------
      function onKeydown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const dir = KEY_DIRS[e.key];
        if (dir) {
          e.preventDefault(); // stop arrow keys scrolling the page
          steer(dir);
        } else if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          if (!e.repeat) primaryAction();
        } else if (e.key === 'Enter' && phase.value === 'over') {
          start();
        } else if ((e.key === 'p' || e.key === 'P') && !e.repeat) {
          togglePause();
        }
      }

      // Don't let the snake run while nobody's watching.
      function onVisibility() {
        if (document.hidden && phase.value === 'playing') togglePause();
      }

      onMounted(() => {
        window.addEventListener('keydown', onKeydown);
        document.addEventListener('visibilitychange', onVisibility);
      });
      onBeforeUnmount(() => {
        window.removeEventListener('keydown', onKeydown);
        document.removeEventListener('visibilitychange', onVisibility);
        clearTimeout(timer);
      });

      // ---------- Touch / mouse: swipe to steer, tap to start / pause / restart ----------
      let pointer = null;

      function onPointerDown(e) {
        pointer = { x: e.clientX, y: e.clientY, swiped: false };
      }

      function onPointerMove(e) {
        if (!pointer) return;
        const dx = e.clientX - pointer.x;
        const dy = e.clientY - pointer.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DISTANCE) return;
        steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        pointer = { x: e.clientX, y: e.clientY, swiped: true };
      }

      function onPointerUp() {
        if (pointer && !pointer.swiped) primaryAction(); // a tap, not a swipe
        pointer = null;
      }

      function onPointerCancel() {
        pointer = null;
      }

      return {
        cols: COLS,
        rows: ROWS,
        state,
        score,
        best,
        overlay,
        segments,
        eyes,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
      };
    },
  }).mount('#app');
})();
